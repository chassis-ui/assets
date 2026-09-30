/**
 * @file manifest.js
 * @description The output manifest of a job, `chassis-assets.json`: builds it from what
 *              the job wrote, writes it, reads one, and compares two.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { BuildError } from './errors.js'
import { MANIFEST_FILE, byCodeUnit } from './names.js'

/** @import { Job, Manifest, ManifestFile } from './types.js' */

/** The version of the format of the manifest. */
export const MANIFEST_VERSION = 1

const FILE_KEYS = /** @type {const} */ ([
  'path',
  'type',
  'bytes',
  'sha256',
  'width',
  'height',
  'density',
  'source',
  'derived'
])

/**
 * Builds the manifest of a job. It has no date and no absolute path, so that two builds
 * of one commit give the same manifest.
 * @param {Pick<Job, 'brand' | 'app' | 'platform'>} job
 * @param {ManifestFile[]} files - The files that the job wrote.
 * @param {string} [version] - The version of the package. A golden file has none.
 * @returns {Manifest}
 */
export function buildManifest(job, files, version) {
  const sorted = [...files]
    .sort((a, b) => byCodeUnit(a.path, b.path))
    .map((file) => {
      const entries = FILE_KEYS.filter((key) => file[key] !== undefined).map((key) => [
        key,
        file[key]
      ])
      return /** @type {ManifestFile} */ (Object.fromEntries(entries))
    })
  return {
    version: MANIFEST_VERSION,
    ...(version === undefined ? {} : { package: version }),
    brand: job.brand,
    app: job.app,
    platform: job.platform,
    files: sorted
  }
}

/**
 * Writes the manifest of a job at the root of its folder.
 * @param {Manifest} manifest
 * @param {string} folder - The folder of the job.
 * @returns {Promise<string>} The path of the file.
 */
export async function writeManifest(manifest, folder) {
  const file = path.join(folder, MANIFEST_FILE)
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`)
  return file
}

/**
 * Reads a manifest: the one of a folder of a job, or a file.
 * @param {string} file - A folder of a job, or the path of a manifest.
 * @returns {Promise<Manifest>}
 * @throws {BuildError} When the file is missing or is not a manifest of this version.
 */
export async function readManifest(file) {
  const name = file.endsWith('.json') ? file : path.join(file, MANIFEST_FILE)
  let manifest
  try {
    manifest = JSON.parse(await readFile(name, 'utf8'))
  } catch (error) {
    throw new BuildError(`${name}: cannot be read as a manifest (${error.message})`, {
      file: name,
      rule: 'manifest',
      cause: error
    })
  }
  if (manifest?.version !== MANIFEST_VERSION || !Array.isArray(manifest.files)) {
    throw new BuildError(`${name}: is not an output manifest of version ${MANIFEST_VERSION}`, {
      file: name,
      rule: 'manifest'
    })
  }
  return manifest
}

/**
 * Compares the files of two manifests.
 * @param {Pick<Manifest, 'files'>} before
 * @param {Pick<Manifest, 'files'>} after
 * @param {Array<keyof ManifestFile>} [keys] - What is compared of a file that both have.
 *   Everything without it.
 * @returns {{ added: string[], removed: string[],
 *   changed: Array<{ path: string, keys: string[] }> }} Each sorted by path.
 */
export function compareManifests(before, after, keys = [...FILE_KEYS]) {
  const old = new Map(before.files.map((file) => [file.path, file]))
  const now = new Map(after.files.map((file) => [file.path, file]))
  const changed = []
  for (const [filePath, file] of now) {
    const other = old.get(filePath)
    if (!other) continue
    const differing = keys.filter((key) => file[key] !== other[key])
    if (differing.length > 0) changed.push({ path: filePath, keys: differing })
  }
  return {
    added: [...now.keys()].filter((filePath) => !old.has(filePath)).sort(byCodeUnit),
    removed: [...old.keys()].filter((filePath) => !now.has(filePath)).sort(byCodeUnit),
    changed: changed.sort((a, b) => byCodeUnit(a.path, b.path))
  }
}
