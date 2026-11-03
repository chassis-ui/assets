#!/usr/bin/env node
/**
 * Chassis Assets Command Line
 *
 * One entry for the build and its checks, the `chassis-assets` command, which runs with `node`
 * and nothing installed: `node packages/assets/lib/cli.js <command>`.
 * Each command is the `cli()` of its module and takes the options that module documents.
 *
 * @module cli
 */

import { buildVersion } from './root.js'

/** The commands, each with the module that runs it. */
export const COMMANDS = {
  build: { module: './build/build-assets.js', about: 'Build the assets' },
  analyze: {
    module: './commands/analyze-assets.js',
    about: 'Sizes, types and duplicates of the source and the output'
  },
  validate: {
    module: './commands/validate-assets.js',
    about: 'Check an existing output against the source and the configuration'
  },
  contract: {
    module: './commands/contract.js',
    about: 'Check an existing output against the consumer contracts of chassis.checks.json'
  },
  verify: {
    module: './commands/verify.js',
    about: 'The validator, then the contract check'
  },
  lfs: {
    module: './commands/lfs-include.js',
    about: 'Print the Git LFS paths a build reads, for git lfs pull --include'
  },
  archive: {
    module: './commands/archive.js',
    about: 'One zip per platform, app and brand of an existing output, for a release'
  },
  manifest: {
    module: './commands/manifest.js',
    about: 'The files of an existing output with their sizes and hashes, for a release'
  },
  diff: {
    module: './commands/diff.js',
    about: 'The files added, removed, renamed and changed since a manifest'
  },
  'release-notes': {
    module: './commands/release-notes.js',
    about: 'Print the changelog entry of a version, and fail without one'
  },
  'check-native': {
    module: './commands/check-native.js',
    about: 'Compile an existing output with the tools of Xcode and of Android'
  },
  init: {
    module: './commands/init.js',
    about: 'Write the baseline of a repository of assets into a folder'
  },
  'static-font': {
    module: './commands/static-font.js',
    about: 'Write the static font of a variable font at a weight, in each format given'
  },
  'lint-source': {
    module: './commands/lint-source.js',
    about: 'Check the names and the layout of source/'
  }
}

export const HELP = `Usage: chassis-assets <command> [options]

Commands:
${Object.entries(COMMANDS)
  .map(([name, { about }]) => `  ${name.padEnd(16)}${about}`)
  .join('\n')}

Options:
  --help, -h     Print this help
  --version, -v  Print the version
`

const [name, ...rest] = process.argv.slice(2)

if (name === undefined || name === '--help' || name === '-h') {
  console.log(HELP)
  process.exit(name === undefined ? 2 : 0)
} else if (name === '--version' || name === '-v') {
  console.log(buildVersion())
} else if (!Object.hasOwn(COMMANDS, name)) {
  console.error(`❌ Unknown command ${name}. Commands: ${Object.keys(COMMANDS).join(', ')}`)
  process.exit(2)
} else {
  const { cli } = await import(COMMANDS[name].module)
  cli(rest)
}
