import fs from 'fs'
import path from 'path'
import ChassisAssets from '../build/api/index.js'
import { shouldIgnoreFile } from '../build/build-assets.js'
import { platformProcessors, extractResolutionIndicator } from '../build/processors/index.js'
import { getValidExtensions, getAllValidExtensions, isMetadataFile } from '../build/asset-types.js'

/**
 * Distribution integrity validator.
 * Checks if dist/ directory is complete.
 */
class DistValidator {
  constructor() {
    this.validationResults = []
    this.api = new ChassisAssets()
    this.errors = []
    this.warnings = []
  }

  /**
   * Run all validation checks.
   * @returns {Promise<void>}
   */
  async runValidation() {
    console.log('🔍 Starting Distribution Validation...\n')

    try {
      await this.checkDistExists()
      await this.checkSourceExists()
      await this.validateAllCombinations()
      await this.validateAssetTypes()
      await this.validateSourceFilesExistInDist()
      await this.validateAssetCounts()
      await this.checkForEmptyDirectories()
      await this.validatePlatformConventions()

      this.printResults()
    } catch (error) {
      console.error('💥 Validation failed:', error.message)
      console.error(error.stack)
      process.exit(1)
    }
  }

  /**
   * Check if dist directory exists.
   * @returns {Promise<void>}
   */
  async checkDistExists() {
    console.log('📁 Checking dist directory...')

    if (!fs.existsSync('dist')) {
      this.addTestResult('Dist Exists', false, 'dist/ directory not found. Run `pnpm build` first.')
      this.addError('dist/ directory does not exist')
      return
    }

    // Check if dist has content
    const distContents = fs.readdirSync('dist')
    const hasContent = distContents.length > 0

    this.addTestResult(
      'Dist Exists',
      hasContent,
      hasContent
        ? `dist/ exists with ${distContents.length} platform directories`
        : 'dist/ exists but is empty'
    )

    if (!hasContent) {
      this.addError('dist/ directory is empty')
    }
  }

  /**
   * Check if source directory exists.
   * @returns {Promise<void>}
   */
  async checkSourceExists() {
    console.log('📂 Checking source directory...')

    if (!fs.existsSync('source')) {
      this.addTestResult('Source Exists', false, 'source/ directory not found')
      this.addError('source/ directory does not exist')
      return
    }

    const sourceContents = fs.readdirSync('source')
    const hasContent = sourceContents.length > 0

    this.addTestResult(
      'Source Exists',
      hasContent,
      hasContent
        ? `source/ exists with ${sourceContents.length} items`
        : 'source/ exists but is empty'
    )

    if (!hasContent) {
      this.addError('source/ directory is empty')
    }
  }

  /**
   * Validate that all expected brand-app-platform combinations exist.
   * @returns {Promise<void>}
   */
  async validateAllCombinations() {
    console.log('🔗 Validating brand-app-platform combinations...')

    const combinations = this.api.getCombinations()
    const platforms = this.api.getAllPlatforms()

    let missingCombos = 0
    let incompleteCombos = 0

    for (const combo of combinations) {
      const distPath = path.join('dist', combo.platform, `${combo.brand}-${combo.app}`)

      if (!fs.existsSync(distPath)) {
        missingCombos++
        this.addError(`Missing: ${combo.platform}/${combo.brand}-${combo.app}`)
      } else {
        // Check if directory has content
        const hasFiles = this.hasFilesRecursive(distPath)
        if (!hasFiles) {
          incompleteCombos++
          this.addWarning(`Empty: ${combo.platform}/${combo.brand}-${combo.app}`)
        }
      }
    }

    const allCombosExist = missingCombos === 0 && incompleteCombos === 0

    this.addTestResult(
      'All Combinations Exist',
      allCombosExist,
      allCombosExist
        ? `All ${combinations.length} combinations present in dist/`
        : `${missingCombos} missing, ${incompleteCombos} empty (expected ${combinations.length} total)`
    )

    if (missingCombos > 0) {
      this.addTestResult(
        'Missing Combinations',
        false,
        `${missingCombos} combinations not found in dist/`
      )
    }

    if (incompleteCombos > 0) {
      this.addTestResult(
        'Empty Combinations',
        false,
        `${incompleteCombos} combinations exist but contain no files`
      )
    }
  }

  /**
   * Validate that expected asset types exist for each combination.
   * @returns {Promise<void>}
   */
  async validateAssetTypes() {
    console.log('📂 Validating asset types per combination...')

    const combinations = this.api.getCombinations()
    const brands = this.api.getBrands()
    const apps = this.api.getApps()

    let missingAssetTypes = 0
    const missingDetails = []

    // For each brand-app, check what asset types exist in source
    for (const brand of brands) {
      for (const app of apps) {
        const sourceAssetTypes = this.getAssetTypesInSource(brand, app)

        if (sourceAssetTypes.length === 0) {
          continue // No source assets for this brand-app
        }

        // Check each platform for this brand-app
        const platformsForApp = this.api.getPlatforms(app)
        for (const platform of platformsForApp) {
          const distPath = path.join('dist', platform, `${brand}-${app}`)

          if (!fs.existsSync(distPath)) {
            continue // Already reported as missing combination
          }

          const distAssetTypes = this.getAssetTypesInDist(distPath)

          // Check if all source asset types exist in dist
          for (const assetType of sourceAssetTypes) {
            if (!distAssetTypes.includes(assetType)) {
              missingAssetTypes++
              const detail = `${platform}/${brand}-${app} missing ${assetType}/`
              missingDetails.push(detail)
              this.addError(detail)
            }
          }
        }
      }
    }

    const allAssetTypesExist = missingAssetTypes === 0

    this.addTestResult(
      'Asset Types Complete',
      allAssetTypesExist,
      allAssetTypesExist
        ? 'All expected asset types present in each combination'
        : `${missingAssetTypes} asset type directories missing`
    )

    if (missingAssetTypes > 0 && missingDetails.length <= 10) {
      missingDetails.forEach((detail) => {
        this.addWarning(`Missing: ${detail}`)
      })
    } else if (missingAssetTypes > 10) {
      this.addWarning(`${missingAssetTypes} asset type directories missing (too many to list)`)
    }
  }

  /**
   * Get asset types (folders) present in source for a brand-app.
   * @param {string} brand - Brand name
   * @param {string} app - App name
   * @returns {string[]} Array of asset type folder names
   */
  getAssetTypesInSource(brand, app) {
    const assetTypes = []
    const defaultBrandFolder = this.api.config.defaults?.brandFolder || 'default'

    // Check brand-specific source first, then fall back to default
    const brandPath = path.join('source', brand, app)
    const defaultPath = path.join('source', defaultBrandFolder, app)

    const sourcePath = fs.existsSync(brandPath)
      ? brandPath
      : fs.existsSync(defaultPath)
        ? defaultPath
        : null

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return assetTypes
    }

    const items = fs.readdirSync(sourcePath)
    for (const item of items) {
      if (shouldIgnoreFile(item)) continue

      const itemPath = path.join(sourcePath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        assetTypes.push(item)
      }
    }

    return assetTypes
  }

  /**
   * Get asset types (folders) present in dist combination.
   * @param {string} distPath - Path to dist combination
   * @returns {string[]} Array of asset type folder names
   */
  getAssetTypesInDist(distPath) {
    const assetTypes = []

    if (!fs.existsSync(distPath)) {
      return assetTypes
    }

    const items = fs.readdirSync(distPath)
    for (const item of items) {
      if (shouldIgnoreFile(item)) continue

      const itemPath = path.join(distPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        assetTypes.push(item)
      }
    }

    return assetTypes
  }

  /**
   * Validate that all source files exist in dist with correct platform naming.
   * @returns {Promise<void>}
   */
  async validateSourceFilesExistInDist() {
    console.log('📄 Validating individual files...')

    const brands = this.api.getBrands()
    const apps = this.api.getApps()
    const defaultBrandFolder = this.api.config.defaults?.brandFolder || 'default'

    let missingFiles = 0
    const missingDetails = []

    for (const brand of brands) {
      for (const app of apps) {
        // Get platforms for this app
        const platforms = this.api.getPlatforms(app)

        // Collect source files from both brand and default folders
        const sourceFiles = this.collectSourceFiles(brand, app, defaultBrandFolder)

        // For each platform, check if files exist in dist
        for (const platform of platforms) {
          const distPath = path.join('dist', platform, `${brand}-${app}`)

          if (!fs.existsSync(distPath)) {
            continue // Already reported as missing combination
          }

          // Check each source file
          for (const sourceFile of sourceFiles) {
            // Skip files that are filtered out by this platform
            if (
              !this.isFileAllowedForPlatform(sourceFile.filename, platform, sourceFile.assetType)
            ) {
              continue
            }

            const transformedName = this.transformFilenameForPlatform(
              sourceFile.filename,
              platform,
              sourceFile.assetType
            )

            const expectedDistPath = path.join(distPath, sourceFile.assetType, transformedName)

            // Android images have special organization
            if (platform === 'android' && sourceFile.assetType === 'images') {
              let androidDistPath

              if (sourceFile.hasResolution) {
                // Images WITH resolution (@2x, @3x) → density folders (drawable-xhdpi, etc.)
                const densityFolder = this.getAndroidDensityFolder(sourceFile.filename)
                androidDistPath = path.join(
                  distPath,
                  sourceFile.assetType,
                  sourceFile.subFolder || '',
                  densityFolder,
                  transformedName
                )
              } else {
                // Images WITHOUT resolution → drawable/ folder
                androidDistPath = path.join(
                  distPath,
                  sourceFile.assetType,
                  sourceFile.subFolder || '',
                  'drawable',
                  transformedName
                )
              }

              if (!fs.existsSync(androidDistPath)) {
                missingFiles++
                const densityOrDrawable = sourceFile.hasResolution
                  ? this.getAndroidDensityFolder(sourceFile.filename)
                  : 'drawable'
                const detail = `${platform}/${brand}-${app}: ${sourceFile.assetType}/${sourceFile.subFolder ? sourceFile.subFolder + '/' : ''}${densityOrDrawable}/${transformedName}`
                if (missingDetails.length < 20) {
                  missingDetails.push(detail)
                  this.addError(detail)
                }
              }
            } else {
              // Standard file location for other platforms (preserve subdirectories)
              const fullDistPath = sourceFile.subFolder
                ? path.join(distPath, sourceFile.assetType, sourceFile.subFolder, transformedName)
                : expectedDistPath

              if (!fs.existsSync(fullDistPath)) {
                missingFiles++
                const detail = `${platform}/${brand}-${app}: ${sourceFile.assetType}/${sourceFile.subFolder ? sourceFile.subFolder + '/' : ''}${transformedName}`
                if (missingDetails.length < 20) {
                  missingDetails.push(detail)
                  this.addError(detail)
                }
              }
            }
          }
        }
      }
    }

    const allFilesExist = missingFiles === 0

    this.addTestResult(
      'All Source Files Present',
      allFilesExist,
      allFilesExist
        ? 'All source files exist in dist with correct platform naming'
        : `${missingFiles} source files missing from dist`
    )

    if (missingFiles > 0) {
      if (missingDetails.length > 0) {
        this.addWarning(`Showing first ${Math.min(missingDetails.length, 20)} missing files:`)
        missingDetails.slice(0, 10).forEach((detail) => {
          this.addWarning(`  - ${detail}`)
        })
        if (missingFiles > 20) {
          this.addWarning(`  ... and ${missingFiles - 20} more`)
        }
      }
    }
  }

  /**
   * Collect all source files for a brand-app combination.
   * @param {string} brand - Brand name
   * @param {string} app - App name
   * @param {string} defaultBrandFolder - Default brand folder name
   * @returns {Array<{filename: string, assetType: string, subFolder: string, hasResolution: boolean}>}
   */
  collectSourceFiles(brand, app, defaultBrandFolder) {
    const files = []

    // Check brand-specific source first
    const brandPath = path.join('source', brand, app)
    const defaultPath = path.join('source', defaultBrandFolder, app)

    // Collect from brand-specific folder (overrides)
    if (fs.existsSync(brandPath)) {
      this.collectFilesRecursive(brandPath, '', files)
    }

    // Collect from default folder (base files)
    if (fs.existsSync(defaultPath)) {
      const defaultFiles = []
      this.collectFilesRecursive(defaultPath, '', defaultFiles)

      // Only add default files that aren't already in brand overrides
      for (const defaultFile of defaultFiles) {
        const alreadyExists = files.some(
          (f) =>
            f.assetType === defaultFile.assetType &&
            f.subFolder === defaultFile.subFolder &&
            f.filename === defaultFile.filename
        )
        if (!alreadyExists) {
          files.push(defaultFile)
        }
      }
    }

    return files
  }

  /**
   * Collect files recursively from a directory.
   * @param {string} dirPath - Directory path
   * @param {string} relativePath - Relative path from asset type folder
   * @param {Array} files - Array to collect files into
   * @param {string} [assetType] - Current asset type folder
   */
  collectFilesRecursive(dirPath, relativePath, files, assetType = null) {
    if (!fs.existsSync(dirPath)) return

    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      if (shouldIgnoreFile(item)) continue

      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        // If we haven't determined asset type yet, this is it
        const newAssetType = assetType || item
        const newRelativePath = assetType ? path.join(relativePath, item) : ''
        this.collectFilesRecursive(itemPath, newRelativePath, files, newAssetType)
      } else if (assetType && this.isAssetFile(item, assetType)) {
        // Only collect asset files (not README, LICENSE, etc.)
        const hasResolution = /@[0-9.]+x/.test(item)
        files.push({
          filename: item,
          assetType,
          subFolder: relativePath,
          hasResolution
        })
      }
    }
  }

  /**
   * Check if a file is an asset file (not metadata/docs).
   * Uses canonical asset type definitions from asset-types module.
   * @param {string} filename - Filename to check
   * @param {string} assetType - Asset type folder
   * @returns {boolean} True if it's an asset file
   */
  isAssetFile(filename, assetType) {
    const ext = path.extname(filename).toLowerCase()

    // Skip metadata/doc files
    if (isMetadataFile(filename)) {
      return false
    }

    // Check against canonical asset type definitions
    const validExtensions = getValidExtensions(assetType)
    if (validExtensions.length > 0) {
      return validExtensions.includes(ext)
    }

    // For unknown asset types, allow any extension defined in asset-types
    return getAllValidExtensions().includes(ext)
  }

  /**
   * Check if a file is allowed for a specific platform based on file type filters.
   * Uses actual processor configurations from build system.
   * @param {string} filename - Filename to check
   * @param {string} platform - Platform name
   * @param {string} assetType - Asset type (fonts, icons, images, etc)
   * @returns {boolean} True if file is allowed for this platform
   */
  isFileAllowedForPlatform(filename, platform, assetType) {
    const ext = path.extname(filename).toLowerCase()
    const processor = platformProcessors[platform]

    if (!processor) {
      // Unknown platform - allow all
      return true
    }

    // Check font format filters
    if (assetType === 'fonts' && processor.allowedFontFormats) {
      return processor.allowedFontFormats.includes(ext)
    }

    // Check icon format filters
    if (assetType === 'icons' && processor.allowedIconFormats) {
      return processor.allowedIconFormats.includes(ext)
    }

    // Check excluded image formats
    if (assetType === 'images' && processor.excludedImageFormats) {
      return !processor.excludedImageFormats.includes(ext)
    }

    // Check general excluded formats
    if (processor.excludedFormats && processor.excludedFormats.length > 0) {
      return !processor.excludedFormats.includes(ext)
    }

    // No restrictions for this asset type on this platform
    return true
  }

  /**
   * Transform filename for platform naming conventions.
   * Uses actual processor renameFile methods from build system.
   * @param {string} filename - Original filename
   * @param {string} platform - Platform name
   * @param {string} assetType - Asset type (icons, images, fonts, etc)
   * @returns {string} Transformed filename
   */
  transformFilenameForPlatform(filename, platform, assetType) {
    const processor = platformProcessors[platform]
    if (!processor || !processor.renameFile) {
      return filename
    }

    // Determine if this is an icon for Android ic_ prefix
    const isIcon = assetType === 'icons'

    // Use processor's renameFile method
    return processor.renameFile(filename, isIcon)
  }

  /**
   * Get Android density folder for resolution indicator.
   * Uses actual Android processor density mapping from build system.
   * @param {string} filename - Filename with resolution indicator
   * @returns {string} Density folder name
   */
  getAndroidDensityFolder(filename) {
    const processor = platformProcessors.android
    if (!processor || !processor.getDensityFolder) {
      return 'drawable-mdpi' // fallback
    }

    // Extract resolution indicator
    const { resolution } = extractResolutionIndicator(filename)

    // Use processor's density mapping
    return processor.getDensityFolder(resolution)
  }

  /**
   * Validate asset counts between source and dist.
   * @returns {Promise<void>}
   */
  async validateAssetCounts() {
    console.log('📊 Validating asset counts...')

    // Count source assets (excluding system files)
    const sourceCount = this.countAssets('source')

    // Count dist assets
    const distCount = this.countAssets('dist')

    // Dist should have more files than source (due to multi-platform expansion)
    const hasDistAssets = distCount > 0
    const hasExpansion = distCount >= sourceCount

    this.addTestResult(
      'Asset Expansion',
      hasExpansion,
      hasExpansion
        ? `Source: ${sourceCount} files → Dist: ${distCount} files (${(distCount / sourceCount).toFixed(1)}x expansion)`
        : `Dist has fewer files (${distCount}) than source (${sourceCount})`
    )

    if (!hasExpansion && hasDistAssets) {
      this.addWarning(`Dist should have more files than source after multi-platform build`)
    }

    if (distCount === 0) {
      this.addError('No assets found in dist/')
    }
  }

  /**
   * Check for empty directories in dist.
   * @returns {Promise<void>}
   */
  async checkForEmptyDirectories() {
    console.log('🗂️  Checking for empty directories...')

    const emptyDirs = []
    const scanDir = (dirPath) => {
      if (!fs.existsSync(dirPath)) return

      const items = fs.readdirSync(dirPath)

      if (items.length === 0) {
        emptyDirs.push(dirPath)
        return
      }

      for (const item of items) {
        const itemPath = path.join(dirPath, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          scanDir(itemPath)
        }
      }
    }

    if (fs.existsSync('dist')) {
      scanDir('dist')
    }

    const noEmptyDirs = emptyDirs.length === 0

    this.addTestResult(
      'No Empty Directories',
      noEmptyDirs,
      noEmptyDirs
        ? 'No empty directories found in dist/'
        : `Found ${emptyDirs.length} empty directories`
    )

    if (!noEmptyDirs) {
      emptyDirs.forEach((dir) => {
        this.addWarning(`Empty directory: ${dir}`)
      })
    }
  }

  /**
   * Validate platform-specific naming conventions.
   * @returns {Promise<void>}
   */
  async validatePlatformConventions() {
    console.log('📝 Validating platform naming conventions...')

    if (!fs.existsSync('dist')) {
      return
    }

    const platforms = this.api.getAllPlatforms()
    const violations = []

    for (const platform of platforms) {
      const platformPath = path.join('dist', platform)
      if (!fs.existsSync(platformPath)) continue

      this.checkPlatformNaming(platformPath, platform, violations)
    }

    const noViolations = violations.length === 0

    this.addTestResult(
      'Platform Naming Conventions',
      noViolations,
      noViolations
        ? 'All files follow platform naming conventions'
        : `Found ${violations.length} naming violations`
    )

    if (!noViolations) {
      violations.slice(0, 5).forEach((violation) => {
        this.addWarning(violation)
      })
      if (violations.length > 5) {
        this.addWarning(`... and ${violations.length - 5} more violations`)
      }
    }
  }

  /**
   * Check naming conventions for a platform.
   * @param {string} dirPath - Directory path
   * @param {string} platform - Platform name
   * @param {string[]} violations - Array to collect violations
   */
  checkPlatformNaming(dirPath, platform, violations) {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      if (shouldIgnoreFile(item)) continue

      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        this.checkPlatformNaming(itemPath, platform, violations)
      } else {
        // Check naming convention
        if (platform === 'web') {
          // Web should use kebab-case
          if (item.includes('_') && !item.startsWith('.')) {
            violations.push(`Web file uses underscores: ${itemPath}`)
          }
        } else if (platform === 'ios' || platform === 'android') {
          // iOS/Android should use snake_case
          const filename = path.parse(item).name
          if (filename.includes('-')) {
            violations.push(`${platform} file uses hyphens: ${itemPath}`)
          }

          // Android icons should have ic_ prefix
          if (
            platform === 'android' &&
            itemPath.includes('/icons/') &&
            !filename.startsWith('ic_')
          ) {
            violations.push(`Android icon missing ic_ prefix: ${itemPath}`)
          }
        }
      }
    }
  }

  /**
   * Check if directory has files recursively.
   * @param {string} dirPath - Directory path
   * @returns {boolean} True if directory contains files
   */
  hasFilesRecursive(dirPath) {
    if (!fs.existsSync(dirPath)) return false

    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      if (shouldIgnoreFile(item)) continue

      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isFile()) {
        return true
      } else if (stat.isDirectory()) {
        if (this.hasFilesRecursive(itemPath)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Count assets in a directory.
   * @param {string} dirPath - Directory path
   * @returns {number} Number of asset files
   */
  countAssets(dirPath) {
    if (!fs.existsSync(dirPath)) return 0

    let count = 0
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      if (shouldIgnoreFile(item)) continue

      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isFile()) {
        count++
      } else if (stat.isDirectory()) {
        count += this.countAssets(itemPath)
      }
    }

    return count
  }

  /**
   * Add a validation result to the results array.
   * @param {string} checkName - Name of the validation check
   * @param {boolean} passed - Whether the check passed
   * @param {string} message - Result message
   */
  addTestResult(checkName, passed, message) {
    this.validationResults.push({ checkName, passed, message })
    const status = passed ? '✅' : '❌'
    console.log(`${status} ${checkName}: ${message}`)
  }

  /**
   * Add an error message.
   * @param {string} message - Error message
   */
  addError(message) {
    this.errors.push(message)
  }

  /**
   * Add a warning message.
   * @param {string} message - Warning message
   */
  addWarning(message) {
    this.warnings.push(message)
  }

  /**
   * Print validation results summary and exit with appropriate code.
   */
  printResults() {
    console.log('\n📊 Validation Results Summary:')
    console.log('='.repeat(50))

    const passed = this.validationResults.filter((r) => r.passed).length
    const total = this.validationResults.length

    this.validationResults.forEach((result) => {
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.checkName}: ${result.message}`)
    })

    console.log('='.repeat(50))
    console.log(`Overall: ${passed}/${total} checks passed`)

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:')
      this.errors.forEach((error) => console.log(`   - ${error}`))
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      this.warnings.forEach((warning) => console.log(`   - ${warning}`))
    }

    if (passed !== total || this.errors.length > 0) {
      console.log('\n💡 Fix issues and run `pnpm build` to regenerate dist/')
      process.exit(1)
    } else if (this.warnings.length > 0) {
      console.log('\n✅ Validation passed with warnings')
    } else {
      console.log('\n✅ Distribution is complete and valid')
    }
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new DistValidator()
  validator.runValidation()
}

export default DistValidator
