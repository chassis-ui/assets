#!/usr/bin/env node
/**
 * Chassis Assets Command Line
 *
 * One entry for the build and its checks, so that the scripts of the root `package.json`
 * run them with `node` and nothing installed: `node packages/assets/build/cli.js <command>`.
 * Each command is the `cli()` of its module and takes the options that module documents.
 *
 * @module cli
 */

import { buildVersion } from './root.js'

/** The commands, each with the module that runs it and the script that calls it. */
export const COMMANDS = {
  build: { module: './build-assets.js', script: 'pnpm assets', about: 'Build the assets' },
  analyze: {
    module: './analyze-assets.js',
    script: 'pnpm assets:analyze',
    about: 'Sizes, types and duplicates of the source and the output'
  },
  validate: {
    module: './validate-assets.js',
    script: 'pnpm assets:validate',
    about: 'Check an existing output against the source and the configuration'
  },
  contract: {
    module: './contract.js',
    script: 'pnpm assets:contract',
    about: 'Check the docs output against the consumer contract'
  },
  verify: {
    module: './verify.js',
    script: 'pnpm assets:verify',
    about: 'The validator, then the contract check'
  },
  lfs: {
    module: './lfs-include.js',
    script: 'pnpm assets:lfs',
    about: 'Print the Git LFS paths a build reads, for git lfs pull --include'
  },
  'lint-source': {
    module: './lint-source.js',
    script: 'pnpm assets:lint:source',
    about: 'Check the names and the layout of source/'
  }
}

export const HELP = `Usage: chassis-assets <command> [options]

Commands:
${Object.entries(COMMANDS)
  .map(([name, { about, script }]) => `  ${name.padEnd(13)}${about} (${script})`)
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
