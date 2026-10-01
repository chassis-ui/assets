/**
 * Chassis Assets Consumer Contract
 *
 * Checks that the output of a job has the files its consumers read by name. The contracts
 * are data of the repository, not of the build: `contracts` in `chassis.checks.json` beside
 * `package.json`, by job, each with who reads the files, and the files. A repository
 * without that file has no contract, and the check passes.
 *
 *     "contracts": {
 *       "web/docs/chassis": [
 *         {
 *           "reader": "the layouts of the site",
 *           "files": ["images/favicon{,-16x16,-32x32}.png"],
 *           "sets": [{ "pattern": "images/shots/*\/{light,dark}/*{,@2x}.png", "except": [] }]
 *         }
 *       ]
 *     }
 *
 * `files` have to be there. A `set` is a pattern with `*` and `{a,b}`: when the output has
 * a file that matches it, it has to have the same file with every other alternative too,
 * and it has to have at least one such file.
 *
 * `checkContracts(options)` returns the files each job lacks; the command-line entry at the
 * bottom prints them and exits 1 when one is missing.
 *
 * @module contract
 */

import fs from 'fs'
import path from 'path'
import { CHECKS_FILE, loadConfig } from './build-assets.js'
import { isEntry, resolveRoot } from './root.js'

/** @import { ContractEntry, ContractProblem, ContractSet } from './types.js' */

/**
 * Write out the alternatives of a pattern: `a-{b,c}.svg` gives `a-b.svg` and `a-c.svg`.
 * An empty alternative, as in `{,@2x}`, gives the path without it.
 * @param {string} pattern
 * @returns {string[]}
 */
export function expand(pattern) {
  const group = /\{([^{}]*)\}/.exec(pattern)
  if (!group) return [pattern]
  const [whole, alternatives] = group
  return alternatives
    .split(',')
    .flatMap((alternative) => expand(pattern.replace(whole, alternative)))
}

/** @param {string} text */
const quote = (text) => text.replace(/[$()*+\-.?[\\\]^{|}]/g, '\\$&')

/**
 * Compile a pattern of a set: `*` is any run of characters inside one folder or name, as
 * short as the rest of the pattern allows, and `{a,b}` is one of its alternatives.
 * @param {string} pattern
 * @returns {{ regex: RegExp, parts: Array<string | string[] | null> }} The parts of the
 *   pattern in order: a literal, the alternatives of a group, or null for a `*`
 */
export function compilePattern(pattern) {
  /** @type {Array<string | string[] | null>} */
  const parts = []
  let source = ''
  for (const token of pattern.split(/(\*|\{[^{}]*\})/).filter(Boolean)) {
    if (token === '*') {
      parts.push(null)
      source += '([^/]*?)'
    } else if (token.startsWith('{')) {
      const alternatives = token.slice(1, -1).split(',')
      parts.push(alternatives)
      // The longest first, so that `{,@2x}` takes `@2x` where it is
      const sorted = [...alternatives].sort((a, b) => b.length - a.length)
      source += `(${sorted.map(quote).join('|')})`
    } else {
      parts.push(token)
      source += quote(token)
    }
  }
  return { regex: new RegExp(`^${source}$`), parts }
}

/**
 * The files a set lacks. Pure.
 *
 * Every file of the output that matches the pattern, and none of the exceptions, is read
 * with each alternative of each `{a,b}` in place of its own, so all of them have to be
 * there. A set that no file matches lacks the pattern itself.
 * @param {string[]} paths - The files of the output, relative to it, with forward slashes
 * @param {string | ContractSet} set - A pattern, or a pattern with exceptions
 * @returns {string[]} The missing paths, each once
 */
export function missingFromSet(paths, set) {
  const { pattern, except = [] } = typeof set === 'string' ? { pattern: set } : set
  const { regex, parts } = compilePattern(pattern)
  const exceptions = except.map((glob) => compilePattern(glob).regex)
  const has = new Set(paths)
  /** @type {Set<string>} */
  const missing = new Set()
  let matched = false

  for (const file of paths) {
    const match = regex.exec(file)
    if (!match || exceptions.some((exception) => exception.test(file))) continue
    matched = true
    // The file with its own wildcards, and the alternatives left as a pattern to expand
    let group = 0
    const variants = parts
      .map((part) => {
        if (typeof part === 'string') return part
        group++
        return part === null ? match[group] : `{${part.join(',')}}`
      })
      .join('')
    for (const variant of expand(variants)) {
      if (!has.has(variant)) missing.add(variant)
    }
  }

  if (!matched) missing.add(pattern)
  return [...missing]
}

/**
 * Find the files of the contracts of one job that its output does not have. Pure.
 * @param {string[]} paths - The files of the output of the job, relative to it, with
 *   forward slashes
 * @param {ContractEntry[]} entries - The contracts of the job
 * @returns {ContractProblem[]} The missing files, sorted by path
 */
export function missingFromContract(paths, entries) {
  const has = new Set(paths)
  const missing = entries.flatMap(({ reader, files = [], sets = [] }) => [
    ...files
      .flatMap(expand)
      .filter((file) => !has.has(file))
      .map((file) => ({ path: file, reader })),
    ...sets.flatMap((set) => missingFromSet(paths, set).map((file) => ({ path: file, reader })))
  ])
  return missing.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/**
 * Every file under a folder, relative to it with forward slashes.
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
    )
}

/**
 * Check the output of a build against the contracts of `chassis.checks.json`.
 * @param {{ cwd?: string, out?: string }} [options] - The repository root and the output folder
 * @returns {Array<{ job: string, dir: string, files: number, missing: ContractProblem[] }>}
 *   One result per job that has a contract. `dir` is the folder checked, relative to
 *   `cwd`; `files` is 0 when it does not exist
 * @throws {Error} When a contract is not of the shape above, or names a job that the
 *   configuration does not build
 */
export function checkContracts(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const config = loadConfig(cwd)
  /** @type {Map<string, ContractEntry[]>} */
  const jobs = new Map()

  for (const entry of config.contracts) {
    const [platform, app, brand, ...rest] = String(entry.job ?? '').split('/')
    if (!platform || !app || !brand || rest.length > 0 || !entry.reader) {
      throw new Error(
        `A contract of ${CHECKS_FILE} needs a job, as <platform>/<app>/<brand>, and "reader": ${JSON.stringify(entry)}`
      )
    }
    if (!config.brands.includes(brand) || !config.apps[app]?.includes(platform)) {
      throw new Error(
        `The contract of ${entry.reader} names the job ${entry.job}, which chassis.build of package.json does not build`
      )
    }
    jobs.set(entry.job, [...(jobs.get(entry.job) ?? []), entry])
  }

  return [...jobs].map(([job, entries]) => {
    const dir = path.resolve(cwd, options.out || 'dist', job)
    const relative = path.relative(cwd, dir) || '.'
    if (!fs.existsSync(dir)) {
      const readers = [...new Set(entries.map((entry) => entry.reader))].join(', ')
      return { job, dir: relative, files: 0, missing: [{ path: '', reader: readers }] }
    }
    const paths = listFiles(dir)
    return { job, dir: relative, files: paths.length, missing: missingFromContract(paths, entries) }
  })
}

/**
 * Print the results of `checkContracts()`.
 * @param {ReturnType<typeof checkContracts>} results
 * @returns {boolean} Whether every output keeps its contracts
 */
export function printContracts(results) {
  if (results.length === 0) {
    console.log(`✅ Consumer contract: none in ${CHECKS_FILE}, nothing to check`)
    return true
  }
  let ok = true
  for (const { job, dir, files, missing } of results) {
    if (missing.length === 0) {
      console.log(`✅ Consumer contract: ${dir}/ has every file its consumers read`)
    } else if (files === 0) {
      ok = false
      const [platform, app, brand] = job.split('/')
      console.error(
        `❌ Consumer contract: ${dir}/ does not exist. Run \`pnpm assets --platform ${platform} --app ${app} --brand ${brand}\``
      )
    } else {
      ok = false
      console.error(`❌ Consumer contract: ${missing.length} file(s) missing from ${dir}/`)
      for (const { path: file, reader } of missing) {
        console.error(`   - ${file}, read by ${reader}`)
      }
    }
  }
  return ok
}

const HELP = `Usage: pnpm assets:contract [options]

Checks that the output of each job named in \`contracts\` of chassis.checks.json has the
files its consumers read. Exits 1 and names the files and their readers when one is missing.
Passes when no contract is configured.

Options:
  --out <dir>            Output folder to read, default dist
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --help, -h             Print this help
`

/**
 * The command line of the contract check: `pnpm assets:contract`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  const options = { cwd: undefined, out: undefined }
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--out' || argv[i] === '--cwd') && argv[i + 1]) {
      options[argv[i].slice(2)] = argv[++i]
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    }
  }
  try {
    process.exit(printContracts(checkContracts(options)) ? 0 : 1)
  } catch (error) {
    console.error(`❌ ${/** @type {Error} */ (error).message}`)
    process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
