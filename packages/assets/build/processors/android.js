/**
 * Android Platform Processor
 * Handles asset processing for Android platforms with snake_case naming and density folders
 * @module processors/android
 */

import { extractResolutionIndicator } from './shared.js'

/**
 * Android Platform Processor Configuration
 * Converts assets to Android-compatible formats with snake_case naming,
 * ic_ prefix for icons, and density-specific folder structure
 */
/** @type {import('../types.js').Processor} */
const androidProcessor = {
  name: 'android',
  icon: '🤖',

  /**
   * File type filters for Android platform
   * Android keeps TTF/OTF fonts with their license files, SVG icons only, and excludes WebP images
   */
  allowedFontFormats: ['.ttf', '.otf', '.txt'],
  allowedIconFormats: ['.svg'],
  excludedImageFormats: ['.webp'],

  /**
   * Density folder mapping for resolution indicators
   * Maps `@1x`, `@2x`, `@3x`, etc. to Android drawable density folders
   */
  densityMapping: {
    '@1x': 'drawable-mdpi',
    '@1.5x': 'drawable-hdpi',
    '@2x': 'drawable-xhdpi',
    '@3x': 'drawable-xxhdpi',
    '@4x': 'drawable-xxxhdpi'
  },

  /**
   * Get Android density folder for a resolution indicator
   * @param {string} resolution - Resolution indicator (e.g., '@2x')
   * @returns {string} Android density folder name
   * @example
   * getDensityFolder('@2x') // Returns: 'drawable-xhdpi'
   */
  getDensityFolder(resolution) {
    return this.densityMapping[resolution] || 'drawable-mdpi'
  },

  /**
   * The folder `processImage()` writes an image to, under the folder of the image: the
   * density folder of its resolution indicator, or `drawable` without one
   * @param {string} fileName - The name of the source file
   * @returns {string} The folder name
   * @example
   * imageFolder('hero@2x.png') // Returns: 'drawable-xhdpi'
   * imageFolder('hero.png') // Returns: 'drawable'
   */
  imageFolder(fileName) {
    const { resolution } = extractResolutionIndicator(fileName)
    return resolution ? this.getDensityFolder(resolution) : 'drawable'
  },

  /**
   * Transform filename to snake_case with ic_ prefix for icons
   * Note: Resolution indicators are NOT included in Android filenames
   * as they are handled by the density folder structure
   * @param {string} fileName - Original filename
   * @param {import('../types.js').RenameContext} [context] - The folder of the file and its
   *   parent, `{ currentDir, parentDir }`, or the legacy boolean that says it is an icon
   * @returns {string} Transformed filename in snake_case (no resolution)
   * @example
   * renameFile('MyIcon@2x.svg', { currentDir: 'icons' }) // Returns: 'ic_my_icon.svg'
   * renameFile('myImage@2x.png', { currentDir: 'images' }) // Returns: 'my_image.png'
   */
  renameFile(fileName, context = {}) {
    const { base, ext } = extractResolutionIndicator(fileName)

    // Handle both new context object and legacy boolean parameter
    const isIcon =
      typeof context === 'boolean'
        ? context
        : context.currentDir === 'icons' || context.parentDir === 'icons'

    let snakeBase = base
      .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase → snake_case
      .replace(/[-\s]+/g, '_') // hyphens/spaces → underscores
      .replace(/[^a-z0-9_]/gi, '_') // special chars → underscores
      .replace(/_+/g, '_') // collapse multiple underscores
      .toLowerCase()

    // Add ic_ prefix for icons
    if (isIcon && !snakeBase.startsWith('ic_')) {
      snakeBase = 'ic_' + snakeBase
    }

    // Don't include resolution in filename for density folder structure
    return snakeBase + ext
  },

  /**
   * Process image file with Android density folder structure
   * Images with resolution indicators go to density-specific folders (drawable-xhdpi/)
   * Images without resolution indicators go to drawable/ folder
   * @param {Object} context - Processing context
   * @param {string} context.srcPath - Source file path
   * @param {string} context.destPath - Destination directory path
   * @param {string} context.fileName - File name
   * @param {Object} context.fs - File system module
   * @param {Object} context.path - Path module
   * @param {Object} context.stats - Build statistics
   * @param {Object} context.logger - Logger instance
   * @returns {boolean} True if file was processed, false otherwise
   */
  processImage(context) {
    const { srcPath, destPath, fileName, fs, path, stats, logger } = context
    const { resolution } = extractResolutionIndicator(fileName)

    // Images WITH resolution indicators go to density-specific folders
    if (resolution) {
      const densityFolder = this.densityMapping[resolution] || 'drawable-mdpi'
      const densityPath = path.join(destPath, densityFolder)

      if (!fs.existsSync(densityPath)) {
        fs.mkdirSync(densityPath, { recursive: true })
        stats.directoriesCreated++
      }

      const newFileName = this.renameFile(fileName, false)
      const densityFilePath = path.join(densityPath, newFileName)

      try {
        fs.copyFileSync(srcPath, densityFilePath)
        logger.log(
          `📄 Copied: ${path.relative(process.cwd(), srcPath)} → ${densityFolder}/${newFileName}`
        )
        stats.filesProcessed++
        return true
      } catch (error) {
        const errorMsg = `Failed to copy ${srcPath}: ${error.message}`
        logger.error(`❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
        return false
      }
    } else {
      // Images WITHOUT resolution indicators go to drawable/ (density-independent)
      const drawablePath = path.join(destPath, 'drawable')

      if (!fs.existsSync(drawablePath)) {
        fs.mkdirSync(drawablePath, { recursive: true })
        stats.directoriesCreated++
      }

      const newFileName = this.renameFile(fileName, false)
      const drawableFilePath = path.join(drawablePath, newFileName)

      try {
        fs.copyFileSync(srcPath, drawableFilePath)
        logger.log(`📄 Copied: ${path.relative(process.cwd(), srcPath)} → drawable/${newFileName}`)
        stats.filesProcessed++
        return true
      } catch (error) {
        const errorMsg = `Failed to copy ${srcPath}: ${error.message}`
        logger.error(`❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
        return false
      }
    }
  }
}

export default androidProcessor
