/**
 * Shared utilities for all platform processors
 * @module processors/shared
 */

import path from 'path'

/**
 * The formats of a bundle, a folder that is one file to the tool that reads it, with the
 * platforms that keep it. The files in a bundle name each other, so they keep their names.
 */
const BUNDLES = { '.icon': ['ios'] }

/** The type folders with rules of their own, whose folders are never a bundle. */
const KNOWN_TYPES = ['fonts', 'images', 'icons']

/**
 * The place of a bundle in a path relative to the folder of an app.
 * @param {string[]} parts - The path, split in folders and a name
 * @returns {number} The index of the bundle in `parts`, or -1
 * @example
 * bundleIndex(['app-icon', 'app-icon.icon', 'icon.json']) // Returns: 1
 * bundleIndex(['images', 'app-icon.icon', 'icon.json']) // Returns: -1
 */
export function bundleIndex(parts) {
  if (KNOWN_TYPES.includes(parts[0])) return -1
  return parts.findIndex((part) => path.extname(part).toLowerCase() in BUNDLES)
}

/**
 * Whether a platform keeps a bundle.
 * @param {string} platform - The name of the platform
 * @param {string} name - The name of the bundle
 * @returns {boolean}
 */
export function keepsBundle(platform, name) {
  return BUNDLES[path.extname(name).toLowerCase()]?.includes(platform) ?? false
}

/**
 * Extract resolution indicator from filename (e.g., `@2x`, `@3x`)
 * @param {string} fileName - The filename to parse
 * @returns {Object} Object with base name, resolution indicator, and extension
 * @example
 * extractResolutionIndicator('icon@2x.png')
 * // Returns: { base: 'icon', resolution: '@2x', ext: '.png' }
 */
export function extractResolutionIndicator(fileName) {
  const match = fileName.match(/^(.+?)(@\d+\.?\d*x)?(\.\w+)$/)
  if (!match) return { base: fileName, resolution: '', ext: '' }

  const [, base, resolution = '', ext] = match
  return { base, resolution, ext }
}

/**
 * Check if a file extension is allowed for a specific configuration
 * @param {string} ext - File extension (with dot)
 * @param {string[]} allowedFormats - Array of allowed extensions
 * @returns {boolean} True if extension is allowed
 */
export function isAllowedFormat(ext, allowedFormats) {
  if (!allowedFormats || allowedFormats.length === 0) return true
  return allowedFormats.includes(ext.toLowerCase())
}

/**
 * Check if a file extension is excluded
 * @param {string} ext - File extension (with dot)
 * @param {string[]} excludedFormats - Array of excluded extensions
 * @returns {boolean} True if extension is excluded
 */
export function isExcludedFormat(ext, excludedFormats) {
  if (!excludedFormats || excludedFormats.length === 0) return false
  return excludedFormats.includes(ext.toLowerCase())
}
