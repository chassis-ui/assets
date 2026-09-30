/**
 * @file pipeline.js
 * @description Runs the files of a job, a bounded number at a time: copies a file, runs
 *              its step through the cache, or writes its text. Before it writes, it
 *              removes what the job does not write from the folder of the job.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { cacheKey, sha256 } from './cache.js'
import { mapLimit } from './concurrency.js'
import { BuildError, errorOf } from './errors.js'
import { isLfsPointer, lfsPointerProblem } from './inventory.js'
import { MANIFEST_FILE, byCodeUnit } from './names.js'
import { jobName } from './plan.js'

/**
 * @import { Job, ManifestFile, PlannedFile, Report, StepRunner } from './types.js'
 * @import { openCache } from './cache.js'
 */

/** How many files a job works on at a time. */
export const CONCURRENCY = 16

/**
 * Lists the files of a folder and of the folders below it.
 * @param {string} folder
 * @returns {Promise<{ files: string[], folders: string[] }>} The paths from the folder,
 *   with `/`. Empty when there is no such folder.
 */
async function listFolder(folder) {
  let entries
  try {
    entries = await readdir(folder, { recursive: true, withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return { files: [], folders: [] }
    throw error
  }
  const files = []
  const folders = []
  for (const entry of entries) {
    const relative = path.relative(folder, path.join(entry.parentPath, entry.name))
    const list = entry.isDirectory() ? folders : files
    list.push(relative.split(path.sep).join('/'))
  }
  return { files: files.sort(byCodeUnit), folders: folders.sort(byCodeUnit) }
}

/**
 * Removes the files of the folder of a job that the job does not write. It runs before
 * the job writes: where the case of a name does not count, a file that is left under
 * another case would give its name to the file that replaces it.
 * @param {string} folder - The folder of the job.
 * @param {PlannedFile[]} files - The files of the job.
 * @returns {Promise<string[]>} The paths of the removed files, from the folder.
 */
async function removeOthers(folder, files) {
  const planned = new Set([MANIFEST_FILE, ...files.map((file) => file.path)])
  const found = await listFolder(folder)
  const others = found.files.filter((file) => !planned.has(file))
  await mapLimit(others, CONCURRENCY, (file) => rm(path.join(folder, file), { force: true }))
  return others
}

/**
 * Removes the folders below the folder of a job that hold nothing.
 * @param {string} folder - The folder of the job.
 */
async function removeEmptyFolders(folder) {
  const { folders } = await listFolder(folder)
  // The deepest first, so that a folder that held only empty folders goes too
  const deepestFirst = folders.sort((a, b) => b.split('/').length - a.split('/').length)
  for (const name of deepestFirst) {
    await rmdir(path.join(folder, name)).catch((error) => {
      if (!['ENOTEMPTY', 'EEXIST', 'ENOENT'].includes(error.code)) throw error
    })
  }
}

/**
 * Runs a job: removes what it does not write, then writes its files.
 * @param {Job} job
 * @param {PlannedFile[]} files - The files of the job, from `planFiles`.
 * @param {Object} [options]
 * @param {string} [options.root] - The folder that holds `source/`, and that the folder
 *   of the job is relative to. The working directory without it.
 * @param {Record<string, StepRunner>} [options.steps] - The steps, by name.
 * @param {ReturnType<typeof openCache> | null} [options.cache] - The cache of the steps.
 *   Without it every step runs.
 * @param {number} [options.concurrency] - How many files are worked on at a time.
 * @returns {Promise<{ report: Report, files: ManifestFile[] }>} What the job did, and the
 *   files of its manifest.
 * @throws {BuildError} That names the file and the step, when a file cannot be written.
 */
export async function runJob(job, files, options = {}) {
  const { root = process.cwd(), steps = {}, cache = null, concurrency = CONCURRENCY } = options
  const started = performance.now()
  const folder = path.resolve(root, job.out)
  let cached = 0

  /** @type {Map<string, Promise<string>>} */
  const versions = new Map()
  const versionOf = (/** @type {string} */ name) => {
    if (!versions.has(name)) versions.set(name, Promise.resolve(steps[name].version()))
    return versions.get(name)
  }

  /** @type {Set<string>} */
  const made = new Set()
  const makeFolder = async (/** @type {string} */ name) => {
    if (made.has(name)) return
    await mkdir(name, { recursive: true })
    made.add(name)
  }

  /**
   * @param {PlannedFile} file
   * @returns {Promise<Uint8Array>} The bytes of the source of a file.
   */
  const readSource = async (file) => {
    const content = await readFile(path.join(root, file.source))
    if (isLfsPointer(content)) throw errorOf(lfsPointerProblem(file.source))
    return content
  }

  /**
   * @param {PlannedFile} file
   * @returns {Promise<Uint8Array>} The bytes of a file that a step makes.
   */
  const runStep = async (file) => {
    const runner = steps[file.step.name]
    if (!runner) {
      throw new BuildError(`${file.path}: the build has no step "${file.step.name}"`, {
        file: file.source,
        rule: `rules/${job.platform}`
      })
    }
    const source = await readSource(file)
    const key = cache ? cacheKey(sha256(source), file.step, await versionOf(file.step.name)) : ''
    const found = cache ? await cache.get(key) : null
    if (found) {
      cached++
      return found
    }
    const content = await runner.run(source, file.step.params ?? {}, file)
    if (cache) await cache.set(key, content)
    return content
  }

  /**
   * @param {PlannedFile} file
   * @returns {Promise<ManifestFile>}
   */
  const write = async (file) => {
    try {
      const content =
        file.text !== undefined
          ? Buffer.from(file.text)
          : file.step
            ? await runStep(file)
            : await readSource(file)
      const target = path.join(folder, file.path)
      await makeFolder(path.dirname(target))
      await writeFile(target, content)
      return {
        path: file.path,
        type: file.type,
        bytes: content.length,
        sha256: sha256(content),
        width: file.width,
        height: file.height,
        density: file.density,
        source: file.source,
        derived: file.text !== undefined || file.step !== undefined
      }
    } catch (error) {
      if (error instanceof BuildError) throw error
      const name = file.source ?? `${jobName(job)}/${file.path}`
      const rule = file.step?.name ?? (file.text === undefined ? 'copy' : 'write')
      throw new BuildError(`${name}: the step ${rule} failed (${error.message})`, {
        file: name,
        rule,
        cause: error
      })
    }
  }

  const removed = await removeOthers(folder, files)
  await makeFolder(folder)
  const written = await mapLimit(files, concurrency, write)
  await removeEmptyFolders(folder)

  return {
    report: {
      brand: job.brand,
      app: job.app,
      platform: job.platform,
      out: job.out,
      written: written.length,
      cached,
      removed,
      bytes: written.reduce((sum, file) => sum + file.bytes, 0),
      ms: Math.round(performance.now() - started),
      errors: []
    },
    files: written
  }
}
