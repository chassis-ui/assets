/**
 * Chassis Assets Build System
 *
 * Processes and transforms assets for different platforms (web, iOS, Android)
 * with platform-specific file filtering and naming conventions.
 *
 * @module build-assets
 */

import fs from 'fs'
import path from 'path'
import { platformProcessors } from './processors/index.js'

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'))
const buildConfig = packageJson.chassis.build
const DEFAULT_BRAND_FOLDER = packageJson.chassis.defaults.brandFolder

// Statistics tracking
let stats = {
  filesProcessed: 0,
  filesRenamed: 0,
  directoriesCreated: 0,
  errors: [],
  warnings: []
}

// Quiet mode for tests (suppress verbose output)
let quietMode = false

/**
 * Logger that respects quiet mode
 */
const logger = {
  log: (...args) => !quietMode && console.log(...args),
  warn: (...args) => !quietMode && console.warn(...args),
  error: (...args) => console.error(...args) // Always show errors
}

/**
 * Reset statistics counters
 */
function resetStats() {
  stats = {
    filesProcessed: 0,
    filesRenamed: 0,
    directoriesCreated: 0,
    errors: [],
    warnings: []
  }
}

/**
 * Parse command line arguments for selective builds
 * @returns {Object} Parsed options with brand, apps, and platforms arrays
 */
/**
 * Parse command line arguments for build options.
 * @returns {Object} Parsed options object
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    brand: null,
    apps: [],
    platforms: [],
    clean: null // null = auto-detect, true = force clean, false = no clean
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
    } else if (arg === '--clean') {
      options.clean = true
    } else if (arg === '--no-clean') {
      options.clean = false
    }
  }

  return options
}

/**
 * Validate build configuration from package.json
 * @throws {Error} Exits process if configuration is invalid
 */
function validateConfiguration() {
  const errors = []

  if (!buildConfig.brands || buildConfig.brands.length === 0) {
    errors.push('No brands defined in chassis.build.brands')
  }

  if (!buildConfig.apps || Object.keys(buildConfig.apps).length === 0) {
    errors.push('No apps defined in chassis.build.apps')
  }

  // Check if default brand folder exists
  const defaultPath = path.join('source', DEFAULT_BRAND_FOLDER)
  if (!fs.existsSync(defaultPath)) {
    errors.push(`Default brand folder does not exist: ${defaultPath}`)
  }

  if (errors.length > 0) {
    logger.error('❌ Configuration validation failed:')
    errors.forEach((error) => logger.error(`  - ${error}`))
    process.exit(1)
  }

  logger.log('✅ Configuration validation passed')
}

/**
 * Check if file extension matches allowed list
 * @param {string} fileName - The filename to check
 * @param {string[]} allowedExtensions - Array of allowed extensions (e.g., ['.woff', '.woff2'])
 * @returns {boolean} True if extension is allowed
 */
function hasAllowedExtension(fileName, allowedExtensions) {
  const ext = path.extname(fileName).toLowerCase()
  return allowedExtensions.includes(ext)
}

/**
 * Check if file should be excluded based on extension
 * @param {string} fileName - The filename to check
 * @param {string[]} excludedExtensions - Array of excluded extensions
 * @returns {boolean} True if file should be excluded
 */
function isExcluded(fileName, excludedExtensions) {
  const ext = path.extname(fileName).toLowerCase()
  return excludedExtensions.includes(ext)
}

/**
 * System files and patterns to ignore during copying
 * @type {string[]}
 */
export const IGNORE_PATTERNS = [
  '.DS_Store',
  'Thumbs.db',
  '.gitignore',
  '.gitkeep',
  '.git',
  '.svn',
  '.hg',
  'desktop.ini',
  '._*', // macOS resource forks
  '*~', // Backup files
  '*.swp', // Vim swap files
  '*.tmp',
  '*.temp'
]

/**
 * Check if a file or directory should be ignored
 * @param {string} fileName - The filename or directory name to check
 * @returns {boolean} True if file should be ignored
 */
export function shouldIgnoreFile(fileName) {
  // Check exact matches
  if (
    IGNORE_PATTERNS.some((pattern) => {
      if (!pattern.includes('*')) {
        return fileName === pattern
      }
      // Simple wildcard matching
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$')
      return regex.test(fileName)
    })
  ) {
    return true
  }

  // Check if it's a hidden file (starts with .)
  if (fileName.startsWith('.') && fileName !== '..' && fileName !== '.') {
    return true
  }

  return false
}

/**
 * Remove empty directories recursively
 * @param {string} dirPath - The directory path to clean up
 */
function cleanupEmptyDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return

  const items = fs.readdirSync(dirPath)

  // First, recursively clean up subdirectories
  items.forEach((item) => {
    const itemPath = path.join(dirPath, item)
    if (fs.statSync(itemPath).isDirectory()) {
      cleanupEmptyDirectories(itemPath)
    }
  })

  // Then check if this directory is now empty
  const remainingItems = fs.readdirSync(dirPath)
  if (remainingItems.length === 0) {
    fs.rmdirSync(dirPath)
    logger.log(`🗑️  Removed empty directory: ${path.relative(process.cwd(), dirPath)}`)
  }
}

// Platform Processors

/**
 * Collision detection tracker for renamed files
 */
const collisionTracker = new Map()

/**
 * Track and detect file rename collisions
 * @param {string} destPath - Destination file path
 * @param {string} oldName - Original filename
 * @param {string} newName - New filename after renaming
 * @returns {boolean} True if collision detected
 */
function trackRename(destPath, oldName, newName) {
  const key = path.join(destPath, newName)
  if (collisionTracker.has(key)) {
    const original = collisionTracker.get(key)
    stats.warnings.push(
      `Filename collision: "${oldName}" → "${newName}" (conflicts with "${original}")`
    )
    return true
  }
  collisionTracker.set(key, oldName)
  return false
}

/**
 * Recursively rename files in a directory
 * NOTE: This only operates on the DESTINATION folder (dist/), never touches source files
 * @param {Object} processor - The platform processor with renameFile method
 * @param {string} folderPath - Path to the folder to process (in dist/ folder)
 * @param {string} parentDir - Name of parent directory (for context)
 */
function renameFilesRecursively(processor, folderPath, parentDir = '') {
  if (!fs.existsSync(folderPath)) return

  const items = fs.readdirSync(folderPath)
  const currentDirName = path.basename(folderPath)

  items.forEach((item) => {
    // Skip system files and ignored patterns
    if (shouldIgnoreFile(item)) {
      return
    }

    const itemPath = path.join(folderPath, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      renameFilesRecursively(processor, itemPath, currentDirName)
    } else {
      // Pass directory context to processor for intelligent renaming
      const newName = processor.renameFile
        ? processor.renameFile(item, { currentDir: currentDirName, parentDir: parentDir })
        : item

      if (newName !== item) {
        const newPath = path.join(folderPath, newName)

        // Check for collision (warn but don't block)
        trackRename(folderPath, item, newName)

        // Skip if source file no longer exists (may have been renamed already)
        if (!fs.existsSync(itemPath)) {
          return
        }

        // On case-insensitive filesystems, check if paths resolve to same file
        const isSameFile = itemPath.toLowerCase() === newPath.toLowerCase()

        // If target exists and is a different file, remove it first (allows overwrites)
        if (!isSameFile && fs.existsSync(newPath)) {
          try {
            fs.unlinkSync(newPath)
          } catch {
            // Target might have been removed by another operation, continue
          }
        }

        try {
          fs.renameSync(itemPath, newPath)
          logger.log(`📝 Renamed: ${item} → ${newName}`)
          stats.filesRenamed++
        } catch (error) {
          // File might have been renamed in a previous iteration
          if (error.code !== 'ENOENT') {
            throw error
          }
        }
      }
    }
  })
}

/**
 * Copy files recursively with platform-specific filtering
 * @param {Object} processor - The platform processor with filtering rules
 * @param {string} srcPath - Source path to copy from
 * @param {string} destPath - Destination path to copy to
 * @param {string} dirName - Current directory name
 * @param {string|null} rootDir - Root asset type directory (fonts, images, icons)
 */
function copyFilesWithProcessor(processor, srcPath, destPath, dirName, rootDir = null) {
  if (!fs.existsSync(srcPath)) return

  // Track the root directory (fonts, images, icons, etc.)
  const assetTypes = ['fonts', 'images', 'icons']
  const currentRoot = assetTypes.includes(dirName) ? dirName : rootDir

  const items = fs.readdirSync(srcPath)

  items.forEach((item) => {
    // Skip system files and ignored patterns
    if (shouldIgnoreFile(item)) {
      return
    }

    const itemSrcPath = path.join(srcPath, item)
    const itemDestPath = path.join(destPath, item)
    const stat = fs.statSync(itemSrcPath)

    if (stat.isDirectory()) {
      if (!fs.existsSync(itemDestPath)) {
        fs.mkdirSync(itemDestPath, { recursive: true })
        stats.directoriesCreated++
      }
      copyFilesWithProcessor(processor, itemSrcPath, itemDestPath, item, currentRoot)
    } else {
      // Apply platform-specific filtering
      if (currentRoot === 'fonts' && processor.allowedFontFormats) {
        if (!hasAllowedExtension(item, processor.allowedFontFormats)) {
          return
        }
      } else if (currentRoot === 'images') {
        if (processor.excludedImageFormats && isExcluded(item, processor.excludedImageFormats)) {
          return
        }

        // Use processor-specific image handling if available
        if (processor.processImage && typeof processor.processImage === 'function') {
          const processed = processor.processImage({
            srcPath: itemSrcPath,
            destPath: destPath,
            fileName: item,
            fs: fs,
            path: path,
            stats: stats,
            logger: logger
          })
          if (processed) {
            return
          }
        }
      } else if (currentRoot === 'icons' && processor.allowedIconFormats) {
        if (!hasAllowedExtension(item, processor.allowedIconFormats)) {
          return
        }
      }

      try {
        fs.copyFileSync(itemSrcPath, itemDestPath)
        logger.log(`📄 Copied: ${path.relative(process.cwd(), itemSrcPath)}`)
        stats.filesProcessed++
      } catch (error) {
        const errorMsg = `Failed to copy ${itemSrcPath}: ${error.message}`
        logger.error(`❌ ${errorMsg}`)
        stats.errors.push(errorMsg)
      }
    }
  })
}

/**
 * Process assets for a platform using the processor configuration
 * @param {Object} processor - The platform processor
 * @param {string[]} srcPaths - Array of source paths to process
 * @param {string} destPath - Destination path for processed assets
 * @param {boolean} isDefaultPath - Whether this is the default source path (required)
 */
function processAssets(processor, srcPaths, destPath, defaultAppPath) {
  logger.log(`${processor.icon} Processing ${processor.name} platform...`)

  // Copy files from each source path
  srcPaths.forEach((srcPath) => {
    if (fs.existsSync(srcPath)) {
      copyFilesWithProcessor(processor, srcPath, destPath, path.basename(srcPath))
    } else {
      // Only warn if the default path is missing (brand overrides are optional)
      if (srcPath === defaultAppPath) {
        logger.warn(`⚠️  Default source path not found: ${srcPath}`)
        stats.warnings.push(`Required default assets missing: ${srcPath}`)
        stats.errors.push(`Default source path does not exist: ${srcPath}`)
      }
      // Brand override paths are optional, silently skip if missing
    }
  })

  // Rename all files
  renameFilesRecursively(processor, destPath)

  // Clean up empty directories
  cleanupEmptyDirectories(destPath)
}

// Re-export platform processors for backward compatibility
export { platformProcessors }

/**
 * Main build function - processes assets for all configured platforms
 * @param {Object} options - Build options
 * @param {boolean} options.quiet - Suppress verbose output (for tests)
 * @returns {Promise<void>}
 */
export async function generateAsssets(options = {}) {
  quietMode = options.quiet || false
  logger.log('🚀 Starting Chassis Assets build process...')

  // Reset statistics
  resetStats()
  collisionTracker.clear()

  // Parse command line options
  const cliOptions = parseArgs()

  // Don't overwrite quiet mode if passed as function parameter
  quietMode = options.quiet || false

  // Validate configuration
  validateConfiguration()

  // Determine if we should clean dist directory
  // Auto-detect: Clean only for full builds, keep for selective builds
  const isSelectiveBuild =
    cliOptions.brand || cliOptions.apps.length > 0 || cliOptions.platforms.length > 0
  const shouldClean = cliOptions.clean !== null ? cliOptions.clean : !isSelectiveBuild

  if (shouldClean) {
    logger.log('🧹 Cleaning dist directory for fresh build...')
  } else if (isSelectiveBuild) {
    logger.log('🔄 Incremental build mode - keeping existing dist files')
  }

  // Clean dist directory with retry logic for macOS
  if (shouldClean && fs.existsSync('dist')) {
    try {
      fs.rmSync('dist', { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      logger.log('✅ Cleaned dist directory')
    } catch (error) {
      if (error.code === 'ENOTEMPTY') {
        // Fallback: Remove contents first, then directory
        logger.log('🧹 Cleaning dist directory (retry mode)...')
        try {
          const items = fs.readdirSync('dist')
          items.forEach((item) => {
            const itemPath = path.join('dist', item)
            fs.rmSync(itemPath, { recursive: true, force: true, maxRetries: 3 })
          })
          fs.rmdirSync('dist')
          logger.log('✅ Cleaned dist directory')
        } catch {
          logger.warn('⚠️  Could not fully clean dist directory. Continuing with overwrite...')
        }
      } else {
        throw error
      }
    }
  }

  try {
    logger.log('\n📦 Processing assets...')
    buildConfig.brands.forEach((brand) => {
      // Filter brands if --brand option is provided
      if (cliOptions.brand && brand !== cliOptions.brand) {
        return
      }

      Object.entries(buildConfig.apps).forEach(([app, platforms]) => {
        // Filter apps if --app options are provided
        if (cliOptions.apps.length > 0 && !cliOptions.apps.includes(app)) {
          return
        }

        platforms.forEach((platform) => {
          // Filter platforms if --platform options are provided
          if (cliOptions.platforms.length > 0 && !cliOptions.platforms.includes(platform)) {
            return
          }

          const destPath = `dist/${platform}/${app}/${brand}`

          logger.log(`\n🔨 Processing: ${brand} - ${app} - ${platform}`)
          logger.log(`📁 Output: ${destPath}`)

          // Create destination directory
          fs.mkdirSync(destPath, { recursive: true })
          stats.directoriesCreated++

          // Prepare source paths (default + brand override)
          const defaultAppPath = `source/${DEFAULT_BRAND_FOLDER}/${app}`
          const brandAppPath = `source/${brand}/${app}`

          // Get the platform processor
          const processor = platformProcessors[platform]

          if (!processor) {
            logger.warn(`⚠️  No processor found for platform: ${platform}`)
            return
          }

          // Process with platform-specific processor
          processAssets(processor, [defaultAppPath, brandAppPath], destPath, defaultAppPath)
        })
      })
    })

    // Print summary
    logger.log('\n📊 Build Summary:')
    logger.log(`✅ ${stats.filesProcessed} files processed`)
    logger.log(`📝 ${stats.filesRenamed} files renamed`)
    logger.log(`📁 ${stats.directoriesCreated} directories created`)

    if (stats.warnings.length > 0) {
      logger.log(
        `\n⚠️  ${stats.warnings.length} warning(s):${stats.warnings.length <= 10 ? '' : ' (showing first 10)'}`
      )
      stats.warnings.slice(0, 10).forEach((warning) => logger.log(`   - ${warning}`))
    }

    if (stats.errors.length > 0) {
      logger.log(`\n❌ ${stats.errors.length} error(s) occurred:`)
      stats.errors.forEach((error) => logger.log(`   - ${error}`))
      process.exit(1)
    }

    logger.log('\n🎉 Assets build completed successfully!')
  } catch (error) {
    logger.error('💥 Build failed:', error.message)
    logger.error(error.stack)
    process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAsssets()
}
