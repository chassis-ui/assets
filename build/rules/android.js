/**
 * @file rules/android.js
 * @description The files of the Android output. Until session 2.5 of the roadmap writes
 *              the `res/` tree, they are the files of 0.1.8, with the density folders
 *              below the folder of the image.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { copyOf, hasExtension, legacyCase, legacyParts } from './legacy.js'

/** @import { Asset, PlannedFile, SourceFile } from '../types.js' */

const FONT_FILES = ['.ttf', '.otf']
const ICON_FILES = ['.svg']
const NO_IMAGE_FILES = ['.webp']

/** @type {Record<string, string>} */
const DENSITY_FOLDERS = {
  '@1x': 'drawable-mdpi',
  '@1.5x': 'drawable-hdpi',
  '@2x': 'drawable-xhdpi',
  '@3x': 'drawable-xxhdpi',
  '@4x': 'drawable-xxxhdpi'
}

/**
 * Whether Android takes a file.
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
  const name = legacyCase(base, '_')
  if (file.type === 'images') {
    const folder = resolution ? (DENSITY_FOLDERS[resolution] ?? 'drawable-mdpi') : 'drawable'
    return copyOf(file, name + extension, folder)
  }
  const prefix = isIcon(file) && !name.startsWith('ic_') ? 'ic_' : ''
  return copyOf(file, prefix + name + extension)
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
  return asset.files.filter(takes).map(planned)
}

/**
 * @returns {PlannedFile[]}
 */
export function extras() {
  return []
}
