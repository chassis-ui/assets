/**
 * @file rules/ios.js
 * @description The files of the iOS output. Until session 2.5 of the roadmap writes the
 *              Swift package, they are the loose files of 0.1.8, and the licenses of the
 *              fonts.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { copyOf, includeNative, isNative, legacyCase, legacyParts, licenses } from './legacy.js'

/** @import { Asset, Job, PlannedFile, SourceFile } from '../types.js' */

const ICON_FILES = ['.svg', '.pdf']

/**
 * The name of a file on iOS: lowercase with underscores, the resolution indicator and the
 * extension as they are written.
 * @param {SourceFile} file
 * @returns {string}
 */
function nameOf(file) {
  const { base, resolution, extension } = legacyParts(posix.basename(file.path))
  return legacyCase(base) + resolution + extension
}

/**
 * @param {Asset} asset
 * @param {Job} job
 * @returns {boolean}
 */
export function include(asset, job) {
  return includeNative(asset, job, ICON_FILES)
}

/**
 * @param {Asset} asset
 * @returns {PlannedFile[]}
 */
export function files(asset) {
  return asset.files
    .filter((file) => isNative(file, ICON_FILES))
    .map((file) => copyOf(file, nameOf(file)))
}

/**
 * @param {Asset[]} assets
 * @returns {PlannedFile[]}
 */
export function extras(assets) {
  return licenses(assets)
}
