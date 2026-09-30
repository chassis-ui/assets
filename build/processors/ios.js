/**
 * iOS Platform Processor
 * Handles asset processing for iOS platforms with snake_case naming
 * @module processors/ios
 */

import { extractResolutionIndicator } from './shared.js'

/**
 * iOS Platform Processor Configuration
 * Converts assets to iOS-compatible formats with snake_case naming
 */
/** @type {import('../types.js').Processor} */
const iosProcessor = {
  name: 'ios',
  icon: '🍎',

  /**
   * File type filters for iOS platform
   * iOS keeps TTF/OTF fonts with their license files, SVG/PDF/PNG icons, and excludes WebP images
   */
  allowedFontFormats: ['.ttf', '.otf', '.txt'],
  allowedIconFormats: ['.svg', '.pdf', '.png'],
  excludedImageFormats: ['.webp'],

  /**
   * Transform filename to snake_case (lowercase with underscores)
   * @param {string} fileName - Original filename
   * @returns {string} Transformed filename in snake_case
   * @example
   * renameFile('MyFont@2x.ttf') // Returns: 'my_font@2x.ttf'
   */
  renameFile(fileName) {
    const { base, resolution, ext } = extractResolutionIndicator(fileName)

    const snakeBase = base
      .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase → snake_case
      .replace(/[-\s]+/g, '_') // hyphens/spaces → underscores
      .replace(/[^a-z0-9_]/gi, '_') // special chars → underscores
      .replace(/_+/g, '_') // collapse multiple underscores
      .toLowerCase()

    return snakeBase + resolution + ext
  }
}

export default iosProcessor
