/**
 * Watch mode: what `--watch` turns on.
 *
 * Builds once, then builds the jobs of a brand and an app again when a file of theirs under
 * `source/` changes. A job is built whole, into a folder that is removed first, so the
 * output of a job is at any time what a build of it writes. Node.js modules only.
 *
 * @module watch
 */

import fs from 'fs'
import path from 'path'
import { generateAssets, loadConfig, planJobs, shouldIgnoreFile } from './build-assets.js'
import { createFileFilter } from './filters.js'
import { resolveRoot } from './root.js'

/** @import { BuildConfig, BuildOptions, BuildStats, Job } from './types.js' */

/** How long the watcher waits after a change for the next one, in milliseconds. */
const SETTLE = 150

/**
 * The jobs a changed path of `source/` belongs to: those of its app, for its brand, or for
 * every brand when it is a file of the default brand, which every brand gets.
 * @param {BuildConfig} config
 * @param {Job[]} jobs - The jobs of the run
 * @param {string} relative - The path of the change, relative to `source/`, with forward
 *   slashes. An empty path stands for a change the system did not name
 * @returns {Job[]}
 * @example
 * affectedJobs(config, jobs, 'default/docs/images/logo.svg') // The docs jobs of every brand
 * affectedJobs(config, jobs, 'acme/docs/images/logo.svg') // The docs jobs of acme
 */
export function affectedJobs(config, jobs, relative) {
  const [brand, app] = relative.split('/')
  return jobs.filter(
    (job) =>
      (!brand || brand === config.brandFolder || brand === job.brand) && (!app || app === job.app)
  )
}

/**
 * Whether a change of `source/` is one the build reads: not a file of the ignore list, and
 * not a file that the filters of the run leave out.
 * @param {string} relative - The path of the change, relative to `source/`
 * @param {ReturnType<typeof createFileFilter>} filter - The file filters of the run
 * @returns {boolean}
 */
export function isRelevant(relative, filter) {
  const parts = relative.split('/')
  if (parts.some((part) => part !== '' && shouldIgnoreFile(part))) return false
  // A type folder the filters leave out, or a file of a type folder they leave out. A
  // folder is taken as it is: what changed below it is not known
  if (parts.length > 2 && !filter.type(parts[2])) return false
  if (parts.length > 3 && path.extname(relative) !== '' && !filter.file(parts.slice(2).join('/'))) {
    return false
  }
  return true
}

/**
 * The events of a watch, for the caller to print or to wait for.
 * @typedef {Object} WatchEvents
 * @property {(stats: BuildStats) => void} [onReady] - After the first build
 * @property {(changed: string[], jobs: Job[]) => void} [onChange] - Before a build: the
 *   changed paths, relative to `source/`, and the jobs that are built again
 * @property {(stats: BuildStats, jobs: Job[]) => void} [onBuild] - After a build
 * @property {(error: Error, jobs: Job[]) => void} [onError] - After a build that failed. The
 *   watch goes on
 */

/**
 * Build, then build again on every change under `source/`.
 * @param {BuildOptions} [options] - The options of `generateAssets()`. The jobs they select
 *   are the jobs that are watched
 * @param {WatchEvents} [events]
 * @returns {Promise<{ close: () => Promise<void> }>} After the first build. `close()` stops
 *   the watch, after a build that is running
 * @throws {Error} When the first build fails, or with `dryRun`
 */
export async function watchAssets(options = {}, events = {}) {
  if (options.dryRun) throw new Error('--watch writes the output: it does not go with --dry-run')

  const cwd = resolveRoot(options.cwd)
  const source = path.join(cwd, 'source')
  const config = loadConfig(cwd)
  const jobs = planJobs(config, options)
  const filter = createFileFilter(options)

  // Before the first build, so that a change made while it runs is seen
  const startedAt = Date.now()
  const first = await generateAssets({ ...options, cwd })
  events.onReady?.(first)

  /** @type {Set<string>} */
  const pending = new Set()
  /** @type {NodeJS.Timeout|undefined} */
  let timer
  let running = Promise.resolve()
  let closed = false

  const rebuild = async () => {
    // The changes of the jobs of the run: a file of another app or brand is none
    const changed = [...pending]
      .filter((relative) => affectedJobs(config, jobs, relative).length > 0)
      .sort()
    pending.clear()
    const affected = jobs.filter((job) =>
      changed.some((relative) => affectedJobs(config, [job], relative).length > 0)
    )
    if (affected.length === 0) return
    events.onChange?.(changed, affected)

    // One build per app, of the brands that changed in it. The folders of the jobs are
    // removed first, so a file that is gone from the source is gone from the output
    for (const app of new Set(affected.map((job) => job.app))) {
      const built = affected.filter((job) => job.app === app)
      try {
        const stats = await generateAssets({
          ...options,
          cwd,
          quiet: true,
          brands: [...new Set(built.map((job) => job.brand))],
          apps: [app],
          clean: true
        })
        events.onBuild?.(stats, built)
      } catch (error) {
        events.onError?.(/** @type {Error} */ (error), built)
      }
    }
  }

  const watcher = fs.watch(source, { recursive: true }, (_event, fileName) => {
    const relative = fileName ? fileName.split(path.sep).join('/') : ''
    if (closed || !isRelevant(relative, filter)) return
    // The system may report what happened shortly before the watch began, such as the
    // checkout that made the files. A file that is gone has no time, and counts
    const stat = fs.statSync(path.join(source, relative), { throwIfNoEntry: false })
    if (stat && Math.max(stat.mtimeMs, stat.ctimeMs) < startedAt) return
    pending.add(relative)
    // Wait for the changes to settle: a design tool exports many files at once
    clearTimeout(timer)
    timer = setTimeout(() => {
      running = running.then(rebuild)
    }, SETTLE)
  })

  return {
    async close() {
      closed = true
      clearTimeout(timer)
      watcher.close()
      await running
    }
  }
}

/**
 * The names of jobs, for a line of output.
 * @param {Job[]} jobs
 * @returns {string}
 */
const names = (jobs) => jobs.map((job) => `${job.platform}/${job.app}/${job.brand}`).join(', ')

/**
 * The command line of the watch: `pnpm assets --watch`. Runs until it is stopped.
 * @param {BuildOptions} options - The options of the command line
 */
export async function watchCli(options) {
  let started = Date.now()
  await watchAssets(options, {
    onReady: () => console.log('\n👀 Watching source/ for changes. Stop with Ctrl+C.'),
    onChange: (changed, jobs) => {
      started = Date.now()
      const more = changed.length > 1 ? ` and ${changed.length - 1} more` : ''
      console.log(`\n🔄 Changed: ${changed[0] || 'source/'}${more}`)
      console.log(`   Building ${names(jobs)}`)
    },
    onBuild: (stats, jobs) => {
      console.log(
        `✅ Built ${names(jobs)}: ${stats.filesProcessed} files in ${((Date.now() - started) / 1000).toFixed(1)} s`
      )
      stats.warnings.forEach((warning) => console.log(`   ⚠️  ${warning}`))
    },
    onError: (error) => console.error(`💥 Build failed: ${error.message}`)
  })
}
