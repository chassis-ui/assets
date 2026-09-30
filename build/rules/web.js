/**
 * @file rules/web.js
 * @description The files of the web output. Paths and names are those of the source, and
 *              the variants of an image are next to each other.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { imageFiles, isLeftOut } from './variants.js'

/** @import { Asset, Job, PlannedFile } from '../types.js' */

/**
 * The web takes images, icons and the files of `other/`. It takes no font until session
 * 2.4 of the roadmap writes the WOFF2 files and the stylesheet.
 * @param {Asset} asset
 * @param {Job} job
 * @returns {boolean}
 */
export function include(asset, job) {
  return asset.type !== 'fonts' && !isLeftOut(asset, job)
}

/**
 * @param {Asset} asset
 * @returns {PlannedFile[]}
 */
export function files(asset) {
  if (asset.type === 'images') return imageFiles(asset)
  return asset.files.map((file) => ({
    path: posix.join(file.type, file.folder, posix.basename(file.path)),
    type: file.type,
    source: file.path
  }))
}

/**
 * @returns {PlannedFile[]}
 */
export function extras() {
  return []
}
