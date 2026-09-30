/**
 * @file names.js
 * @description The names that the build knows, and what takes the name of a source file
 *              apart.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

/** @import { Optimization, Platform } from './types.js' */

/** The folder of the source files, from the root. */
export const SOURCE = 'source'

/** The brand folder that every brand starts from. It is not a brand. */
export const DEFAULT_LAYER = 'default'

/** The folder of what every app of a brand gets. It is not an app. */
export const SHARED_LAYER = 'shared'

/** @type {Platform[]} */
export const PLATFORMS = ['web', 'ios', 'android']

/** @type {Optimization[]} */
export const OPTIMIZATIONS = ['images', 'svg', 'fonts']

/** The output manifest, at the root of the folder of every job. */
export const MANIFEST_FILE = 'chassis-assets.json'

/** The type folders of a layer, in the order the inventory reads them. */
export const ASSET_TYPES = /** @type {const} */ (['fonts', 'icons', 'images', 'other'])

/** The extensions of the files that have a size in pixels. */
export const IMAGE_EXTENSIONS = ['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']

const SYSTEM_FILES = ['Thumbs.db', 'desktop.ini']
const SYSTEM_SUFFIXES = ['~', '.swp', '.tmp', '.temp']

/**
 * Takes a file name apart. The resolution indicator counts only where it ends the name,
 * before the extension: `a@2x.png` is at 2x, and `a@2x-1.png` is an image named `a@2x-1`.
 * @param {string} file - A file name, without its folders.
 * @returns {{ name: string, density: number, extension: string }} The extension has its
 *   dot and is empty for a name without one. The density is 1 without an indicator.
 */
export function parseFileName(file) {
  const dot = file.lastIndexOf('.')
  const extension = dot > 0 ? file.slice(dot) : ''
  const stem = extension ? file.slice(0, dot) : file
  const indicator = /^(.+)@(\d+(?:\.\d+)?)x$/.exec(stem)
  if (!indicator) return { name: stem, density: 1, extension }
  return { name: indicator[1], density: Number(indicator[2]), extension }
}

/**
 * Whether an entry of `source/` is a file of the system or of an editor, and not an asset:
 * a hidden file, `Thumbs.db`, a backup or a swap file.
 * @param {string} name - The name of a file or a folder.
 * @returns {boolean}
 */
export function isSystemFile(name) {
  return (
    name.startsWith('.') ||
    SYSTEM_FILES.includes(name) ||
    SYSTEM_SUFFIXES.some((suffix) => name.endsWith(suffix))
  )
}

/**
 * Compares two strings by their code units, so that a list has one order on every
 * operating system and in every locale.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function byCodeUnit(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}
