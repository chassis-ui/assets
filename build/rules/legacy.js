/**
 * @file rules/legacy.js
 * @description The names and the layout of the native outputs of 0.1.8, which the rules
 *              of iOS and Android reproduce until session 2.5 of the roadmap gives them
 *              their own. That session deletes this file.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { posix } from 'node:path'
import { FONT_EXTENSIONS } from '../manifests/fonts.js'
import { isLeftOut } from './variants.js'

/** @import { Asset, Job, PlannedFile, SourceFile } from '../types.js' */

const NO_IMAGE_FILES = ['.webp']

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
 * Writes a name in lowercase with underscores, as 0.1.8 did.
 * @param {string} base - A file name without resolution indicator and extension.
 * @returns {string}
 */
export function legacyCase(base) {
  return base
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
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
 * Whether a native output takes a file: the font files of a family, the icons of the
 * formats of the platform, and the images that are not WebP. It takes no file of `other/`.
 * @param {SourceFile} file
 * @param {string[]} icons - The extensions of the icons that the platform takes.
 * @returns {boolean}
 */
export function isNative(file, icons) {
  if (file.type === 'fonts') return hasExtension(file, FONT_EXTENSIONS)
  if (file.type === 'icons') return hasExtension(file, icons)
  if (file.type === 'images') return !hasExtension(file, NO_IMAGE_FILES)
  return false
}

/**
 * Whether a native output takes an asset.
 * @param {Asset} asset
 * @param {Job} job
 * @param {string[]} icons - The extensions of the icons that the platform takes.
 * @returns {boolean}
 */
export function includeNative(asset, job, icons) {
  return !isLeftOut(asset, job) && asset.files.some((file) => isNative(file, icons))
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

/**
 * Plans the licenses of the font families of a job, in `licenses/`.
 * @param {Asset[]} assets - The assets that the platform takes.
 * @returns {PlannedFile[]}
 */
export function licenses(assets) {
  /** @type {Map<string, PlannedFile>} */
  const files = new Map()
  for (const { family, files: sources } of assets) {
    if (!family) continue
    const license = sources.find((file) => file.path.endsWith(`/fonts/${family.license}`))
    if (!license) continue
    // Two families can have one license file: it is written once
    files.set(license.path, {
      path: `licenses/${posix.basename(license.path)}`,
      type: 'fonts',
      source: license.path
    })
  }
  return [...files.values()]
}
