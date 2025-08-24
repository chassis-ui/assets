// Chassis Assets API
// Programmatic interface for asset management

import fs from 'fs'
import path from 'path'
import { generateAsssets } from './copy-assets.js'

export class ChassisAssets {
  constructor(configPath = 'package.json') {
    this.configPath = configPath
    this.loadConfig()
  }

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

  // Get all available brands
  getBrands() {
    return this.config.build.brands || []
  }

  // Get all available apps
  getApps() {
    return Object.keys(this.config.build.apps || {})
  }

  // Get platforms for a specific app
  getPlatforms(appName) {
    return this.config.build.apps[appName] || []
  }

  // Get all brand-app-platform combinations
  getCombinations() {
    const combinations = []

    this.getBrands().forEach(brand => {
      this.getApps().forEach(app => {
        this.getPlatforms(app).forEach(platform => {
          combinations.push({ brand, app, platform })
        })
      })
    })

    return combinations
  }

  // Check if assets exist for a combination
  assetsExist(brand, app, type = 'source') {
    const basePath = type === 'source' ? 'source' : 'dist'

    if (type === 'source') {
      const defaultPath = path.join(basePath, this.config.defaults.brandFolder, app)
      const brandPath = path.join(basePath, brand, app)

      return fs.existsSync(defaultPath) || fs.existsSync(brandPath)
    } else {
      // Check dist for specific platform
      const platforms = this.getPlatforms(app)
      return platforms.some(platform => {
        const distPath = path.join(basePath, platform.split('-')[0], `${brand}-${app}`)
        return fs.existsSync(distPath)
      })
    }
  }

  // Get asset inventory for a specific combination
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

    searchPaths.forEach(searchPath => {
      this.catalogAssets(searchPath, inventory)
    })

    return inventory
  }

  catalogAssets(dirPath, inventory) {
    if (!fs.existsSync(dirPath)) return

    const items = fs.readdirSync(dirPath)

    items.forEach(item => {
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
  }

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

  // Build assets programmatically
  async build(options = {}) {
    const {
      brands = this.getBrands(),
      apps = this.getApps(),
      platforms = null, // null means use config defaults
      clean = true
    } = options

    if (clean && fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true })
    }

    // Temporarily override config if needed
    const originalConfig = { ...this.config.build }

    if (brands !== this.getBrands()) {
      this.config.build.brands = brands
    }

    if (platforms) {
      // Override platform configuration
      const newApps = {}
      apps.forEach(app => {
        newApps[app] = platforms
      })
      this.config.build.apps = newApps
    }

    try {
      await generateAsssets()
    } finally {
      // Restore original config
      this.config.build = originalConfig
    }
  }

  // Get build statistics
  getStats() {
    const stats = {
      brands: this.getBrands().length,
      apps: this.getApps().length,
      combinations: this.getCombinations().length,
      platforms: new Set(
        Object.values(this.config.build.apps).flat()
      ).size
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

  countAssets(dirPath) {
    let count = 0

    const countRecursive = (dir) => {
      if (!fs.existsSync(dir)) return

      const items = fs.readdirSync(dir)
      items.forEach(item => {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          countRecursive(itemPath)
        } else if (!item.startsWith('.')) {
          count++
        }
      })
    }

    countRecursive(dirPath)
    return count
  }

  // Validate configuration
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
    this.getBrands().forEach(brand => {
      this.getApps().forEach(app => {
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
