/**
 * @file rules/web.js
 * @description The files of the web output. Until session 2.2 of the roadmap renames the
 *              source, a file gets the name that 0.1.8 gave it.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { copyOf, hasExtension, legacyCase, legacyParts } from './legacy.js'

/** @import { Asset, PlannedFile, SourceFile } from '../types.js' */

/** The files of `fonts/` that the web takes. */
const FONT_FILES = ['.woff', '.woff2', '.css', '.scss']

/**
 * Whether the web takes a file.
 * @param {SourceFile} file
 * @returns {boolean}
 */
function takes(file) {
  return file.type !== 'fonts' || hasExtension(file, FONT_FILES)
}

/**
 * The name of a file on the web: lowercase with hyphens, the resolution indicator and
 * the extension as they are written.
 * @param {SourceFile} file
 * @returns {string}
 */
function nameOf(file) {
  const { base, resolution, extension } = legacyParts(posix.basename(file.path))
  return legacyCase(base, '-') + resolution + extension
}

/**
 * @param {Asset} asset
 * @returns {boolean}
 */
export function include(asset) {
  return asset.files.some(takes)
}

/**
 * @param {Asset} asset
 * @returns {PlannedFile[]}
 */
export function files(asset) {
  return asset.files.filter(takes).map((file) => copyOf(file, nameOf(file)))
}

/**
 * @returns {PlannedFile[]}
 */
export function extras() {
  return []
}
