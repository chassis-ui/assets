import fs from 'fs'
import path from 'path'

// Asset analysis and statistics tool
class AssetAnalyzer {
  constructor() {
    this.stats = {
      totalFiles: 0,
      totalSize: 0,
      fileTypes: {},
      platforms: {},
      brands: {},
      apps: {},
      largestFiles: [],
      duplicates: []
    }
    this.fileHashes = new Map()
  }

  async analyze() {
    console.log('📊 Analyzing Chassis Assets...\n')

    await this.analyzeSource()
    await this.analyzeDist()
    this.printReport()
  }

  async analyzeSource() {
    console.log('🔍 Analyzing source directory...')
    await this.analyzeDirectory('source', 'source')
  }

  async analyzeDist() {
    if (fs.existsSync('dist')) {
      console.log('📦 Analyzing distribution directory...')
      await this.analyzeDirectory('dist', 'dist')
    } else {
      console.log('⚠️  Distribution directory not found. Run `pnpm build` first.')
    }
  }

  async analyzeDirectory(dirPath, type) {
    if (!fs.existsSync(dirPath)) {
      return
    }

    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        await this.analyzeDirectory(itemPath, type)
      } else {
        await this.analyzeFile(itemPath, stat, type)
      }
    }
  }

  async analyzeFile(filePath, stat, type) {
    // Skip system files
    if (path.basename(filePath).startsWith('.')) {
      return
    }

    this.stats.totalFiles++
    this.stats.totalSize += stat.size

    // Track file types
    const ext = path.extname(filePath).toLowerCase()
    this.stats.fileTypes[ext] = (this.stats.fileTypes[ext] || 0) + 1

    // Track platforms (for dist analysis)
    if (type === 'dist') {
      const pathParts = filePath.split(path.sep)
      if (pathParts.length > 1) {
        const platform = pathParts[1]
        this.stats.platforms[platform] = (this.stats.platforms[platform] || 0) + 1

        // Track brands and apps
        if (pathParts.length > 2) {
          const [brand, app] = pathParts[2].split('-')
          this.stats.brands[brand] = (this.stats.brands[brand] || 0) + 1
          this.stats.apps[app] = (this.stats.apps[app] || 0) + 1
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

    // Check for duplicates (basic filename comparison)
    const fileName = path.basename(filePath)
    if (this.fileHashes.has(fileName)) {
      const existing = this.fileHashes.get(fileName)
      if (existing.size === stat.size && existing.path !== filePath) {
        this.stats.duplicates.push({
          file: fileName,
          paths: [existing.path, filePath],
          size: this.formatBytes(stat.size)
        })
      }
    } else {
      this.fileHashes.set(fileName, { path: filePath, size: stat.size })
    }
  }

  printReport() {
    console.log('\n📈 Asset Analysis Report')
    console.log('=' .repeat(50))

    // Overview
    console.log('\n📋 Overview:')
    console.log(`   Total Files: ${this.stats.totalFiles.toLocaleString()}`)
    console.log(`   Total Size: ${this.formatBytes(this.stats.totalSize)}`)
    console.log(`   Average File Size: ${this.formatBytes(this.stats.totalSize / this.stats.totalFiles)}`)

    // File types
    console.log('\n📁 File Types:')
    const sortedTypes = Object.entries(this.stats.fileTypes)
      .sort(([,a], [,b]) => b - a)

    sortedTypes.forEach(([ext, count]) => {
      const percentage = ((count / this.stats.totalFiles) * 100).toFixed(1)
      console.log(`   ${ext || 'no extension'}: ${count} files (${percentage}%)`)
    })

    // Platforms
    if (Object.keys(this.stats.platforms).length > 0) {
      console.log('\n📱 Platform Distribution:')
      Object.entries(this.stats.platforms).forEach(([platform, count]) => {
        console.log(`   ${platform}: ${count} files`)
      })
    }

    // Brands
    if (Object.keys(this.stats.brands).length > 0) {
      console.log('\n🎨 Brand Distribution:')
      Object.entries(this.stats.brands).forEach(([brand, count]) => {
        console.log(`   ${brand}: ${count} files`)
      })
    }

    // Apps
    if (Object.keys(this.stats.apps).length > 0) {
      console.log('\n📲 App Distribution:')
      Object.entries(this.stats.apps).forEach(([app, count]) => {
        console.log(`   ${app}: ${count} files`)
      })
    }

    // Largest files
    console.log('\n📊 Largest Files:')
    this.stats.largestFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.sizeFormatted} - ${file.path}`)
    })

    // Potential duplicates
    if (this.stats.duplicates.length > 0) {
      console.log('\n🔍 Potential Duplicates:')
      this.stats.duplicates.forEach(duplicate => {
        console.log(`   ${duplicate.file} (${duplicate.size}):`)
        duplicate.paths.forEach(duplicatePath => {
          console.log(`     - ${duplicatePath}`)
        })
      })
    }

    // Recommendations
    console.log('\n💡 Recommendations:')
    this.generateRecommendations()
  }

  generateRecommendations() {
    const recommendations = []

    // Check for large files
    const largeSizeThreshold = 1024 * 1024 // 1MB
    const largeFiles = this.stats.largestFiles.filter(file => file.size > largeSizeThreshold)
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
      recommendations.push('High proportion of image files - consider optimization and modern formats')
    }

    // Check for duplicates
    if (this.stats.duplicates.length > 0) {
      recommendations.push(`Found ${this.stats.duplicates.length} potential duplicates - review for optimization`)
    }

    // Platform recommendations
    const platforms = Object.keys(this.stats.platforms)
    if (platforms.includes('web') && !this.stats.fileTypes['.webp']) {
      recommendations.push('Consider using WebP format for web platform images')
    }

    if (recommendations.length === 0) {
      recommendations.push('Asset distribution looks good! No major issues detected.')
    }

    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`)
    })
  }

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
