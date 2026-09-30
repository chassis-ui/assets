/**
 * @file plan.js
 * @description Plans a build before a file is written: the jobs with their layers, from
 *              the configuration and the filters, and the files of a job, from its assets
 *              and the rules of its platform.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { BuildError } from './errors.js'
import {
  DEFAULT_LAYER,
  MANIFEST_FILE,
  OPTIMIZATIONS,
  SHARED_LAYER,
  SOURCE,
  byCodeUnit
} from './names.js'

/** @import { Asset, Config, Filters, Job, Optimization, PlannedFile, Rules } from './types.js' */

/**
 * Turns the value of `optimize` into the list of what is optimized.
 * @param {unknown} value - `true`, `false`, nothing, or a list of optimizations.
 * @returns {Optimization[] | null} The list, or `null` when the value is not valid.
 */
export function optimizations(value) {
  if (value === true) return [...OPTIMIZATIONS]
  if (value === false || value === undefined) return []
  if (!Array.isArray(value) || value.some((item) => !OPTIMIZATIONS.includes(item))) return null
  return OPTIMIZATIONS.filter((item) => value.includes(item))
}

/**
 * The source folders that a brand and an app are built from, in override order. The
 * inventory skips a folder that does not exist.
 * @param {string} brand
 * @param {string} app
 * @returns {string[]}
 */
export function layers(brand, app) {
  return [
    `${SOURCE}/${DEFAULT_LAYER}/${SHARED_LAYER}`,
    `${SOURCE}/${DEFAULT_LAYER}/${app}`,
    `${SOURCE}/${brand}/${SHARED_LAYER}`,
    `${SOURCE}/${brand}/${app}`
  ]
}

/**
 * Checks the filters against the configuration, so that a mistyped value fails and does
 * not build nothing.
 * @param {Config} config
 * @param {Filters} filters
 * @throws {BuildError} When a filter has a value that the configuration does not have.
 */
function checkFilters(config, filters) {
  const known = {
    brand: [config.brands, filters.brands],
    app: [Object.keys(config.apps), filters.apps],
    platform: [[...new Set(Object.values(config.apps).flat())], filters.platforms]
  }
  const problems = Object.entries(known).flatMap(([flag, [values, selected = []]]) => {
    const unknown = selected.filter((value) => !values.includes(value))
    if (unknown.length === 0) return []
    return [`--${flag} ${unknown.join(' ')} (the configuration has ${values.join(', ')})`]
  })
  if (problems.length > 0) {
    throw new BuildError(`Unknown filter values: ${problems.join('; ')}`, { rule: 'filters' })
  }
}

/**
 * Plans the jobs: one per brand, app and platform that the filters select, in the order
 * of the configuration.
 * @param {Config} config
 * @param {Filters} [filters] - An empty or missing filter selects everything.
 * @param {Object} [options]
 * @param {string} [options.out] - The root of the output. `dist` without it.
 * @param {boolean} [options.optimize] - Turns the optimization on or off for every job.
 *   Without it, a job takes `options.<platform>.optimize` of the configuration.
 * @returns {Job[]}
 * @throws {BuildError} When a filter has a value that the configuration does not have,
 *   or when the filters together select no job.
 */
export function planJobs(config, filters = {}, { out = 'dist', optimize } = {}) {
  checkFilters(config, filters)
  /** @type {<T extends string>(all: T[], selected?: string[]) => T[]} */
  const select = (all, selected) =>
    selected && selected.length > 0 ? all.filter((item) => selected.includes(item)) : all
  const root = out.replace(/[/\\]+$/, '') || out

  /** @type {Job[]} */
  const jobs = []
  for (const brand of select(config.brands, filters.brands)) {
    for (const app of select(Object.keys(config.apps), filters.apps)) {
      for (const platform of select(config.apps[app], filters.platforms)) {
        jobs.push({
          brand,
          app,
          platform,
          layers: layers(brand, app),
          out: `${root}/${platform}/${app}/${brand}`,
          optimize: optimizations(optimize ?? config.options[platform]?.optimize) ?? []
        })
      }
    }
  }
  if (jobs.length === 0) {
    throw new BuildError('The filters select no job: no selected app has a selected platform', {
      rule: 'filters'
    })
  }
  return jobs
}

/**
 * The name of a job in a message: its folder below the root of the output.
 * @param {Pick<Job, 'platform' | 'app' | 'brand'>} job
 * @returns {string}
 */
export function jobName(job) {
  return `${job.platform}/${job.app}/${job.brand}`
}

/**
 * Whether a path stays in the folder of a job, and leaves the output manifest alone.
 * @param {string} path
 * @returns {boolean}
 */
function isPathOfJob(path) {
  return (
    path !== '' &&
    path !== MANIFEST_FILE &&
    !path.includes('\\') &&
    !posix.isAbsolute(path) &&
    posix.normalize(path) === path &&
    path !== '..' &&
    !path.startsWith('../')
  )
}

/**
 * Plans the files of a job: what the rules of its platform make of its assets. Every file
 * is there once, and inside the folder of the job.
 *
 * Two paths that differ by case only count as one: they are one file on macOS and
 * Windows, and two on Linux.
 * @param {Job} job
 * @param {Asset[]} assets - The assets of the job, from the inventory.
 * @param {Rules} rules - The rules of the platform of the job.
 * @returns {PlannedFile[]} Sorted by path.
 * @throws {BuildError} When a path leaves the folder of the job, or when two files would
 *   get one path. The message names every such path, with the source files.
 */
export function planFiles(job, assets, rules) {
  const taken = assets.filter((asset) => rules.include(asset, job))
  const files = [...taken.flatMap((asset) => rules.files(asset, job)), ...rules.extras(taken, job)]

  /** @type {Map<string, PlannedFile[]>} */
  const byPath = new Map()
  for (const file of files) {
    if (!isPathOfJob(file.path)) {
      throw new BuildError(
        `${jobName(job)}: the path ${JSON.stringify(file.path)} is not in the folder of the job`,
        { file: file.source, rule: `rules/${job.platform}` }
      )
    }
    const key = file.path.toLowerCase()
    byPath.set(key, [...(byPath.get(key) ?? []), file])
  }

  const collisions = [...byPath.values()].filter((group) => group.length > 1)
  if (collisions.length > 0) {
    const lines = collisions.map((group) => {
      const sources = group.map((file) => file.source ?? `the ${file.path} that the build writes`)
      return `  ${group[0].path}: ${sources.join(' and ')}`
    })
    throw new BuildError(
      `${jobName(job)}: ${collisions.length === 1 ? 'two files' : 'files'} would get one path\n${lines.join('\n')}`,
      { file: collisions[0][0].source, rule: 'collision' }
    )
  }

  return files.sort((a, b) => byCodeUnit(a.path, b.path))
}
