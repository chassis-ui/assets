/**
 * Shared utilities for all platform processors
 * @module processors/shared
 */

/**
 * Extract resolution indicator from filename (e.g., @2x, @3x)
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
