/**
 * Chassis Assets Source Lint
 *
 * Checks `source/` against the rules of the design-guidelines page: names of lowercase
 * letters, digits and hyphens, a resolution indicator only at the end of a name, every file
 * in a type folder of an app, and no Git LFS pointer in place of a file. A name that
 * `lint.allow` of `chassis.checks.json` keeps, with its reason, is a warning, not an error.
 *
 * `lintSource(options)` reads the files and returns the problems; the command-line entry at
 * the bottom prints them and exits 1 on an error.
 *
 * @module lint-source
 */

import fs from 'fs'
import path from 'path'
import { isLfsPointer, loadConfig, shouldIgnoreFile } from './build-assets.js'
import { isEntry, resolveRoot } from './root.js'

/** @import { LintProblem } from './types.js' */

/** A name or a folder: lowercase letters and digits, words joined by one hyphen. */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** An extension: a dot, then lowercase letters and digits. */
const EXTENSION = /^\.[a-z0-9]+$/

/** A resolution indicator at the end of a name: `@2x`, `@3x`, `@1.5x`. */
const INDICATOR = /@\d+(?:\.\d+)?x$/

const HELP = `Usage: pnpm assets:lint:source [options]

Checks the names and the layout of source/ against the rules of the design-guidelines page.
Exits 1 when a file breaks a rule. A name that \`lint.allow\` of chassis.checks.json keeps
is printed as a warning, with its reason.

Options:
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --allow-lfs-pointers   Do not report Git LFS pointer files
                         (also CHASSIS_ALLOW_LFS_POINTERS=1 in the environment)
  --help, -h             Print this help
`

/**
 * Whether a path relative to `source/` matches a pattern of `lint.allow`.
 * @param {string} file - With forward slashes
 * @param {string} pattern - With forward slashes, `*` for one folder
 * @returns {boolean}
 */
export function matchesPattern(file, pattern) {
  const parts = file.split('/')
  const expected = pattern.split('/')
  return (
    parts.length === expected.length &&
    expected.every((part, i) => part === '*' || part === parts[i])
  )
}

/**
 * The problems of the name of one file, relative to `source/`. Pure.
 * @param {string} file - `<brand>/<app>/<type>/…/<name>`, with forward slashes
 * @returns {string[]} The messages, empty when the name keeps the rules
 */
export function checkName(file) {
  const messages = []
  const parts = file.split('/')
  const name = parts.pop()

  for (const folder of parts) {
    if (!NAME.test(folder)) {
      messages.push(`the folder "${folder}" is not of lowercase letters, digits and hyphens`)
    }
  }

  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot) : ''
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(INDICATOR, '')

  if (!extension) {
    messages.push('has no extension')
  } else if (!EXTENSION.test(extension)) {
    messages.push(`has the extension ${extension}, which is not in lowercase`)
  }

  if (!NAME.test(base)) {
    const suggestion = base
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const hint =
      NAME.test(suggestion) && suggestion !== base
        ? `, such as "${suggestion}${name.slice(base.length)}"`
        : ''
    messages.push(
      `has the name "${base}", which is not of lowercase letters, digits and hyphens${hint}`
    )
  }

  if (parts.length < 3) {
    messages.push('is not in a type folder: source/<brand>/<app>/<type>/')
  }

  return messages
}

/**
 * Every file under a folder, relative to it with forward slashes, without the files and
 * folders the build ignores.
 * @param {string} dir
 * @returns {string[]}
 */
function listSource(dir) {
  const files = []
  const walk = (folder, prefix) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (shouldIgnoreFile(entry.name)) continue
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path.join(folder, entry.name), relative)
      else files.push(relative)
    }
  }
  walk(dir, '')
  return files.sort()
}

/**
 * Check `source/`.
 * @param {{ cwd?: string, allowLfsPointers?: boolean }} [options]
 * @returns {{ errors: LintProblem[], warnings: LintProblem[], files: number }}
 * @throws {Error} When `source/` or `package.json` cannot be read
 */
export function lintSource(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const sourceDir = path.join(cwd, 'source')
  const allowLfsPointers =
    options.allowLfsPointers || process.env.CHASSIS_ALLOW_LFS_POINTERS === '1'
  const config = loadConfig(cwd)
  const brands = [config.brandFolder, ...config.brands]
  const apps = Object.keys(config.apps)

  /** @type {LintProblem[]} */
  const errors = []
  /** @type {LintProblem[]} */
  const warnings = []

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (shouldIgnoreFile(entry.name) || !entry.isDirectory()) continue
    if (!brands.includes(entry.name)) {
      warnings.push({
        file: `${entry.name}/`,
        message: `is not the default folder or a brand of chassis.build.brands (${config.brands.join(', ')}), so the build reads nothing from it`
      })
      continue
    }
    for (const app of fs.readdirSync(path.join(sourceDir, entry.name), { withFileTypes: true })) {
      if (shouldIgnoreFile(app.name) || !app.isDirectory() || apps.includes(app.name)) continue
      warnings.push({
        file: `${entry.name}/${app.name}/`,
        message: `is not an app of chassis.build.apps (${apps.join(', ')}), so the build reads nothing from it`
      })
    }
  }

  const files = listSource(sourceDir)
  for (const file of files) {
    const oddity = config.lintAllow.find((known) => matchesPattern(file, known.pattern))
    for (const message of checkName(file)) {
      if (oddity) warnings.push({ file, message: `${message}. Kept: ${oddity.reason}` })
      else errors.push({ file, message })
    }
    if (!allowLfsPointers && isLfsPointer(path.join(sourceDir, file))) {
      errors.push({ file, message: 'is a Git LFS pointer, not the file. Run `git lfs pull`' })
    }
  }

  return { errors, warnings, files: files.length }
}

/**
 * The command line of the source lint: `pnpm assets:lint:source`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  const options = { cwd: undefined, allowLfsPointers: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cwd' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      options.cwd = argv[++i]
    } else if (argv[i] === '--allow-lfs-pointers') {
      options.allowLfsPointers = true
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    }
  }

  try {
    const { errors, warnings, files } = lintSource(options)
    const isPointer = (/** @type {LintProblem} */ e) => e.message.includes('Git LFS pointer')
    const pointers = errors.filter(isPointer)
    for (const { file, message } of warnings) console.warn(`⚠️  source/${file} ${message}`)
    for (const { file, message } of errors.filter((e) => !isPointer(e))) {
      console.error(`❌ source/${file} ${message}`)
    }
    for (const { file, message } of pointers.slice(0, 5)) {
      console.error(`❌ source/${file} ${message}`)
    }
    if (pointers.length > 0) {
      console.error(
        `\n${pointers.length} Git LFS pointer(s)${pointers.length > 5 ? ', the first five above' : ''}. Run \`git lfs pull\`, or pass --allow-lfs-pointers to check the names only.`
      )
    }
    console.log(
      `\n${files} files checked: ${errors.length} error(s), ${warnings.length} warning(s)`
    )
    process.exit(errors.length > 0 ? 1 : 0)
  } catch (error) {
    console.error(`💥 Source lint failed: ${error.message}`)
    process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
