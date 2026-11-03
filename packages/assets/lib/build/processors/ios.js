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
/** @type {import('../../types.js').Processor} */
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
   * What `--asset-catalog` writes: the files of `images/` move into an asset catalog, one
   * image set per base name
   */
  assetCatalog: { type: 'images', name: 'Assets.xcassets' },

  /**
   * What `--icon-catalog` writes: the files of `icons/` move into an asset catalog of their
   * own, as an image is free to have the name of an icon
   */
  iconCatalog: { type: 'icons', name: 'Icons.xcassets', icons: true },

  /**
   * What the app icon bundle holds, as Icon Composer saves it: `icon.json`, which names the
   * files of its layers, and those files in `Assets/`. The source lint reads it; the build
   * copies the bundle as one file
   */
  appIcon: { bundle: '.icon', manifest: 'icon.json', assets: 'Assets' },

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
