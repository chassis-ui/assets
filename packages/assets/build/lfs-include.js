/**
 * The Git LFS files of a build: `pnpm assets:lfs`.
 *
 * Prints the paths of `source/` that a build with the same filters reads, as the value of
 * `git lfs pull --include`. A checkout made without Git LFS then fetches the files of its
 * build and no other. It reads the file tree only, so it runs on pointer files.
 *
 * @module lfs-include
 */

import fs from 'fs'
import path from 'path'
import {
  listSourceFiles,
  loadConfig,
  parseArgs,
  planJobs,
  shouldIgnoreFile
} from './build-assets.js'
import { coverPaths, createFileFilter } from './filters.js'
import { buildVersion, isEntry, resolveRoot } from './root.js'

export const HELP = `Usage: pnpm assets:lfs [options]

Prints the paths of source/ that a build with the same options reads, separated by commas:
the value of \`git lfs pull --include\`. A folder whose files are all read is one path.

  git lfs pull --include "$(node packages/assets/build/cli.js lfs --brand chassis --app docs)"

Options:
  --brand <name...>      Only these brands
  --app <name...>        Only these apps
  --platform <name...>   Only these platforms
  --type <name...>       Only these type folders, such as images and icons
  --include <pattern...> Only the files that match a pattern, such as "images/home/**"
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --help, -h             Print this help
  --version, -v          Print the version
`

/**
 * The paths a build reads, for `git lfs pull --include`.
 * @param {import('./types.js').BuildOptions} [options] - The filters of the build, and `cwd`
 * @returns {string[]} Paths relative to the repository root, with forward slashes, sorted. A
 *   folder whose files are all read is `<folder>/**`
 * @throws {Error} On a filter that is not configured, or that selects no file
 */
export function lfsInclude(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const config = loadConfig(cwd)
  const jobs = planJobs(config, options)
  const filter = createFileFilter(options)

  /** @param {string} file */
  const relative = (file) => path.relative(cwd, file).split(path.sep).join('/')
  const selected = new Set(
    jobs.flatMap((job) => listSourceFiles(config, job, filter, cwd)).map(relative)
  )
  if (selected.size === 0) {
    throw new Error('The filters select no file. Check --type and --include.')
  }

  const source = path.join(cwd, 'source')
  const all = fs
    .readdirSync(source, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !shouldIgnoreFile(entry.name))
    .map((entry) => relative(path.join(entry.parentPath, entry.name)))
  return coverPaths(all, selected)
}

/**
 * The command line: `pnpm assets:lfs`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv)
    if (options.help) {
      console.log(HELP)
    } else if (options.version) {
      console.log(buildVersion())
    } else {
      console.log(lfsInclude(options).join(','))
    }
  } catch (error) {
    console.error(`❌ ${/** @type {Error} */ (error).message}`)
    process.exit(/** @type {Error} */ (error).message.startsWith('Unknown option') ? 2 : 1)
  }
}

if (isEntry(import.meta.url)) cli()
