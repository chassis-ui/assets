/**
 * @file index.js
 * @description The library: one function per command. Each takes its options as an
 *              argument and returns a report. None reads `process.argv`, changes the
 *              working directory, reads a file when it is imported, or ends the process.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CACHE_FOLDER, openCache } from './cache.js'
import { loadConfig } from './config.js'
import { CONTRACT_JOB, missingFromContract } from './contract.js'
import { fsReader, readInventory, readSource } from './inventory.js'
import { lintSource } from './lint.js'
import { buildManifest, readManifest, writeManifest } from './manifest.js'
import { runJob } from './pipeline.js'
import { planFiles, planJobs } from './plan.js'
import { rules } from './rules/index.js'

/**
 * @import { Asset, Job, PlannedFile, Problem, Report, SourceReader, StepRunner } from './types.js'
 */

/**
 * What selects and places the jobs, for every function of the library.
 * @typedef {Object} PlanOptions
 * @property {string} [root] - The folder of `package.json` and `source/`. The working
 *   directory without it.
 * @property {string} [config] - A JSON file to read the configuration from.
 * @property {string[]} [brands] - The brands to take. Every brand without it.
 * @property {string[]} [apps] - The apps to take.
 * @property {string[]} [platforms] - The platforms to take.
 * @property {string} [out] - The root of the output, from `root`. `dist` without it.
 * @property {boolean} [optimize] - Turns the optimization on or off for every job.
 * @property {SourceReader} [reader] - How `source/` is read.
 */

/**
 * @typedef {Object} BuildOptions
 * @property {Record<string, StepRunner>} [steps] - The steps, by name.
 * @property {string | false} [cache] - The folder of the cache, from `root`, or `false`
 *   to run every step. `.cache/assets` without it.
 * @property {number} [concurrency] - How many files a job works on at a time.
 * @property {(job: Job, index: number, total: number) => void} [onJobStart]
 * @property {(report: Report) => void} [onJobEnd]
 */

/**
 * A job with the files it writes.
 * @typedef {Object} PlannedJob
 * @property {Job} job
 * @property {PlannedFile[]} files - Empty when the job could not be planned.
 * @property {Error[]} errors - Why the job could not be planned.
 */

/**
 * Plans a build: the jobs, and the files that each would write. It reads `source/` and
 * writes nothing.
 * @param {PlanOptions} [options]
 * @returns {Promise<{ ok: boolean, version: string, jobs: PlannedJob[] }>}
 * @throws {import('./errors.js').BuildError} When the configuration or a filter is wrong.
 */
export async function plan(options = {}) {
  const { root = process.cwd(), brands, apps, platforms, out, optimize } = options
  const { version, config } = await loadConfig({ root, config: options.config })
  const jobs = planJobs(config, { brands, apps, platforms }, { out, optimize })
  const reader = options.reader ?? fsReader(root)

  // The jobs of one brand and one app have the same layers, so they share an inventory
  /** @type {Map<string, Promise<Asset[]>>} */
  const inventories = new Map()
  /** @type {PlannedJob[]} */
  const planned = []
  for (const job of jobs) {
    const key = job.layers.join('\n')
    try {
      if (!inventories.has(key)) inventories.set(key, readInventory(job.layers, reader))
      const assets = await inventories.get(key)
      planned.push({ job, files: planFiles(job, assets, rules[job.platform]), errors: [] })
    } catch (error) {
      planned.push({ job, files: [], errors: [error] })
    }
  }
  return { ok: planned.every((job) => job.errors.length === 0), version, jobs: planned }
}

/**
 * Builds the jobs. A job that fails does not stop the others: its report has the error.
 * @param {PlanOptions & BuildOptions} [options]
 * @returns {Promise<{ ok: boolean, version: string, jobs: Report[] }>}
 * @throws {import('./errors.js').BuildError} When the configuration or a filter is wrong.
 */
export async function build(options = {}) {
  const { root = process.cwd(), steps, concurrency, onJobStart, onJobEnd } = options
  const cache =
    options.cache === false ? null : openCache(path.resolve(root, options.cache ?? CACHE_FOLDER))
  const planned = await plan(options)

  /** @type {Report[]} */
  const reports = []
  for (const [index, { job, files, errors }] of planned.jobs.entries()) {
    onJobStart?.(job, index, planned.jobs.length)
    const { brand, app, platform } = job
    /** @type {Report} */
    let report = {
      ...{ brand, app, platform, out: job.out },
      ...{ written: 0, cached: 0, removed: [], bytes: 0, ms: 0, errors }
    }
    if (errors.length === 0) {
      try {
        const result = await runJob(job, files, { root, steps, cache, concurrency })
        const manifest = buildManifest(job, result.files, planned.version)
        await writeManifest(manifest, path.resolve(root, job.out))
        report = result.report
      } catch (error) {
        report.errors = [error]
      }
    }
    reports.push(report)
    onJobEnd?.(report)
  }
  return {
    ok: reports.every((report) => report.errors.length === 0),
    version: planned.version,
    jobs: reports
  }
}

/**
 * Checks `source/` against the source contract. It reads every file, and writes nothing.
 * @param {Pick<PlanOptions, 'root' | 'config' | 'reader'>} [options]
 * @returns {Promise<{ ok: boolean, files: number, problems: Problem[] }>} `files` is the
 *   number of files that were read.
 * @throws {import('./errors.js').BuildError} When the configuration is wrong.
 */
export async function lint(options = {}) {
  const { root = process.cwd() } = options
  const { config } = await loadConfig({ root, config: options.config })
  const reader = options.reader ?? fsReader(root)

  const source = await readSource(config, reader)
  const problems = lintSource(source)
  const paths = source.stacks.flatMap((stack) => stack.layers.flatMap((layer) => layer.files))
  const files = new Set(paths.map((file) => file.path)).size
  return { ok: problems.length === 0, files, problems }
}

/**
 * Builds into a scratch folder, and checks that the docs output holds every file of the
 * consumer contract. The comparison with the golden files comes with session 2.6 of the
 * roadmap.
 * @param {PlanOptions & BuildOptions} [options] - With `out`, the build is written there
 *   and kept.
 * @returns {Promise<{ ok: boolean, version: string, jobs: Report[],
 *   contract: { checked: boolean, missing: Array<{ path: string, reader: string }> } }>}
 *   `contract.checked` is `false` when the filters leave out the job that the sites read.
 * @throws {import('./errors.js').BuildError} When the configuration or a filter is wrong.
 */
export async function verify(options = {}) {
  const scratch = options.out ? null : await mkdtemp(path.join(tmpdir(), 'chassis-assets-'))
  try {
    const built = await build({ ...options, out: options.out ?? scratch })
    const job = built.jobs.find((report) =>
      Object.entries(CONTRACT_JOB).every(([key, value]) => report[key] === value)
    )
    const contract = { checked: false, missing: [] }
    if (job && job.errors.length === 0) {
      const root = options.root ?? process.cwd()
      const manifest = await readManifest(path.resolve(root, job.out))
      contract.checked = true
      contract.missing = missingFromContract(manifest.files.map((file) => file.path))
    }
    return { ...built, ok: built.ok && contract.missing.length === 0, contract }
  } finally {
    if (scratch) await rm(scratch, { recursive: true, force: true })
  }
}
