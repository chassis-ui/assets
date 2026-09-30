/**
 * Chassis Assets Build System
 *
 * Processes and transforms assets for different platforms (web, iOS, Android)
 * with platform-specific file filtering and naming conventions.
 *
 * The module is a library: `generateAssets(options)` takes its options as an object and
 * throws on failure. Only the command-line entry at the bottom reads `process.argv` and
 * calls `process.exit()`.
 *
 * @module build-assets
 */

import fs from 'fs'
import path from 'path'
import { platformProcessors } from './processors/index.js'

/**
 * @typedef {Object} BuildConfig
 * @property {string[]} brands - Brands to build, `chassis.build.brands`
 * @property {Record<string, string[]>} apps - Apps with their platforms, `chassis.build.apps`
 * @property {string} brandFolder - The fallback brand folder, `chassis.defaults.brandFolder`
 * @property {string} [name] - The package name
 * @property {string} [version] - The package version
 */

/**
 * @typedef {Object} BuildOptions
 * @property {string[]} [brands] - Only these brands
 * @property {string[]} [apps] - Only these apps
 * @property {string[]} [platforms] - Only these platforms
 * @property {boolean|null} [clean] - true removes the output first, false keeps it,
 *   null (default) removes it for a full build and keeps it for a filtered one
 * @property {boolean} [quiet] - Print errors only
 * @property {string} [cwd] - The repository root, where `package.json` and `source/` are
 * @property {string} [out] - The output folder, relative to `cwd`. Default `dist`
 * @property {boolean} [dryRun] - Print the jobs and their file counts, write nothing
 * @property {boolean} [allowLfsPointers] - Copy Git LFS pointer files instead of failing
 */

/**
 * @typedef {Object} Job
 * @property {string} brand
 * @property {string} app
 * @property {string} platform
 */

/**
 * @typedef {Object} BuildStats
 * @property {number} filesProcessed
 * @property {number} filesRenamed
 * @property {number} directoriesCreated
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {string[]} lfsPointers - Source files that are Git LFS pointers
 * @property {Array<Job & { files: number }>} jobs
 */

const LFS_POINTER_HEADER = 'version https://git-lfs.github.com/spec/v1'

export const HELP = `Usage: pnpm assets [options]

Builds the assets of every brand, app and platform of \`chassis.build\` in package.json
into dist/<platform>/<app>/<brand>/.

Options:
  --brand <name...>      Only these brands
  --app <name...>        Only these apps
  --platform <name...>   Only these platforms
  --clean                Remove the output first (of the selected jobs when filtered)
  --no-clean             Keep the output even for a full build
  --out <dir>            Output folder, default dist
  --cwd <dir>            Repository root, default the working directory
  --dry-run              Print the jobs and their file counts, write nothing
  --allow-lfs-pointers   Copy Git LFS pointer files instead of failing
                         (also CHASSIS_ALLOW_LFS_POINTERS=1 in the environment)
  --quiet                Print errors only
  --help, -h             Print this help
  --version, -v          Print the version
`

/** The configuration of the run. Set by `generateAssets()`. @type {BuildConfig} */
let config = { brands: [], apps: {}, brandFolder: 'default' }

/** The paths and switches of the run. Set by `generateAssets()`. */
let run = {
  cwd: process.cwd(),
  outDir: path.join(process.cwd(), 'dist'),
  dryRun: false,
  allowLfsPointers: false
}

/** Statistics of the run. @type {BuildStats} */
let stats = emptyStats()

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
 * @returns {BuildStats}
 */
function emptyStats() {
  return {
    filesProcessed: 0,
    filesRenamed: 0,
    directoriesCreated: 0,
    errors: [],
    warnings: [],
    lfsPointers: [],
    jobs: []
  }
}

/**
 * Read the `chassis` configuration of the `package.json` in `cwd`.
 * @param {string} [cwd] - The repository root. Default: the working directory
 * @returns {BuildConfig}
 */
export function loadConfig(cwd = process.cwd()) {
  const file = path.join(cwd, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(file, 'utf-8'))
  const chassis = packageJson.chassis || {}
  return {
    brands: chassis.build?.brands || [],
    apps: chassis.build?.apps || {},
    brandFolder: chassis.defaults?.brandFolder || 'default',
    name: packageJson.name,
    version: packageJson.version
  }
}

/**
 * Parse command line arguments.
 * `--brand`, `--app` and `--platform` each take one or more values.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 * @returns {BuildOptions & { help: boolean, version: boolean }}
 * @throws {Error} On an unknown option
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    brands: [],
    apps: [],
    platforms: [],
    clean: null, // null = auto-detect, true = force clean, false = no clean
    quiet: false,
    cwd: undefined,
    out: undefined,
    dryRun: false,
    allowLfsPointers: false,
    help: false,
    version: false
  }

  /** @param {number} i */
  const values = (i) => {
    const list = []
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      list.push(argv[++i])
    }
    return { list, i }
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--brand' || arg === '--app' || arg === '--platform') {
      const key = { '--brand': 'brands', '--app': 'apps', '--platform': 'platforms' }[arg]
      const parsed = values(i)
      if (parsed.list.length === 0) throw new Error(`${arg} needs at least one value`)
      options[key].push(...parsed.list)
      i = parsed.i
    } else if (arg === '--out' || arg === '--cwd') {
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value`)
      options[arg.slice(2)] = value
      i++
    } else if (arg === '--clean') {
      options.clean = true
    } else if (arg === '--no-clean') {
      options.clean = false
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--allow-lfs-pointers') {
      options.allowLfsPointers = true
    } else if (arg === '--quiet') {
      options.quiet = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--version' || arg === '-v') {
      options.version = true
    } else {
      throw new Error(`Unknown option ${arg}. Run with --help for the options.`)
    }
  }

  return options
}

/**
 * Check the configuration and the source folder.
 * @throws {Error} When brands or apps are missing, or the default brand folder does not exist
 */
function validateConfiguration() {
  const errors = []

  if (!config.brands || config.brands.length === 0) {
    errors.push('No brands defined in chassis.build.brands')
  }

  if (!config.apps || Object.keys(config.apps).length === 0) {
    errors.push('No apps defined in chassis.build.apps')
  }

  const defaultPath = path.join(run.cwd, 'source', config.brandFolder)
  if (!fs.existsSync(defaultPath)) {
    errors.push(`Default brand folder does not exist: ${path.relative(run.cwd, defaultPath)}`)
  }

  for (const [app, platforms] of Object.entries(config.apps)) {
    for (const platform of platforms) {
      if (!platformProcessors[platform]) {
        errors.push(
          `No processor for platform "${platform}" of app "${app}". Known: ${Object.keys(platformProcessors).join(', ')}`
        )
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n  - ${errors.join('\n  - ')}`)
  }

  logger.log('✅ Configuration validation passed')
}

/**
 * The jobs a configuration and a set of filters select.
 * A filter value that is not configured, or filters that select nothing, are errors.
 * @param {BuildConfig} config
 * @param {{ brands?: string[], apps?: string[], platforms?: string[] }} filters
 * @returns {Job[]}
 * @throws {Error}
 */
export function planJobs(config, filters = {}) {
  const brands = filters.brands || []
  const apps = filters.apps || []
  const platforms = filters.platforms || []
  const knownPlatforms = [...new Set(Object.values(config.apps).flat())]

  /**
   * @param {string[]} given
   * @param {string[]} known
   * @param {string} what
   */
  const check = (given, known, what) => {
    const unknown = given.filter((value) => !known.includes(value))
    if (unknown.length > 0) {
      throw new Error(
        `Unknown ${what} ${unknown.map((u) => `"${u}"`).join(', ')}. Configured: ${known.join(', ')}`
      )
    }
  }
  check(brands, config.brands, brands.length > 1 ? 'brands' : 'brand')
  check(apps, Object.keys(config.apps), apps.length > 1 ? 'apps' : 'app')
  check(platforms, knownPlatforms, platforms.length > 1 ? 'platforms' : 'platform')

  /** @type {Job[]} */
  const jobs = []
  for (const brand of config.brands) {
    if (brands.length > 0 && !brands.includes(brand)) continue
    for (const [app, appPlatforms] of Object.entries(config.apps)) {
      if (apps.length > 0 && !apps.includes(app)) continue
      for (const platform of appPlatforms) {
        if (platforms.length > 0 && !platforms.includes(platform)) continue
        jobs.push({ brand, app, platform })
      }
    }
  }

  if (jobs.length === 0) {
    throw new Error('The filters select no job. Check --brand, --app and --platform together.')
  }

  return jobs
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
 * Whether a file is a Git LFS pointer instead of the file it stands for.
 * A pointer is a small text file that starts with the LFS spec line.
 * @param {string} filePath
 * @param {fs.Stats} [stat]
 * @returns {boolean}
 */
export function isLfsPointer(filePath, stat = fs.statSync(filePath)) {
  if (stat.size === 0 || stat.size > 1024) return false
  const fd = fs.openSync(filePath, 'r')
  try {
    const buffer = Buffer.alloc(LFS_POINTER_HEADER.length)
    const read = fs.readSync(fd, buffer, 0, buffer.length, 0)
    return buffer.toString('utf-8', 0, read) === LFS_POINTER_HEADER
  } finally {
    fs.closeSync(fd)
  }
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
    logger.log(`🗑️  Removed empty directory: ${path.relative(run.cwd, dirPath)}`)
  }
}

/**
 * Remove a folder, with a retry for the ENOTEMPTY that macOS raises while the Finder or
 * Dropbox watch the folder.
 * @param {string} dirPath
 */
function removeDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return
  try {
    fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    logger.log(`✅ Cleaned ${path.relative(run.cwd, dirPath) || '.'}`)
  } catch (error) {
    if (error.code === 'ENOTEMPTY') {
      // Fallback: Remove contents first, then directory
      logger.log(`🧹 Cleaning ${path.relative(run.cwd, dirPath)} (retry mode)...`)
      try {
        const items = fs.readdirSync(dirPath)
        items.forEach((item) => {
          const itemPath = path.join(dirPath, item)
          fs.rmSync(itemPath, { recursive: true, force: true, maxRetries: 3 })
        })
        fs.rmdirSync(dirPath)
        logger.log(`✅ Cleaned ${path.relative(run.cwd, dirPath)}`)
      } catch {
        logger.warn('⚠️  Could not fully clean the output folder. Continuing with overwrite...')
      }
    } else {
      throw error
    }
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
    if (shouldIgnoreFile(item)) {
      return
    }

    const itemPath = path.join(folderPath, item)
    const stat = fs.statSync(itemPath)

    if (stat.isDirectory()) {
      renameFilesRecursively(processor, itemPath, currentDirName)
    } else {
      const newName = processor.renameFile
        ? processor.renameFile(item, { currentDir: currentDirName, parentDir: parentDir })
        : item

      if (newName !== item) {
        const newPath = path.join(folderPath, newName)

        // Check for collision (warn but don't block)
        trackRename(folderPath, item, newName)

        // The file may already have been renamed by an earlier operation
        if (!fs.existsSync(itemPath)) {
          return
        }

        const isSameFile = itemPath.toLowerCase() === newPath.toLowerCase()

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
      if (!run.dryRun && !fs.existsSync(itemDestPath)) {
        fs.mkdirSync(itemDestPath, { recursive: true })
        stats.directoriesCreated++
      }
      copyFilesWithProcessor(processor, itemSrcPath, itemDestPath, item, currentRoot)
      return
    }

    // Apply platform-specific filtering
    if (currentRoot === 'fonts' && processor.allowedFontFormats) {
      if (!hasAllowedExtension(item, processor.allowedFontFormats)) {
        return
      }
    } else if (currentRoot === 'images') {
      if (processor.excludedImageFormats && isExcluded(item, processor.excludedImageFormats)) {
        return
      }
    } else if (currentRoot === 'icons' && processor.allowedIconFormats) {
      if (!hasAllowedExtension(item, processor.allowedIconFormats)) {
        return
      }
    }

    // A Git LFS pointer is not the file. Fail, unless told to copy it.
    if (!run.allowLfsPointers && isLfsPointer(itemSrcPath, stat)) {
      stats.lfsPointers.push(path.relative(run.cwd, itemSrcPath))
      return
    }

    if (run.dryRun) {
      stats.filesProcessed++
      return
    }

    // Use processor-specific image handling if available
    if (
      currentRoot === 'images' &&
      processor.processImage &&
      typeof processor.processImage === 'function'
    ) {
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

    try {
      fs.copyFileSync(itemSrcPath, itemDestPath)
      logger.log(`📄 Copied: ${path.relative(run.cwd, itemSrcPath)}`)
      stats.filesProcessed++
    } catch (error) {
      const errorMsg = `Failed to copy ${itemSrcPath}: ${error.message}`
      logger.error(`❌ ${errorMsg}`)
      stats.errors.push(errorMsg)
    }
  })
}

/**
 * Process assets for a platform using the processor configuration
 * @param {Object} processor - The platform processor
 * @param {string[]} srcPaths - Array of source paths to process
 * @param {string} destPath - Destination path for processed assets
 * @param {string} defaultAppPath - The default source path (required)
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
        const relative = path.relative(run.cwd, srcPath)
        logger.warn(`⚠️  Default source path not found: ${relative}`)
        stats.warnings.push(`Required default assets missing: ${relative}`)
        stats.errors.push(`Default source path does not exist: ${relative}`)
      }
      // Brand override paths are optional, silently skip if missing
    }
  })

  if (run.dryRun) return

  // Rename all files
  renameFilesRecursively(processor, destPath)

  // Clean up empty directories
  cleanupEmptyDirectories(destPath)
}

// Re-export platform processors for backward compatibility
export { platformProcessors }

/**
 * Main build function - processes assets for all configured platforms
 * @param {BuildOptions} options - Build options
 * @returns {Promise<BuildStats>} The statistics of the run
 * @throws {Error} On a bad configuration, a bad filter, or a job that failed
 */
export async function generateAssets(options = {}) {
  quietMode = options.quiet || false
  logger.log('🚀 Starting Chassis Assets build process...')

  // Reset the state of the run
  stats = emptyStats()
  collisionTracker.clear()
  const cwd = path.resolve(options.cwd || process.cwd())
  run = {
    cwd,
    outDir: path.resolve(cwd, options.out || 'dist'),
    dryRun: options.dryRun || false,
    allowLfsPointers: options.allowLfsPointers || process.env.CHASSIS_ALLOW_LFS_POINTERS === '1'
  }
  config = loadConfig(cwd)

  // Validate configuration
  validateConfiguration()

  const filters = {
    brands: options.brands || [],
    apps: options.apps || [],
    platforms: options.platforms || []
  }
  const jobs = planJobs(config, filters)

  // Determine if we should clean the output
  // Auto-detect: Clean only for full builds, keep for selective builds
  const isSelectiveBuild =
    filters.brands.length > 0 || filters.apps.length > 0 || filters.platforms.length > 0
  const clean = options.clean === undefined ? null : options.clean
  const shouldClean = clean !== null ? clean : !isSelectiveBuild

  /** @param {Job} job */
  const jobDir = (job) => path.join(run.outDir, job.platform, job.app, job.brand)

  if (run.dryRun) {
    logger.log('🔍 Dry run: nothing is written')
  } else if (shouldClean && !isSelectiveBuild) {
    logger.log('🧹 Cleaning the output folder for a fresh build...')
    removeDirectory(run.outDir)
  } else if (shouldClean) {
    logger.log('🧹 Cleaning the output of the selected jobs...')
    jobs.forEach((job) => removeDirectory(jobDir(job)))
  } else if (isSelectiveBuild) {
    logger.log('🔄 Incremental build mode - keeping existing output files')
  }

  logger.log('\n📦 Processing assets...')
  for (const job of jobs) {
    const { brand, app, platform } = job
    const destPath = jobDir(job)

    logger.log(`\n🔨 Processing: ${brand} - ${app} - ${platform}`)
    logger.log(`📁 Output: ${path.relative(run.cwd, destPath)}`)

    if (!run.dryRun) {
      fs.mkdirSync(destPath, { recursive: true })
      stats.directoriesCreated++
    }

    // Prepare source paths (default + brand override)
    const defaultAppPath = path.join(run.cwd, 'source', config.brandFolder, app)
    const brandAppPath = path.join(run.cwd, 'source', brand, app)

    const processor = platformProcessors[platform]
    const before = stats.filesProcessed
    processAssets(processor, [defaultAppPath, brandAppPath], destPath, defaultAppPath)
    stats.jobs.push({ ...job, files: stats.filesProcessed - before })
  }

  // Print summary
  if (run.dryRun) {
    logger.log('\n📊 Jobs:')
    stats.jobs.forEach((job) =>
      logger.log(
        `   ${job.brand} - ${job.app} - ${job.platform}: ${job.files} files → ${path.relative(run.cwd, jobDir(job))}`
      )
    )
    logger.log(`\n${stats.filesProcessed} files in ${stats.jobs.length} jobs`)
  } else {
    logger.log('\n📊 Build Summary:')
    logger.log(`✅ ${stats.filesProcessed} files processed`)
    logger.log(`📝 ${stats.filesRenamed} files renamed`)
    logger.log(`📁 ${stats.directoriesCreated} directories created`)
  }

  if (stats.warnings.length > 0) {
    logger.log(
      `\n⚠️  ${stats.warnings.length} warning(s):${stats.warnings.length <= 10 ? '' : ' (showing first 10)'}`
    )
    stats.warnings.slice(0, 10).forEach((warning) => logger.log(`   - ${warning}`))
  }

  if (stats.lfsPointers.length > 0) {
    const first = stats.lfsPointers.slice(0, 3).join(', ')
    stats.errors.unshift(
      `${stats.lfsPointers.length} source file(s) are Git LFS pointers, not files: ${first}${stats.lfsPointers.length > 3 ? ', …' : ''}. Run \`git lfs pull\`, or pass --allow-lfs-pointers to copy the pointers.`
    )
  }

  if (stats.errors.length > 0) {
    const shown = stats.errors.slice(0, 20)
    const more =
      stats.errors.length > shown.length
        ? `\n  … and ${stats.errors.length - shown.length} more`
        : ''
    throw new Error(`${stats.errors.length} error(s) occurred:\n  - ${shown.join('\n  - ')}${more}`)
  }

  logger.log(run.dryRun ? '\n🎉 Dry run completed.' : '\n🎉 Assets build completed successfully!')
  return stats
}

// Only run if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  let options
  try {
    options = parseArgs()
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(2)
  }
  if (options.help) {
    console.log(HELP)
    process.exit(0)
  }
  if (options.version) {
    console.log(loadConfig(options.cwd ? path.resolve(options.cwd) : process.cwd()).version)
    process.exit(0)
  }
  generateAssets(options).catch((error) => {
    console.error(`💥 Build failed: ${error.message}`)
    if (process.env.DEBUG) console.error(error.stack)
    process.exit(1)
  })
}
