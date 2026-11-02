/**
 * Chassis Assets Release Notes
 *
 * Prints the changelog entry of one version, without its heading, for the body of the GitHub
 * release. A CI step and the release run it, so a version without an entry is not released.
 * It reads both heading styles: that of Changesets (`## 0.2.0`) and the hand-written one of
 * Keep a Changelog (`## [0.1.8] - 2026-07-14`).
 *
 * `releaseNotes(changelog, version)` finds the entry; the command-line entry at the bottom
 * prints it and exits 1 when `CHANGELOG.md` has no entry for the version, or the entry is empty.
 *
 * @module release-notes
 */

import fs from 'fs'
import path from 'path'
import { isEntry, resolveRoot } from './root.js'

/** The changelog of a repository, at its root. */
export const CHANGELOG = 'CHANGELOG.md'

/**
 * The entry of one version: the lines between its `## ` heading and the next heading of that
 * level or above, outside a code block.
 * @param {string} changelog - The text of the changelog
 * @param {string} version - The version, without a leading `v`
 * @returns {string | null} The entry, trimmed, or null when the version has no heading
 */
export function releaseNotes(changelog, version) {
  const quoted = version.replace(/[$()*+.?[\\\]^{|}-]/g, '\\$&')
  const heading = new RegExp(`^## \\[?${quoted}\\]?(?:\\s|$)`)
  const lines = changelog.split('\n')

  let start = -1
  let end = lines.length
  let inFence = false
  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
    } else if (!inFence && start === -1) {
      if (heading.test(line)) start = index
    } else if (!inFence && /^##? /.test(line)) {
      end = index
      break
    }
  }
  if (start === -1) return null
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim()
}

const HELP = `Usage: chassis-assets release-notes [version] [options]

Prints the entry of a version in CHANGELOG.md, without its heading, for the body of the GitHub
release. Exits 1 when the changelog has no entry for the version, or the entry is empty.

Options:
  --cwd <dir>   Folder of CHANGELOG.md and package.json, default the nearest folder upward
                whose package.json has a \`chassis\` block
  --help, -h    Print this help

The version is by default the one of package.json. A leading v is ignored.
`

/**
 * The command line of the release notes: `chassis-assets release-notes`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  /** @type {string | undefined} */
  let cwd
  /** @type {string | undefined} */
  let version
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cwd' && argv[i + 1] !== undefined) {
      cwd = argv[++i]
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else if (argv[i].startsWith('-') || version !== undefined) {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    } else {
      version = argv[i]
    }
  }

  const root = resolveRoot(cwd)
  try {
    version ??= JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).version
    if (typeof version !== 'string' || version === '') {
      throw new Error(`The package.json of ${root} has no version. Give the version`)
    }
    version = version.replace(/^v/, '')

    const file = path.join(root, CHANGELOG)
    if (!fs.existsSync(file)) {
      throw new Error(`${root} has no ${CHANGELOG}. Add it, with an entry for ${version}`)
    }
    const notes = releaseNotes(fs.readFileSync(file, 'utf-8'), version)
    if (notes === null) throw new Error(`${CHANGELOG} has no entry for ${version}. Add it`)
    if (notes === '') throw new Error(`The entry of ${CHANGELOG} for ${version} is empty`)
    process.stdout.write(`${notes}\n`)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
