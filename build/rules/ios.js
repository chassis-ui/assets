/**
 * @file rules/ios.js
 * @description The files of the iOS output. Until session 2.5 of the roadmap writes the
 *              Swift package, they are the loose files of 0.1.8.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { copyOf, hasExtension, legacyCase, legacyParts } from './legacy.js'

/** @import { Asset, PlannedFile, SourceFile } from '../types.js' */

const FONT_FILES = ['.ttf', '.otf']
const ICON_FILES = ['.svg', '.pdf']
const NO_IMAGE_FILES = ['.webp']

/**
 * Whether iOS takes a file.
 * @param {SourceFile} file
 * @returns {boolean}
 */
function takes(file) {
  if (file.type === 'fonts') return hasExtension(file, FONT_FILES)
  if (file.type === 'icons') return hasExtension(file, ICON_FILES)
  if (file.type === 'images') return !hasExtension(file, NO_IMAGE_FILES)
  return false
}

/**
 * The name of a file on iOS: lowercase with underscores, the resolution indicator and the
 * extension as they are written.
 * @param {SourceFile} file
 * @returns {string}
 */
function nameOf(file) {
  const { base, resolution, extension } = legacyParts(posix.basename(file.path))
  return legacyCase(base, '_') + resolution + extension
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
