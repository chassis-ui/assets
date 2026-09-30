/**
 * @file cache.js
 * @description The cache of the steps, keyed by content: the bytes of the source file, the
 *              name and the parameters of the step, and the version of its tool.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

/** @import { Step } from './types.js' */

/** The folder of the cache, from the root. Git ignores it. */
export const CACHE_FOLDER = '.cache/assets'

/**
 * @param {Uint8Array | string} content
 * @returns {string} The SHA-256 hash of the content, in hexadecimal.
 */
export function sha256(content) {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Writes a value as JSON with the keys of every object in one order, so that two equal
 * values give one text.
 * @param {unknown} value
 * @returns {string}
 */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/**
 * Computes the key of a step that runs on a file.
 * @param {string} source - The hash of the bytes of the source file.
 * @param {Step} step - The name and the parameters of the step.
 * @param {string} version - The version of the tool of the step.
 * @returns {string}
 */
export function cacheKey(source, step, version) {
  return sha256(canonical({ source, step: step.name, params: step.params ?? {}, version }))
}

/**
 * Opens the cache of a folder. Deleting the folder changes nothing but the time of the
 * next build.
 * @param {string} folder - The folder of the cache.
 * @returns {{ get: (key: string) => Promise<Uint8Array | null>,
 *   set: (key: string, content: Uint8Array) => Promise<void> }}
 */
export function openCache(folder) {
  const fileOf = (/** @type {string} */ key) => path.join(folder, key.slice(0, 2), key)
  return {
    async get(key) {
      try {
        return await readFile(fileOf(key))
      } catch (error) {
        if (error.code === 'ENOENT') return null
        throw error
      }
    },

    // Written under another name first, so that a build that stops leaves no half file
    async set(key, content) {
      const file = fileOf(key)
      await mkdir(path.dirname(file), { recursive: true })
      const partial = `${file}.${process.pid}.partial`
      await writeFile(partial, content)
      await rename(partial, file)
    }
  }
}
