/**
 * Chassis Assets Analysis Tool
 *
 * Analyzes asset distribution, file types, sizes, and provides
 * recommendations for optimization.
 *
 * @module analyze-assets
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { shouldIgnoreFile } from './build-assets.js'

/**
 * Asset analyzer for Chassis build system
 */
class AssetAnalyzer {
  constructor(options = {}) {
    this.quiet = options.quiet || false
    this.config = this.loadConfig()
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {},
      platforms: {},
      brands: {},
      apps: {},
      largestFiles: [],
      duplicatesInSource: [], // Duplicates within source folder
      duplicatesInDist: [], // Duplicates within dist folder
      crossDuplicates: [], // Expected: source → dist copies
      filtered: false
    }
    this.fileHashesByLocation = {
      source: new Map(),
      dist: new Map()
    }
    this.options = this.parseArgs()
    this.processedCount = 0
    this.startTime = Date.now()

    // Logger that respects quiet mode
    this.log = (...args) => !this.quiet && console.log(...args)
    this.warn = (...args) => !this.quiet && console.warn(...args)
    this.error = (...args) => console.error(...args) // Always show errors
  }

  /**
   * Run the analysis and generate report
   */
  analyze() {
    try {
      this.log('📊 Analyzing Chassis Assets...\n')

      // Show filtering options if any are specified
      const hasFilters =
        this.options.brand || this.options.apps.length > 0 || this.options.platforms.length > 0
      if (hasFilters) {
        this.log('🔍 Analysis Filters:')
        if (this.options.brand) this.log(`   Brand: ${this.options.brand}`)
        if (this.options.apps.length > 0) this.log(`   Apps: ${this.options.apps.join(', ')}`)
        if (this.options.platforms.length > 0)
          this.log(`   Platforms: ${this.options.platforms.join(', ')}`)
        this.log('')
        this.stats.filtered = true
      }

      this.analyzeSource()
      this.analyzeDist()
      this.detectDuplicates()
      this.printReport()
    } catch (error) {
      this.error('💥 Analysis failed:', error.message)
      this.error(error.stack)
      process.exit(1)
    }
  }

  /**
   * Analyze source directory
   */
  analyzeSource() {
    this.log('🔍 Analyzing source directory...')
    this.analyzeDirectory('source', 'source')
  }

  /**
   * Analyze dist directory if it exists
   */
  analyzeDist() {
    if (fs.existsSync('dist')) {
      this.log('📦 Analyzing distribution directory...')
      this.analyzeDirectory('dist', 'dist')
    } else {
      this.log('⚠️  Distribution directory not found. Run `pnpm build` first.')
    }
  }

  /**
   * Check if a path should be included based on filters
   * @param {string} filePath - Path to check
   * @param {string} type - Type of directory ('source' or 'dist')
   * @returns {boolean} True if path should be included
   */
  shouldIncludePath(filePath, type) {
    // Always include source files (not organized by platform)
    if (type === 'source') {
      return true
    }

    // Check if any filters are applied
    const hasFilters =
      this.options.brand || this.options.apps.length > 0 || this.options.platforms.length > 0

    if (!hasFilters) {
      return true // No filters, include everything
    }

    // Parse dist path: dist/[platform]/[brand]-[app]/...
    const relativePath = path.relative('dist', filePath)
    const pathParts = relativePath.split(path.sep)

    if (pathParts.length < 1) {
      return true // Root level, include
    }

    // Check platform filter
    const platform = pathParts[0]
    if (this.options.platforms.length > 0 && !this.options.platforms.includes(platform)) {
      return false
    }

    // Check brand and app filters (need at least 2 path parts)
    if (pathParts.length >= 2) {
      const brandAppPart = pathParts[1]
      const brandAppMatch = brandAppPart.match(/^([^-]+)-(.+)$/)

      if (brandAppMatch) {
        const [, brand, app] = brandAppMatch

        // Check brand filter
        if (this.options.brand && brand !== this.options.brand) {
          return false
        }

        // Check app filter
        if (this.options.apps.length > 0 && !this.options.apps.includes(app)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Recursively analyze a directory
   * @param {string} dirPath - Directory path to analyze
   * @param {string} type - Type of directory ('source' or 'dist')
   */
  analyzeDirectory(dirPath, type) {
    try {
      if (!fs.existsSync(dirPath)) {
        return
      }

      // Skip directories that don't match filters
      if (!this.shouldIncludePath(dirPath, type)) {
        return
      }

      const items = fs.readdirSync(dirPath)

      for (const item of items) {
        const itemPath = path.join(dirPath, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          this.analyzeDirectory(itemPath, type)
        } else {
          this.analyzeFile(itemPath, stat, type)

          // Show progress for large directories
          this.processedCount++
          if (this.processedCount % 100 === 0) {
            const elapsed = (Date.now() - this.startTime) / 1000
            this.log(`   Processed ${this.processedCount} files... (${elapsed.toFixed(1)}s)`)
          }
        }
      }
    } catch (error) {
      this.warn(`⚠️  Error analyzing directory ${dirPath}:`, error.message)
    }
  }

  /**
   * Analyze a single file
   * @param {string} filePath - Path to the file
   * @param {Object} stat - File stats from fs.statSync
   * @param {string} type - File location ('source' or 'dist')
   */
  analyzeFile(filePath, stat, type) {
    // Skip system files and ignored patterns
    if (shouldIgnoreFile(path.basename(filePath))) {
      return
    }

    // Skip files that don't match filters
    if (!this.shouldIncludePath(filePath, type)) {
      return
    }

    this.stats.totalFiles++
    this.stats.totalSize += stat.size

    // Track file types
    const ext = path.extname(filePath).toLowerCase()
    this.stats.fileTypes[ext] = (this.stats.fileTypes[ext] || 0) + 1

    // Track platforms, brands, and apps (for dist analysis)
    if (type === 'dist') {
      const relativePath = path.relative('dist', filePath)
      const pathParts = relativePath.split(path.sep)

      if (pathParts.length >= 1) {
        // First level is platform (web, ios, android)
        const platform = pathParts[0]
        this.stats.platforms[platform] = (this.stats.platforms[platform] || 0) + 1

        // Second level contains brand-app combinations
        if (pathParts.length >= 2) {
          const brandAppPart = pathParts[1]
          // Parse brand-app format (e.g., "chassis-docs", "test-test")
          const brandAppMatch = brandAppPart.match(/^([^-]+)-(.+)$/)
          if (brandAppMatch) {
            const [, brand, app] = brandAppMatch
            this.stats.brands[brand] = (this.stats.brands[brand] || 0) + 1
            this.stats.apps[app] = (this.stats.apps[app] || 0) + 1
          }
        }
      }
    }

    // Track largest files
    this.stats.largestFiles.push({
      path: filePath,
      size: stat.size,
      sizeFormatted: this.formatBytes(stat.size)
    })

    // Keep only top 10 largest files
    this.stats.largestFiles.sort((a, b) => b.size - a.size)
    if (this.stats.largestFiles.length > 10) {
      this.stats.largestFiles = this.stats.largestFiles.slice(0, 10)
    }

    // Store file hash for duplicate detection (done separately after scan)
    this.storeFileHash(filePath, stat, type)
  }

  /**
   * Store file hash for later duplicate detection
   * @param {string} filePath - Path to the file
   * @param {Object} stat - File stats
   * @param {string} type - File location ('source' or 'dist')
   */
  storeFileHash(filePath, stat, type) {
    try {
      // For large files (>10MB), only hash first and last 1MB for performance
      const maxHashSize = 10 * 1024 * 1024 // 10MB
      let hash

      if (stat.size > maxHashSize) {
        const fd = fs.openSync(filePath, 'r')
        const chunkSize = 1024 * 1024 // 1MB
        const buffer = Buffer.alloc(chunkSize * 2)

        // Read first 1MB
        fs.readSync(fd, buffer, 0, chunkSize, 0)
        // Read last 1MB
        fs.readSync(fd, buffer, chunkSize, chunkSize, Math.max(0, stat.size - chunkSize))
        fs.closeSync(fd)

        hash = crypto.createHash('md5').update(buffer).digest('hex')
      } else {
        const fileContent = fs.readFileSync(filePath)
        hash = crypto.createHash('md5').update(fileContent).digest('hex')
      }

      const hashKey = `${hash}_${stat.size}`
      this.fileHashesByLocation[type].set(hashKey, {
        path: filePath,
        size: stat.size,
        hash: hash
      })
    } catch {
      // Silently skip files that can't be read (permissions, etc.)
    }
  }

  /**
   * Detect duplicates after all files have been scanned
   * Separates real duplicates from expected source→dist copies
   */
  detectDuplicates() {
    // Find duplicates within source directory
    this.findDuplicatesInMap(this.fileHashesByLocation.source, 'duplicatesInSource')

    // Find duplicates within dist directory
    this.findDuplicatesInMap(this.fileHashesByLocation.dist, 'duplicatesInDist')
  }

  /**
   * Find duplicate files within a hash map
   * @param {Map} hashMap - Map of file hashes
   * @param {string} statsKey - Key in stats object to store duplicates
   */
  findDuplicatesInMap(hashMap, statsKey) {
    const hashGroups = new Map()

    // Group files by hash
    for (const [hashKey, fileInfo] of hashMap.entries()) {
      if (!hashGroups.has(hashKey)) {
        hashGroups.set(hashKey, [])
      }
      hashGroups.get(hashKey).push(fileInfo)
    }

    // Find groups with multiple files (duplicates)
    for (const [, files] of hashGroups.entries()) {
      if (files.length > 1) {
        this.stats[statsKey].push({
          file: path.basename(files[0].path),
          paths: files.map((f) => f.path),
          size: this.formatBytes(files[0].size),
          hash: files[0].hash,
          count: files.length
        })
      }
    }
  }

  /**
   * Print analysis report
   */
  printReport() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1)

    this.log(`\n📈 Asset Analysis Report (completed in ${totalTime}s)`)
    this.log('='.repeat(60))

    // Overview
    this.log('\n📋 Overview:')
    this.log(`   Total Files: ${this.stats.totalFiles.toLocaleString()}`)
    this.log(`   Total Size: ${this.formatBytes(this.stats.totalSize)}`)
    this.log(
      `   Average File Size: ${this.formatBytes(this.stats.totalSize / this.stats.totalFiles)}`
    )

    // File types
    this.log('\n📁 File Types:')
    const sortedTypes = Object.entries(this.stats.fileTypes).sort(([, a], [, b]) => b - a)

    sortedTypes.forEach(([ext, count]) => {
      const percentage = ((count / this.stats.totalFiles) * 100).toFixed(1)
      this.log(`   ${ext || 'no extension'}: ${count} files (${percentage}%)`)
    })

    // Platforms
    if (Object.keys(this.stats.platforms).length > 0) {
      this.log('\n📱 Platform Distribution:')
      Object.entries(this.stats.platforms).forEach(([platform, count]) => {
        this.log(`   ${platform}: ${count} files`)
      })
    }

    // Brands
    if (Object.keys(this.stats.brands).length > 0) {
      this.log('\n🎨 Brand Distribution:')
      Object.entries(this.stats.brands).forEach(([brand, count]) => {
        this.log(`   ${brand}: ${count} files`)
      })
    }

    // Apps
    if (Object.keys(this.stats.apps).length > 0) {
      this.log('\n📲 App Distribution:')
      Object.entries(this.stats.apps).forEach(([app, count]) => {
        this.log(`   ${app}: ${count} files`)
      })
    }

    // Largest files
    this.log('\n📊 Largest Files:')
    this.stats.largestFiles.forEach((file, index) => {
      this.log(`   ${index + 1}. ${file.sizeFormatted} - ${file.path}`)
    })

    // Real duplicates (within source or dist, not source→dist copies)
    const totalRealDuplicates =
      this.stats.duplicatesInSource.length + this.stats.duplicatesInDist.length

    if (totalRealDuplicates > 0) {
      this.log('\n🔍 Duplicate Files Found:')

      if (this.stats.duplicatesInSource.length > 0) {
        this.log(`\n   In Source (${this.stats.duplicatesInSource.length} groups):`)
        this.stats.duplicatesInSource.slice(0, 5).forEach((duplicate) => {
          this.log(`   ${duplicate.file} (${duplicate.size}) - ${duplicate.count} copies:`)
          duplicate.paths.slice(0, 3).forEach((duplicatePath) => {
            this.log(`     - ${duplicatePath}`)
          })
          if (duplicate.paths.length > 3) {
            this.log(`     ... and ${duplicate.paths.length - 3} more`)
          }
        })
        if (this.stats.duplicatesInSource.length > 5) {
          const remaining = this.stats.duplicatesInSource.length - 5
          this.log(`   ... and ${remaining} more duplicate groups`)
        }
      }

      if (this.stats.duplicatesInDist.length > 0) {
        this.log(`\n   In Dist (${this.stats.duplicatesInDist.length} groups):`)
        this.stats.duplicatesInDist.slice(0, 5).forEach((duplicate) => {
          this.log(`   ${duplicate.file} (${duplicate.size}) - ${duplicate.count} copies:`)
          duplicate.paths.slice(0, 3).forEach((duplicatePath) => {
            this.log(`     - ${duplicatePath}`)
          })
          if (duplicate.paths.length > 3) {
            this.log(`     ... and ${duplicate.paths.length - 3} more`)
          }
        })
        if (this.stats.duplicatesInDist.length > 5) {
          const remaining = this.stats.duplicatesInDist.length - 5
          this.log(`   ... and ${remaining} more duplicate groups`)
        }
      }
    } else {
      this.log('\n✅ No duplicate files found')
    }

    // Recommendations
    this.log('\n💡 Recommendations:')
    this.generateRecommendations()
  }

  generateRecommendations() {
    const recommendations = []

    // Check for large files
    const largeSizeThreshold = 1024 * 1024 // 1MB
    const largeFiles = this.stats.largestFiles.filter((file) => file.size > largeSizeThreshold)
    if (largeFiles.length > 0) {
      recommendations.push(`Consider optimizing ${largeFiles.length} files larger than 1MB`)
    }

    // Check for many small files
    const totalFiles = this.stats.totalFiles
    if (totalFiles > 500) {
      recommendations.push('Consider consolidating assets or using sprite sheets for icons')
    }

    // Check file type distribution
    const imageTypes = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']
    const imageCount = imageTypes.reduce((sum, ext) => sum + (this.stats.fileTypes[ext] || 0), 0)
    if (imageCount / totalFiles > 0.8) {
      recommendations.push(
        'High proportion of image files - consider optimization and modern formats'
      )
    }

    // Check for duplicates (excluding expected source→dist copies)
    const totalRealDuplicates =
      this.stats.duplicatesInSource.length + this.stats.duplicatesInDist.length
    if (totalRealDuplicates > 0) {
      recommendations.push(
        `Found ${totalRealDuplicates} duplicate file groups - consider consolidating to save space`
      )
    }

    // Platform-specific recommendations
    const platforms = Object.keys(this.stats.platforms)
    if (platforms.includes('web')) {
      if (!this.stats.fileTypes['.webp']) {
        recommendations.push('Consider using WebP format for web platform images')
      }
      if (this.stats.fileTypes['.png'] && !this.stats.fileTypes['.avif']) {
        recommendations.push('Consider using AVIF format for better web compression')
      }
    }

    if (platforms.includes('ios') || platforms.includes('android')) {
      const iconFiles = this.stats.totalFiles * 0.1 // Assume ~10% are icons
      if (iconFiles > 50) {
        recommendations.push(
          'High number of icon files - consider using vector formats or app icon fonts'
        )
      }
    }

    // Build configuration insights
    if (this.config.build) {
      const configuredBrands = this.config.build.brands || []
      const configuredApps = Object.keys(this.config.build.apps || {})
      const actualBrands = Object.keys(this.stats.brands)
      const actualApps = Object.keys(this.stats.apps)

      const missingBrands = configuredBrands.filter((b) => !actualBrands.includes(b))
      const missingApps = configuredApps.filter((a) => !actualApps.includes(a))

      if (missingBrands.length > 0) {
        recommendations.push(`Configured brands not found in analysis: ${missingBrands.join(', ')}`)
      }
      if (missingApps.length > 0) {
        recommendations.push(`Configured apps not found in analysis: ${missingApps.join(', ')}`)
      }
    }

    // Filtering insights
    if (this.stats.filtered) {
      recommendations.push(
        'Analysis was filtered - run without filters for complete asset overview'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('Asset distribution looks good! No major issues detected.')
    }

    recommendations.forEach((rec, index) => {
      this.log(`   ${index + 1}. ${rec}`)
    })
  }

  /**
   * Load configuration from package.json
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
      )
      return packageJson.chassis || {}
    } catch (error) {
      this.warn('⚠️  Could not load package.json configuration:', error.message)
      return {}
    }
  }

  /**
   * Parse command line arguments
   * @returns {Object} Parsed options
   */
  parseArgs() {
    const args = process.argv.slice(2)
    const options = {
      brand: null,
      apps: [],
      platforms: []
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === '--brand') {
        options.brand = args[++i]
      } else if (arg === '--app') {
        while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          options.apps.push(args[++i])
        }
      } else if (arg === '--platform') {
        while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
          options.platforms.push(args[++i])
        }
      }
    }

    return options
  }

  /**
   * Format bytes into human-readable string
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string (e.g., "1.5 MB")
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Run analysis if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new AssetAnalyzer()
  analyzer.analyze()
}

export default AssetAnalyzer
