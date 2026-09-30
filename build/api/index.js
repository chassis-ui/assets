// Chassis Assets API
// Programmatic interface for asset management

import fs from 'fs'
import path from 'path'
import { generateAssets, shouldIgnoreFile } from '../build-assets.js'

/**
 * ChassisAssets class provides programmatic API for asset management.
 * Handles configuration loading, asset inventory, building, and validation.
 */
export class ChassisAssets {
  /**
   * Create a new ChassisAssets instance.
   * @param {string} configPath - Path to package.json containing chassis configuration,
   *   relative to `options.cwd`
   * @param {{ cwd?: string, out?: string }} [options] - The repository root and the output folder
   */
  constructor(configPath = 'package.json', options = {}) {
    this.cwd = path.resolve(options.cwd || process.cwd())
    this.out = options.out || 'dist'
    this.sourceDir = path.join(this.cwd, 'source')
    this.distDir = path.resolve(this.cwd, this.out)
    this.configPath = path.resolve(this.cwd, configPath)
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
      throw new Error(`Failed to load configuration from ${this.configPath}: ${error.message}`, {
        cause: error
      })
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
    const basePath = type === 'source' ? this.sourceDir : this.distDir

    if (type === 'source') {
      const defaultPath = path.join(basePath, this.config.defaults?.brandFolder || 'default', app)
      const brandPath = path.join(basePath, brand, app)

      return fs.existsSync(defaultPath) || fs.existsSync(brandPath)
    } else {
      // Check dist for specific platform
      const platforms = this.getPlatforms(app)
      return platforms.some((platform) => {
        const distPath = path.join(basePath, platform.split('-')[0], app, brand)
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
      const distPath = path.join(this.distDir, platform.split('-')[0], app, brand)
      if (fs.existsSync(distPath)) {
        searchPaths.push(distPath)
      }
    } else {
      // Look in source
      const defaultPath = path.join(
        this.sourceDir,
        this.config.defaults?.brandFolder || 'default',
        app
      )
      const brandPath = path.join(this.sourceDir, brand, app)

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
   * @param {string|null} [type] - The type folder `dirPath` is in, as the build decides it:
   *   the first folder under the app. Null at the app's root
   */
  catalogAssets(dirPath, inventory, type = null) {
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
          this.catalogAssets(itemPath, inventory, type || item)
        } else {
          const ext = path.extname(item).toLowerCase()
          const category = this.categorizeAsset(ext, dirPath, type)
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
   * Categorize an asset. A file under `fonts/`, `icons/` or `images/` of the app is of that
   * type, and a file under any other folder is `other`, as the build treats them. Without a
   * type folder, the directory name and then the extension decide.
   * @param {string} extension - File extension
   * @param {string} dirPath - Directory path containing the file
   * @param {string|null} [type] - The type folder of the file, the first folder under the app
   * @returns {string} Category name: 'fonts', 'icons', 'images', or 'other'
   */
  categorizeAsset(extension, dirPath, type = null) {
    if (type) {
      return ['fonts', 'icons', 'images'].includes(type) ? type : 'other'
    }

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
   * Build assets programmatically, into the `cwd` and `out` of this instance.
   * @param {Object} options - Build options
   * @param {string[]} [options.brands] - Only these brands
   * @param {string[]} [options.apps] - Only these apps
   * @param {string[]} [options.platforms] - Only these platforms
   * @param {boolean|null} [options.clean] - Whether to clean the output first; null decides by the filters
   * @param {boolean} [options.quiet] - Print errors only
   * @returns {Promise<import('../types.js').BuildStats>} The statistics of the run
   */
  async build(options = {}) {
    const { brands = [], apps = [], platforms = [], clean = null, quiet = false } = options
    return generateAssets({ brands, apps, platforms, clean, quiet, cwd: this.cwd, out: this.out })
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
    if (fs.existsSync(this.sourceDir)) {
      stats.sourceAssets = this.countAssets(this.sourceDir)
    }

    // Add dist statistics if available
    if (fs.existsSync(this.distDir)) {
      stats.distAssets = this.countAssets(this.distDir)
    }

    return stats
  }

  /**
   * Count all assets in a directory recursively.
   * @param {string} dirPath - Directory path to count, relative to `cwd` or absolute
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

    countRecursive(path.resolve(this.cwd, dirPath))
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
      return { valid: false, errors, warnings }
    }

    if (!this.config.build.brands || this.config.build.brands.length === 0) {
      errors.push('No brands defined')
    }

    if (!this.config.build.apps || Object.keys(this.config.build.apps).length === 0) {
      errors.push('No apps defined')
      return { valid: false, errors, warnings }
    }

    // Check source directory structure
    const defaultFolder = path.join('source', this.config.defaults?.brandFolder || 'default')
    if (!fs.existsSync(path.join(this.cwd, defaultFolder))) {
      warnings.push(`Default brand directory not found: ${defaultFolder}`)
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
