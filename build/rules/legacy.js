/**
 * @file rules/legacy.js
 * @description The names and the layout of 0.1.8, which the rules reproduce until the
 *              source is renamed and the native outputs get their own layout. Sessions
 *              2.2 and 2.5 of the roadmap delete this file.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'

/** @import { PlannedFile, SourceFile } from '../types.js' */

/**
 * Takes a file name apart as 0.1.8 did. The resolution indicator is kept as it is
 * written, since `a.png` and `a@1x.png` went to two folders on Android.
 * @param {string} file - A file name, without its folders.
 * @returns {{ base: string, resolution: string, extension: string }}
 */
export function legacyParts(file) {
  const match = /^(.+?)(@\d+\.?\d*x)?(\.\w+)$/.exec(file)
  if (!match) return { base: file, resolution: '', extension: '' }
  const [, base, resolution = '', extension] = match
  return { base, resolution, extension }
}

/**
 * Writes a name in lowercase with one separator, as 0.1.8 did.
 * @param {string} base - A file name without resolution indicator and extension.
 * @param {'-' | '_'} separator - `-` for the web, `_` for the native outputs.
 * @returns {string}
 */
export function legacyCase(base, separator) {
  return base
    .replace(/([a-z])([A-Z])/g, `$1${separator}$2`)
    .replace(/[^a-z0-9]/gi, separator)
    .replace(new RegExp(`${separator}+`, 'g'), separator)
    .toLowerCase()
}

/**
 * Whether the extension of a file is in a list, without regard to case.
 * @param {SourceFile} file
 * @param {string[]} extensions - With their dots, in lowercase.
 * @returns {boolean}
 */
export function hasExtension(file, extensions) {
  return extensions.includes(file.extension.toLowerCase())
}

/**
 * Plans the copy of a source file.
 * @param {SourceFile} file
 * @param {string} name - The name of the copy.
 * @param {string} [folder] - A folder below the folder of the file, for the copy.
 * @returns {PlannedFile}
 */
export function copyOf(file, name, folder = '') {
  /** @type {PlannedFile} */
  const planned = {
    path: posix.join(file.type, file.folder, folder, name),
    type: file.type,
    source: file.path
  }
  if (file.width !== undefined && file.height !== undefined) {
    planned.width = file.width
    planned.height = file.height
    planned.density = file.density
  }
  return planned
}
