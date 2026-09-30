#!/usr/bin/env node
/**
 * @file cli.js
 * @description The command line of the build: the commands and their options, the help
 *              and the exit code. It is the only module that reads `process.argv` and
 *              that ends the process.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { readVersion } from './config.js'
import { BuildError } from './errors.js'
import { build, plan } from './index.js'
import { createLogger } from './logger.js'
import { jobName } from './plan.js'

/** @import { Logger } from './logger.js' */

export const HELP = `
Chassis Assets Build System

Usage: node build/cli.js <command> [options]

Commands:
  build                     Build the jobs: one per brand, app and platform

Options:
  --brand <brands...>       Take these brands only
  --app <apps...>           Take these apps only
  --platform <platforms...> Take these platforms only
  --out <dir>               Root of the output (default: dist)
  --config <file>           JSON file to read the build configuration from, instead of
                            chassis.build in package.json
  --optimize, --no-optimize Turn the optimization on or off for every job
  --dry-run                 Print the jobs and their files, and write nothing
  --quiet                   Print errors only
  --help, -h                Show this help
  --version, -v             Show the version

A filter takes one or more values: --brand chassis example, --brand chassis,example
or --brand chassis --brand example.

Examples:
  node build/cli.js build
  node build/cli.js build --brand chassis --app docs
  node build/cli.js build --platform ios android --dry-run
`

const COMMANDS = ['build']
const FILTERS = ['brand', 'app', 'platform']

/** What 0.1.8 took and this build does not, with what to do. */
const REMOVED_OPTIONS = {
  '--clean': 'a job removes the files of its folder that it did not write',
  '--no-clean': 'a job removes the files of its folder that it did not write'
}

/**
 * @typedef {Object} CliOptions
 * @property {string} [command]
 * @property {string[]} brands
 * @property {string[]} apps
 * @property {string[]} platforms
 * @property {string} [out]
 * @property {string} [config]
 * @property {boolean} [optimize]
 * @property {boolean} dryRun
 * @property {boolean} quiet
 * @property {boolean} help
 * @property {boolean} version
 */

/**
 * Parses the arguments of the command line. `parseArgs` takes one value per option, so
 * the values that follow the first value of a filter are read from its tokens.
 * @param {string[]} args - The arguments after the script name.
 * @returns {CliOptions}
 * @throws {BuildError} When an option or a command is unknown, or a value is missing.
 */
export function parseCli(args) {
  // pnpm passes the `--` of `pnpm assets -- --quiet` on. It would make an argument of
  // every option that follows it
  args = args.filter((arg) => arg !== '--')
  for (const [option, reason] of Object.entries(REMOVED_OPTIONS)) {
    if (args.includes(option)) {
      throw new BuildError(`${option} is gone: ${reason}. Remove the option`, { rule: 'cli' })
    }
  }

  let parsed
  try {
    parsed = parseArgs({
      args,
      options: {
        brand: { type: 'string', multiple: true },
        app: { type: 'string', multiple: true },
        platform: { type: 'string', multiple: true },
        out: { type: 'string' },
        config: { type: 'string' },
        optimize: { type: 'boolean' },
        'dry-run': { type: 'boolean' },
        quiet: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' }
      },
      allowPositionals: true,
      allowNegative: true,
      strict: true,
      tokens: true
    })
  } catch (error) {
    throw new BuildError(`${error.message}. See --help`, { rule: 'cli', cause: error })
  }

  /** @type {Record<string, string[]>} */
  const filters = { brand: [], app: [], platform: [] }
  let command
  let filter = null
  for (const token of parsed.tokens) {
    if (token.kind === 'option') {
      filter = FILTERS.includes(token.name) ? token.name : null
      if (filter) filters[filter].push(...String(token.value).split(','))
    } else if (token.kind === 'positional') {
      if (filter) filters[filter].push(...token.value.split(','))
      else if (command === undefined) command = token.value
      else {
        throw new BuildError(`Unexpected argument "${token.value}". See --help`, { rule: 'cli' })
      }
    } else {
      filter = null
    }
  }
  for (const [name, values] of Object.entries(filters)) {
    if (values.some((value) => value === '')) {
      throw new BuildError(`--${name} has an empty value`, { rule: 'cli' })
    }
  }
  if (command !== undefined && !COMMANDS.includes(command)) {
    throw new BuildError(`Unknown command "${command}". The commands are: ${COMMANDS.join(', ')}`, {
      rule: 'cli'
    })
  }

  const { values } = parsed
  return {
    command,
    brands: filters.brand,
    apps: filters.app,
    platforms: filters.platform,
    out: values.out,
    config: values.config,
    optimize: values.optimize,
    dryRun: values['dry-run'] ?? false,
    quiet: values.quiet ?? false,
    help: values.help ?? false,
    version: values.version ?? false
  }
}

/**
 * Runs the command `build`.
 * @param {CliOptions} options
 * @param {Logger} logger
 * @param {string} root
 * @returns {Promise<boolean>} Whether every job succeeded.
 */
async function runBuild(options, logger, root) {
  const { brands, apps, platforms, out, config, optimize } = options
  const selection = { root, brands, apps, platforms, out, config, optimize }

  if (options.dryRun) {
    const planned = await plan(selection)
    logger.dryRun(planned.jobs.filter((job) => job.errors.length === 0))
    for (const { job, errors } of planned.jobs) {
      for (const error of errors) logger.error(`Failed: ${jobName(job)}`, error)
    }
    return planned.ok
  }

  const startTime = Date.now()
  const result = await build({
    ...selection,
    onJobStart(job, index, total) {
      if (index === 0) logger.header(`📦 Building ${total} job(s)...`)
      logger.progress(index + 1, total, jobName(job))
    },
    onJobEnd(report) {
      if (report.errors.length === 0) logger.job(report)
      for (const error of report.errors) logger.error(`Failed: ${jobName(report)}`, error)
    }
  })
  const failed = result.jobs.filter((report) => report.errors.length > 0).length
  logger.summary(result.jobs.length - failed, failed, startTime)
  return result.ok
}

/**
 * Runs the command line.
 * @param {string[]} [args] - The arguments after the script name.
 * @param {Object} [context]
 * @param {string} [context.root] - The folder of `package.json` and `source/`.
 * @param {Pick<Console, 'log' | 'warn' | 'error'>} [context.console] - Where it prints.
 * @returns {Promise<number>} The exit code: 0, or 1 when something failed.
 */
export async function run(args = process.argv.slice(2), context = {}) {
  const { root = process.cwd(), console: out = console } = context
  let logger = createLogger({ console: out })
  try {
    const options = parseCli(args)
    logger = createLogger({ quiet: options.quiet, console: out })

    if (options.help) {
      out.log(HELP)
      return 0
    }
    if (options.version) {
      out.log(`v${await readVersion(root)}`)
      return 0
    }
    if (options.command === undefined) {
      throw new BuildError(`A command is missing: ${COMMANDS.join(', ')}. See --help`, {
        rule: 'cli'
      })
    }
    return (await runBuild(options, logger, root)) ? 0 : 1
  } catch (error) {
    logger.error(error instanceof BuildError ? 'Build failed' : 'Build failed unexpectedly', error)
    return 1
  }
}

// Only when this file is what Node.js runs, not when it is imported
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await run()
}
