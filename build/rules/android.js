/**
 * @file rules/android.js
 * @description The files of the Android output. Until session 2.5 of the roadmap writes
 *              the `res/` tree, they are the files of 0.1.8, with the density folders
 *              below the folder of the image, and the licenses of the fonts.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { copyOf, includeNative, isNative, legacyCase, legacyParts, licenses } from './legacy.js'

/** @import { Asset, Job, PlannedFile, SourceFile } from '../types.js' */

const ICON_FILES = ['.svg']

/** @type {Record<string, string>} */
const DENSITY_FOLDERS = {
  '@1x': 'drawable-mdpi',
  '@1.5x': 'drawable-hdpi',
  '@2x': 'drawable-xhdpi',
  '@3x': 'drawable-xxhdpi',
  '@4x': 'drawable-xxxhdpi'
}

/**
 * Whether 0.1.8 gave a file the prefix of an icon: its folder or the folder above it is
 * named `icons`.
 * @param {SourceFile} file
 * @returns {boolean}
 */
function isIcon(file) {
  const folders = [file.type, ...file.folder.split('/').filter(Boolean)]
  return folders.slice(-2).includes('icons')
}

/**
 * Plans the copy of a file: lowercase with underscores, without resolution indicator,
 * and an image in the folder of its density.
 * @param {SourceFile} file
 * @returns {PlannedFile}
 */
function planned(file) {
  const { base, resolution, extension } = legacyParts(posix.basename(file.path))
  const name = legacyCase(base)
  if (file.type === 'images') {
    const folder = resolution ? (DENSITY_FOLDERS[resolution] ?? 'drawable-mdpi') : 'drawable'
    return copyOf(file, name + extension, folder)
  }
  const prefix = isIcon(file) && !name.startsWith('ic_') ? 'ic_' : ''
  return copyOf(file, prefix + name + extension)
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
  return asset.files.filter((file) => isNative(file, ICON_FILES)).map(planned)
}

/**
 * @param {Asset[]} assets
 * @returns {PlannedFile[]}
 */
export function extras(assets) {
  return licenses(assets)
}
