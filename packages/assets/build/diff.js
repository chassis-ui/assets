/**
 * Chassis Assets Diff
 *
 * Compares an existing build with the manifest of an earlier one, and reports by job the files
 * added, removed, renamed and changed, in Markdown, for the changelog entry of the next
 * version. `dist/` is not committed, so the base is the manifest attached to a GitHub release,
 * not a git ref. A removed and an added file of the same content in a job are a rename. Removed
 * and renamed files are breaking: consumers read the names of `dist/`. Compare the same kind of
 * build: an output of `build` differs from one of `build:release` in every converted file.
 *
 * `diffManifests(base, head)` is pure; `formatDiff(diff)` writes the report; the command-line
 * entry at the bottom prints it, and exits 0 with or without differences.
 *
 * @module diff
 */

import fs from 'fs'
import { buildManifest } from './manifest.js'
import { isEntry } from './root.js'

/**
 * @typedef {object} JobDiff
 * @property {string} job - `<platform>/<app>/<brand>`
 * @property {string[]} added
 * @property {string[]} removed
 * @property {Array<{ from: string, to: string }>} renamed
 * @property {string[]} changed
 */

/**
 * The differences between two manifests, by job, without the jobs that have none. A job of one
 * manifest only is a job whose files are all added or all removed.
 * @param {import('./manifest.js').Manifest} base
 * @param {import('./manifest.js').Manifest} head
 * @returns {JobDiff[]} Sorted by job
 */
export function diffManifests(base, head) {
  const jobs = [...new Set([...Object.keys(base.jobs), ...Object.keys(head.jobs)])].sort()
  /** @type {JobDiff[]} */
  const result = []
  for (const job of jobs) {
    const before = base.jobs[job] ?? {}
    const after = head.jobs[job] ?? {}
    let added = Object.keys(after).filter((name) => !Object.hasOwn(before, name))
    const removed = Object.keys(before).filter((name) => !Object.hasOwn(after, name))
    const changed = Object.keys(after).filter(
      (name) => Object.hasOwn(before, name) && before[name].sha256 !== after[name].sha256
    )

    /** @type {JobDiff['renamed']} */
    const renamed = []
    const stillRemoved = removed.filter((from) => {
      const to = added.find((name) => after[name].sha256 === before[from].sha256)
      if (to === undefined) return true
      renamed.push({ from, to })
      added = added.filter((name) => name !== to)
      return false
    })

    if (added.length + stillRemoved.length + renamed.length + changed.length > 0) {
      result.push({ job, added, removed: stillRemoved, renamed, changed })
    }
  }
  return result
}

/**
 * The report of a comparison, in Markdown.
 * @param {JobDiff[]} diff
 * @param {import('./manifest.js').Manifest} base
 * @param {import('./manifest.js').Manifest} head
 * @returns {string}
 */
export function formatDiff(diff, base, head) {
  const lines = [`# Files of ${head.name}, ${base.version} to ${head.version}`, '']
  if (diff.length === 0) return `${lines[0]}\n\nNo file differs.\n`

  /** @param {string} title @param {string[]} items */
  const section = (title, items) =>
    items.length === 0 ? [] : [`**${title}** (${items.length})`, '', ...items, '']
  for (const { job, added, removed, renamed, changed } of diff) {
    lines.push(
      `## ${job}`,
      '',
      ...section(
        'Removed, breaking',
        removed.map((name) => `- \`${name}\``)
      ),
      ...section(
        'Renamed, breaking',
        renamed.map(({ from, to }) => `- \`${from}\` to \`${to}\``)
      ),
      ...section(
        'Added',
        added.map((name) => `- \`${name}\``)
      ),
      ...section(
        'Changed',
        changed.map((name) => `- \`${name}\``)
      )
    )
  }
  return `${lines.join('\n').trimEnd()}\n`
}

const HELP = `Usage: chassis-assets diff --base <manifest> [options]

Reports, by platform, app and brand, the files added, removed, renamed and changed in an
existing output since the manifest of an earlier build, in Markdown. Download the manifest of a
release with: gh release download <tag> --pattern '*-manifest-*'. Compare the same kind of
build, as a release has the conversions of build:release.

Options:
  --base <file>   The manifest to compare against
  --out <dir>     Output folder to read, default dist
  --cwd <dir>     Repository root, default the nearest folder upward whose package.json has
                  a \`chassis\` block
  --help, -h      Print this help
`

/**
 * The command line of the comparison: `chassis-assets diff`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  /** @type {{ base?: string, out?: string, cwd?: string }} */
  const options = {}
  for (let i = 0; i < argv.length; i++) {
    if (['--base', '--out', '--cwd'].includes(argv[i]) && argv[i + 1] !== undefined) {
      options[argv[i].slice(2)] = argv[++i]
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    }
  }
  if (!options.base) {
    console.error('❌ --base <file> names the manifest to compare against.')
    process.exit(2)
  }
  try {
    const base = JSON.parse(fs.readFileSync(options.base, 'utf-8'))
    if (!base || typeof base.jobs !== 'object' || base.jobs === null) {
      throw new Error(`${options.base} is no manifest: it has no jobs`)
    }
    const head = buildManifest(options)
    process.stdout.write(formatDiff(diffManifests(base, head), base, head))
  } catch (error) {
    console.error(`💥 Diff failed: ${error.message}`)
    process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
