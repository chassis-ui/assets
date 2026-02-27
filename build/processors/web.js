/**
 * Web Platform Processor
 * Handles asset processing for web platforms with kebab-case naming
 * @module processors/web
 */

import { extractResolutionIndicator } from './shared.js'

/**
 * Web Platform Processor Configuration
 * Converts assets to web-friendly formats with kebab-case naming
 */
const webProcessor = {
  name: 'web',
  icon: '🌐',

  /**
   * File type filters for web platform
   * Web only supports modern font formats and excludes platform-specific formats
   */
  allowedFontFormats: ['.woff', '.woff2', '.css', '.scss'],
  excludedFormats: [],

  /**
   * Transform filename to kebab-case (lowercase with hyphens)
   * @param {string} fileName - Original filename
   * @returns {string} Transformed filename in kebab-case
   * @example
   * renameFile('MyFont@2x.woff2') // Returns: 'my-font@2x.woff2'
   */
  renameFile(fileName) {
    const { base, resolution, ext } = extractResolutionIndicator(fileName)

    const kebabBase = base
      .replace(/([a-z])([A-Z])/g, '$1-$2') // camelCase → kebab-case
      .replace(/[_\s]+/g, '-') // underscores/spaces → hyphens
      .replace(/[^a-z0-9-]/gi, '-') // special chars → hyphens
      .replace(/-+/g, '-') // collapse multiple hyphens
      .toLowerCase()

    return kebabBase + resolution + ext
  }
}

export default webProcessor
