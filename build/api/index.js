// Chassis Assets API
// Programmatic interface for asset management

import fs from 'fs'
import path from 'path'
import { generateAsssets, shouldIgnoreFile } from '../build-assets.js'

/**
 * ChassisAssets class provides programmatic API for asset management.
 * Handles configuration loading, asset inventory, building, and validation.
 */
export class ChassisAssets {
  /**
   * Create a new ChassisAssets instance.
   * @param {string} configPath - Path to package.json containing chassis configuration
   */
  constructor(configPath = 'package.json') {
    this.configPath = configPath
    this.loadConfig()
  }

  /**
   * Load configuration from package.json.
   * @throws {Error} If configuration cannot be loaded
   */
  loadConfig() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
      this.config = packageJson.chassis
      this.packageInfo = {
        name: packageJson.name,
        version: packageJson.version
      }
    } catch (error) {
      throw new Error(`Failed to load configuration from ${this.configPath}: ${error.message}`)
    }
  }

  /**
   * Get all available brands from configuration.
   * @returns {string[]} Array of brand names
   */
  getBrands() {
    return this.config.build.brands || []
  }

  /**
   * Get all available apps from configuration.
   * @returns {string[]} Array of app names
   */
  getApps() {
    return Object.keys(this.config.build.apps || {})
  }

  /**
   * Get platforms for a specific app.
   * @param {string} appName - Name of the app
   * @returns {string[]} Array of platform names for the app
   */
  getPlatforms(appName) {
    return this.config.build.apps[appName] || []
  }

  /**
   * Get all unique platforms used across all apps.
   * @returns {string[]} Array of unique platform names
   */
  getAllPlatforms() {
    return [...new Set(Object.values(this.config.build.apps).flat())]
  }

  /**
   * Get all brand-app-platform combinations.
   * @returns {Array<{brand: string, app: string, platform: string}>} Array of combinations
   */
  getCombinations() {
    const combinations = []

    this.getBrands().forEach((brand) => {
      this.getApps().forEach((app) => {
        this.getPlatforms(app).forEach((platform) => {
          combinations.push({ brand, app, platform })
        })
      })
    })

    return combinations
  }

  /**
   * Check if assets exist for a brand/app combination.
   * @param {string} brand - Brand name
   * @param {string} app - App name
   * @param {string} type - Type to check: 'source' or 'dist'
   * @returns {boolean} True if assets exist
   */
  assetsExist(brand, app, type = 'source') {
    const basePath = type === 'source' ? 'source' : 'dist'

    if (type === 'source') {
      const defaultPath = path.join(basePath, this.config.defaults.brandFolder, app)
      const brandPath = path.join(basePath, brand, app)

      return fs.existsSync(defaultPath) || fs.existsSync(brandPath)
    } else {
      // Check dist for specific platform
      const platforms = this.getPlatforms(app)
      return platforms.some((platform) => {
        const distPath = path.join(basePath, platform.split('-')[0], `${brand}-${app}`)
        return fs.existsSync(distPath)
      })
    }
  }

  /**
   * Get asset inventory for a specific brand/app/platform combination.
   * @param {string} brand - Brand name
   * @param {string} app - App name
   * @param {string|null} platform - Platform name (null = source, string = dist)
   * @returns {Object} Inventory object with categorized assets
   */
  getAssetInventory(brand, app, platform = null) {
    const inventory = {
      brand,
      app,
      platform,
      fonts: [],
      images: [],
      icons: [],
      other: []
    }

    const searchPaths = []

    if (platform) {
      // Look in dist
      const distPath = path.join('dist', platform.split('-')[0], `${brand}-${app}`)
      if (fs.existsSync(distPath)) {
        searchPaths.push(distPath)
      }
    } else {
      // Look in source
      const defaultPath = path.join('source', this.config.defaults.brandFolder, app)
      const brandPath = path.join('source', brand, app)

      if (fs.existsSync(defaultPath)) searchPaths.push(defaultPath)
      if (fs.existsSync(brandPath)) searchPaths.push(brandPath)
    }

    searchPaths.forEach((searchPath) => {
      this.catalogAssets(searchPath, inventory)
    })

    return inventory
  }

  /**
   * Recursively catalog assets in a directory.
   * @param {string} dirPath - Directory path to catalog
   * @param {Object} inventory - Inventory object to populate
   */
  catalogAssets(dirPath, inventory) {
    if (!fs.existsSync(dirPath)) return

    try {
      const items = fs.readdirSync(dirPath)

      items.forEach((item) => {
        // Skip system files and ignored patterns
        if (shouldIgnoreFile(item)) {
          return
        }

        const itemPath = path.join(dirPath, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          this.catalogAssets(itemPath, inventory)
        } else {
          const ext = path.extname(item).toLowerCase()
          const category = this.categorizeAsset(ext, dirPath)
          const assetInfo = {
            name: item,
            path: itemPath,
            size: stat.size,
            extension: ext,
            directory: path.basename(path.dirname(itemPath))
          }

          inventory[category].push(assetInfo)
        }
      })
    } catch (error) {
      console.warn(`Warning: Could not catalog assets in ${dirPath}: ${error.message}`)
    }
  }

  /**
   * Categorize an asset by extension and directory name.
   * @param {string} extension - File extension
   * @param {string} dirPath - Directory path containing the file
   * @returns {string} Category name: 'fonts', 'icons', 'images', or 'other'
   */
  categorizeAsset(extension, dirPath) {
    const fontExts = ['.ttf', '.otf', '.woff', '.woff2', '.eot']
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff']
    const iconExts = ['.svg', '.ico']

    const dirName = path.basename(dirPath).toLowerCase()

    // Check directory-based categorization first
    if (dirName.includes('font')) return 'fonts'
    if (dirName.includes('icon')) return 'icons'
    if (dirName.includes('image')) return 'images'

    // Fallback to extension-based categorization
    if (fontExts.includes(extension)) return 'fonts'
    if (iconExts.includes(extension)) return 'icons'
    if (imageExts.includes(extension)) return 'images'

    return 'other'
  }

  /**
   * Build assets programmatically.
   * Note: Currently uses the full config - filtering options are not yet implemented.
   * @param {Object} options - Build options
   * @param {string[]} options.brands - Brands to build (not yet implemented)
   * @param {string[]} options.apps - Apps to build (not yet implemented)
   * @param {string[]|null} options.platforms - Platforms to build (not yet implemented)
   * @param {boolean} options.clean - Whether to clean dist before build
   * @returns {Promise<void>}
   */
  async build(options = {}) {
    const { clean = true } = options

    // Note: The generateAsssets function currently uses config from package.json
    // and doesn't accept filtering parameters. This is a known limitation.
    // TODO: Update generateAsssets to accept brand/app/platform filters

    if (clean && fs.existsSync('dist')) {
      try {
        fs.rmSync('dist', { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      } catch (error) {
        if (error.code === 'ENOTEMPTY') {
          // Fallback for macOS
          console.warn(
            'Warning: Could not clean dist directory completely. Build will overwrite existing files.'
          )
        } else {
          throw error
        }
      }
    }

    await generateAsssets()
  }

  /**
   * Get build statistics.
   * @returns {Object} Statistics object with counts
   */
  getStats() {
    const stats = {
      brands: this.getBrands().length,
      apps: this.getApps().length,
      combinations: this.getCombinations().length,
      platforms: new Set(Object.values(this.config.build.apps).flat()).size
    }

    // Add source statistics if available
    if (fs.existsSync('source')) {
      stats.sourceAssets = this.countAssets('source')
    }

    // Add dist statistics if available
    if (fs.existsSync('dist')) {
      stats.distAssets = this.countAssets('dist')
    }

    return stats
  }

  /**
   * Count all assets in a directory recursively.
   * @param {string} dirPath - Directory path to count
   * @returns {number} Count of assets
   */
  countAssets(dirPath) {
    let count = 0

    const countRecursive = (dir) => {
      if (!fs.existsSync(dir)) return

      try {
        const items = fs.readdirSync(dir)
        items.forEach((item) => {
          // Skip system files and ignored patterns
          if (shouldIgnoreFile(item)) {
            return
          }

          const itemPath = path.join(dir, item)
          const stat = fs.statSync(itemPath)

          if (stat.isDirectory()) {
            countRecursive(itemPath)
          } else {
            count++
          }
        })
      } catch (error) {
        console.warn(`Warning: Could not count assets in ${dir}: ${error.message}`)
      }
    }

    countRecursive(dirPath)
    return count
  }

  /**
   * Validate configuration and source files.
   * @returns {Object} Validation result with errors and warnings
   */
  validate() {
    const errors = []
    const warnings = []

    // Check required configuration
    if (!this.config) {
      errors.push('No chassis configuration found in package.json')
      return { valid: false, errors, warnings }
    }

    if (!this.config.build) {
      errors.push('No build configuration found')
    }

    if (!this.config.build.brands || this.config.build.brands.length === 0) {
      errors.push('No brands defined')
    }

    if (!this.config.build.apps || Object.keys(this.config.build.apps).length === 0) {
      errors.push('No apps defined')
    }

    // Check source directory structure
    const defaultPath = path.join('source', this.config.defaults?.brandFolder || 'default')
    if (!fs.existsSync(defaultPath)) {
      warnings.push(`Default brand directory not found: ${defaultPath}`)
    }

    // Check for each brand
    this.getBrands().forEach((brand) => {
      this.getApps().forEach((app) => {
        if (!this.assetsExist(brand, app)) {
          warnings.push(`No assets found for ${brand}/${app}`)
        }
      })
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}

export default ChassisAssets
