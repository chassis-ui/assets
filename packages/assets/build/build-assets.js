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
import { writeCatalog } from './asset-catalog.js'
import { createFileFilter } from './filters.js'
import { IMAGE_FORMATS, loadEncoders, optimizeJob, resolveSettings } from './optimize.js'
import { platformProcessors } from './processors/index.js'
import { writeRes } from './res-layout.js'
import { buildVersion, findRoot, isEntry, resolveRoot } from './root.js'
import { loadSubsetter, resolveSubset, subsetJob } from './subset-fonts.js'
import { convertFolder, loadConverter } from './vector-drawables.js'

/** @import { BuildConfig, BuildOptions, BuildStats, ContractEntry, Job, LintAllowance, Processor } from './types.js' */

const LFS_POINTER_HEADER = 'version https://git-lfs.github.com/spec/v1'

export const HELP = `Usage: pnpm assets [options]

Builds the assets of every brand, app and platform of \`chassis.build\` in package.json
into dist/<platform>/<app>/<brand>/.

Options:
  --brand <name...>      Only these brands
  --app <name...>        Only these apps
  --platform <name...>   Only these platforms
  --type <name...>       Only these type folders, such as images and icons
  --include <pattern...> Only the files that match a pattern, by their path in the
                         folder of the app, such as "images/home/**". \`pnpm assets:lfs\`
                         prints the Git LFS paths of the same filters
  --clean                Remove the output first (of the selected jobs when filtered)
  --no-clean             Keep the output even for a full build
  --out <dir>            Output folder, default dist
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --watch                Build, then build the jobs of a brand and an app again when a
                         file of theirs under source/ changes
  --dry-run              Print the jobs and their file counts, write nothing
  --allow-lfs-pointers   Copy Git LFS pointer files instead of failing
                         (also CHASSIS_ALLOW_LFS_POINTERS=1 in the environment)
  --vector-drawables     Write the SVG icons of Android as vector drawables, .xml in
                         place of .svg. Needs \`pnpm install\`
  --asset-catalog        Write the images of iOS as an asset catalog, Assets.xcassets
                         in place of images/
  --optimize             Write the images again under their names where that makes them
                         smaller, with the settings of \`chassis.optimize\`. Needs
                         \`pnpm install\`
  --webp                 Write the PNG and JPEG images as WebP too: beside the file on
                         the web, in place of it on Android. Needs \`pnpm install\`
  --avif                 Write the PNG and JPEG images of the web as AVIF too. Needs
                         \`pnpm install\`
  --res                  Write the fonts, images and icons of Android as a res/ folder,
                         res/font/ and res/drawable*/
  --subset [range...]    Write the WOFF and WOFF2 fonts of the web again under their
                         names with the characters of the ranges only, such as latin
                         or U+0370-03FF. Default: \`chassis.subset\`, or latin and
                         latin-ext. Needs \`pnpm install\`
  --quiet                Print errors only
  --help, -h             Print this help
  --version, -v          Print the version
`

/** The configuration of the run. Set by `generateAssets()`. @type {BuildConfig} */
let config = { brands: [], apps: {}, brandFolder: 'default', contracts: [], lintAllow: [] }

/** The paths and switches of the run. Set by `generateAssets()`. */
let run = {
  cwd: process.cwd(),
  outDir: path.join(process.cwd(), 'dist'),
  dryRun: false,
  allowLfsPointers: false,
  vectorDrawables: false,
  assetCatalog: false,
  res: false,
  optimize: false,
  formats: /** @type {string[]} */ ([]),
  subset: false,
  filter: createFileFilter()
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
    filesConverted: 0,
    imageSets: 0,
    resourceFiles: 0,
    filesOptimized: 0,
    bytesSaved: 0,
    filesGenerated: 0,
    fontsSubsetted: 0,
    fontBytesSaved: 0,
    errors: [],
    warnings: [],
    lfsPointers: [],
    jobs: []
  }
}

/** The file of the data that the checks read, beside `package.json`. Optional. */
export const CHECKS_FILE = 'chassis.checks.json'

/**
 * Read `chassis.checks.json` in `cwd`: the consumer contracts, by job, and the names the
 * source lint keeps. The build does not read them; `contract.js` and `lint-source.js` do.
 * @param {string} cwd - The repository root
 * @returns {{ contracts: ContractEntry[], lintAllow: LintAllowance[] }} Both empty when
 *   there is no file
 * @throws {Error} When the file is not JSON, or `contracts` is not an object of lists
 */
function loadChecks(cwd) {
  const file = path.join(cwd, CHECKS_FILE)
  if (!fs.existsSync(file)) return { contracts: [], lintAllow: [] }
  let checks
  try {
    checks = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (error) {
    throw new Error(`${CHECKS_FILE} is not valid JSON: ${/** @type {Error} */ (error).message}`, {
      cause: error
    })
  }
  const byJob = checks.contracts ?? {}
  if (
    typeof byJob !== 'object' ||
    Array.isArray(byJob) ||
    Object.values(byJob).some((entries) => !Array.isArray(entries))
  ) {
    throw new Error(
      `"contracts" of ${CHECKS_FILE} is an object with a list of contracts for each job, "<platform>/<app>/<brand>": [ … ]`
    )
  }
  return {
    contracts: Object.entries(byJob).flatMap(([job, entries]) =>
      /** @type {Omit<ContractEntry, 'job'>[]} */ (entries).map((entry) => ({ ...entry, job }))
    ),
    lintAllow: checks.lint?.allow || []
  }
}

/**
 * Read the `chassis` configuration of the `package.json` in `cwd`, and the data of the
 * checks in `chassis.checks.json` beside it.
 * @param {string} [cwd] - The repository root. Default: `findRoot()`
 * @returns {BuildConfig}
 */
export function loadConfig(cwd = findRoot()) {
  const file = path.join(cwd, 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(file, 'utf-8'))
  const chassis = packageJson.chassis || {}
  const checks = loadChecks(cwd)
  return {
    brands: chassis.build?.brands || [],
    apps: chassis.build?.apps || {},
    brandFolder: chassis.defaults?.brandFolder || 'default',
    optimize: chassis.optimize,
    subset: chassis.subset,
    contracts: checks.contracts,
    lintAllow: checks.lintAllow,
    name: packageJson.name,
    version: packageJson.version
  }
}

/**
 * Parse command line arguments.
 * `--brand`, `--app` and `--platform` each take one or more values.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 * @returns {BuildOptions & { watch: boolean, help: boolean, version: boolean }}
 * @throws {Error} On an unknown option
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    brands: [],
    apps: [],
    platforms: [],
    types: [],
    include: [],
    clean: null, // null = auto-detect, true = force clean, false = no clean
    quiet: false,
    cwd: undefined,
    out: undefined,
    dryRun: false,
    watch: false,
    allowLfsPointers: false,
    vectorDrawables: false,
    assetCatalog: false,
    res: false,
    optimize: false,
    webp: false,
    avif: false,
    subset: /** @type {boolean|string[]} */ (false),
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
    if (['--brand', '--app', '--platform', '--type', '--include'].includes(arg)) {
      const key = {
        '--brand': 'brands',
        '--app': 'apps',
        '--platform': 'platforms',
        '--type': 'types',
        '--include': 'include'
      }[arg]
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
    } else if (arg === '--watch') {
      options.watch = true
    } else if (arg === '--allow-lfs-pointers') {
      options.allowLfsPointers = true
    } else if (arg === '--vector-drawables') {
      options.vectorDrawables = true
    } else if (arg === '--asset-catalog') {
      options.assetCatalog = true
    } else if (arg === '--res') {
      options.res = true
    } else if (arg === '--optimize') {
      options.optimize = true
    } else if (arg === '--webp') {
      options.webp = true
    } else if (arg === '--avif') {
      options.avif = true
    } else if (arg === '--subset') {
      // Without a value the ranges are those of the configuration
      const parsed = values(i)
      options.subset = parsed.list.length > 0 ? parsed.list : true
      i = parsed.i
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
export function hasAllowedExtension(fileName, allowedExtensions) {
  const ext = path.extname(fileName).toLowerCase()
  return allowedExtensions.includes(ext)
}

/**
 * Check if file should be excluded based on extension
 * @param {string} fileName - The filename to check
 * @param {string[]} excludedExtensions - Array of excluded extensions
 * @returns {boolean} True if file should be excluded
 */
export function isExcluded(fileName, excludedExtensions) {
  const ext = path.extname(fileName).toLowerCase()
  return excludedExtensions.includes(ext)
}

/**
 * Whether a platform keeps a file of a type. `fonts` and `icons` keep the formats the
 * processor allows, `images` drop the formats it excludes, and any other type keeps every
 * file.
 * @param {Processor} processor - The platform processor
 * @param {string|null} type - The type folder the file is under: fonts, images, icons or another
 * @param {string} fileName
 * @returns {boolean}
 */
export function keepsFile(processor, type, fileName) {
  if (type === 'fonts' && processor.allowedFontFormats) {
    return hasAllowedExtension(fileName, processor.allowedFontFormats)
  }
  if (type === 'images' && processor.excludedImageFormats) {
    return !isExcluded(fileName, processor.excludedImageFormats)
  }
  if (type === 'icons' && processor.allowedIconFormats) {
    return hasAllowedExtension(fileName, processor.allowedIconFormats)
  }
  return true
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
      // Simple wildcard matching: escape the dots first, then turn * into .*
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$')
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
 * Remove empty directories recursively, `dirPath` included when it ends up empty
 * @param {string} dirPath - The directory path to clean up
 */
export function cleanupEmptyDirectories(dirPath) {
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

/**
 * The files of `source/` that a job reads: the files of the app in the default brand and
 * in the brand, that the platform keeps and the filter passes. The build copies these; a
 * brand file and the default file it replaces are both listed.
 * @param {BuildConfig} config
 * @param {Job} job
 * @param {ReturnType<typeof createFileFilter>} filter
 * @param {string} cwd - The repository root
 * @returns {string[]} Paths
 */
export function listSourceFiles(config, job, filter, cwd) {
  const processor = platformProcessors[job.platform]
  const files = []
  for (const brand of new Set([config.brandFolder, job.brand])) {
    const appDir = path.join(cwd, 'source', brand, job.app)
    if (!fs.existsSync(appDir)) continue
    for (const entry of fs.readdirSync(appDir, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue
      const file = path.join(entry.parentPath, entry.name)
      const parts = path.relative(appDir, file).split(path.sep)
      if (parts.some(shouldIgnoreFile)) continue
      const type =
        parts.length > 1 && ['fonts', 'images', 'icons'].includes(parts[0]) ? parts[0] : null
      if (keepsFile(processor, type, entry.name) && filter.file(parts.join('/'))) files.push(file)
    }
  }
  return files
}

// Platform Processors

/**
 * A tracker of the names a build writes. Two source files with different names that get the
 * same name in the same output folder are a collision: the file copied last wins, and the
 * build warns. The same source name again is a brand file over the default file, not a
 * collision.
 * @returns {{ track: (destPath: string, oldName: string, newName: string) => string | null, seen: (destPath: string, newName: string) => string | undefined, clear: () => void }}
 *   `track()` returns the warning of a collision, or null; `seen()` returns the source name
 *   that an output name was written from, or undefined
 */
export function createCollisionTracker() {
  const seen = new Map()
  return {
    track(destPath, oldName, newName) {
      const key = path.join(destPath, newName)
      if (seen.has(key)) {
        if (seen.get(key) === oldName) return null
        return `Filename collision: "${oldName}" → "${newName}" (conflicts with "${seen.get(key)}")`
      }
      seen.set(key, oldName)
      return null
    },
    seen(destPath, newName) {
      return seen.get(path.join(destPath, newName))
    },
    clear() {
      seen.clear()
    }
  }
}

/**
 * The names every job of the run has written so far
 */
const collisionTracker = createCollisionTracker()

/**
 * Where a source file ends up in the output: the folder, with the density folder of a
 * platform that sorts its images, and the name the platform gives it.
 * @param {Processor} processor - The platform processor
 * @param {string|null} rootDir - The type folder the file is under (fonts, images, icons)
 * @param {string} destPath - The output folder that mirrors the source folder of the file
 * @param {string} fileName - The name of the source file
 * @returns {{ folder: string, name: string }}
 */
function outputLocation(processor, rootDir, destPath, fileName) {
  const sortsImages =
    rootDir === 'images' &&
    typeof processor.processImage === 'function' &&
    typeof processor.imageFolder === 'function'
  const folder = sortsImages ? path.join(destPath, processor.imageFolder(fileName)) : destPath
  const name = processor.renameFile
    ? processor.renameFile(fileName, {
        currentDir: path.basename(folder),
        parentDir: path.basename(path.dirname(folder))
      })
    : fileName
  return { folder, name }
}

/**
 * Recursively rename files in a directory
 * NOTE: This only operates on the DESTINATION folder (dist/), never touches source files
 * @param {Processor} processor - The platform processor with renameFile method
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
      // The asset catalog or the res/ folder of an earlier build has its names already
      if (item === processor.assetCatalog?.name || item === processor.res?.name) return
      renameFilesRecursively(processor, itemPath, currentDirName)
    } else {
      const newName = processor.renameFile
        ? processor.renameFile(item, { currentDir: currentDirName, parentDir: parentDir })
        : item

      if (newName !== item) {
        const newPath = path.join(folderPath, newName)

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
 * @param {Processor} processor - The platform processor with filtering rules
 * @param {string} srcPath - Source path to copy from
 * @param {string} destPath - Destination path to copy to
 * @param {string} dirName - Current directory name
 * @param {string|null} rootDir - Root asset type directory (fonts, images, icons)
 * @param {string} relative - The path of `srcPath` in the folder of the app, '' for the app
 */
function copyFilesWithProcessor(
  processor,
  srcPath,
  destPath,
  dirName,
  rootDir = null,
  relative = ''
) {
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
    const itemRelative = relative ? `${relative}/${item}` : item

    if (stat.isDirectory()) {
      // A type folder that `--type` leaves out is not read
      if (relative === '' && !run.filter.type(item)) return
      // With a filter a folder is made when a file of it is copied: most have none
      if (!run.dryRun && !run.filter.active && !fs.existsSync(itemDestPath)) {
        fs.mkdirSync(itemDestPath, { recursive: true })
        stats.directoriesCreated++
      }
      copyFilesWithProcessor(processor, itemSrcPath, itemDestPath, item, currentRoot, itemRelative)
      return
    }

    // Apply platform-specific filtering, then the filters of the run
    if (!keepsFile(processor, currentRoot, item) || !run.filter.file(itemRelative)) {
      return
    }

    // A Git LFS pointer is not the file. Fail, unless told to copy it.
    if (!run.allowLfsPointers && isLfsPointer(itemSrcPath, stat)) {
      stats.lfsPointers.push(path.relative(run.cwd, itemSrcPath))
      return
    }

    // An output name that is taken already: by the default file this brand file replaces,
    // or by another source file, which is a collision. Warn about the collision, and count
    // the output file once either way.
    const { folder, name } = outputLocation(processor, currentRoot, destPath, item)
    const taken = collisionTracker.seen(folder, name) !== undefined
    const warning = collisionTracker.track(folder, item, name)
    if (warning) stats.warnings.push(warning)
    const counted = stats.filesProcessed

    copyFile(processor, currentRoot, itemSrcPath, destPath, item)
    if (taken) stats.filesProcessed = counted
  })
}

/**
 * Copy one file to the output, or count it in a dry run
 * @param {Processor} processor - The platform processor
 * @param {string|null} currentRoot - The type folder the file is under
 * @param {string} itemSrcPath - The source file
 * @param {string} destPath - The output folder that mirrors the source folder of the file
 * @param {string} item - The name of the source file
 */
function copyFile(processor, currentRoot, itemSrcPath, destPath, item) {
  const itemDestPath = path.join(destPath, item)

  if (run.dryRun) {
    stats.filesProcessed++
    return
  }

  if (run.filter.active && !fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true })
    stats.directoriesCreated++
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
}

/**
 * Process assets for a platform using the processor configuration
 * @param {Processor} processor - The platform processor
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

/**
 * Write the files a processor names in `vectorDrawables` as vector drawables, in the output
 * of one job. A file without a shape stays as it is, with a warning.
 * @param {Processor} processor - The platform processor
 * @param {string} destPath - The output folder of the job
 * @param {(svg: string) => Promise<string>} convert - The converter
 */
async function convertVectorDrawables(processor, destPath, convert) {
  const conversion = processor.vectorDrawables
  if (!conversion) return

  const { converted, kept, failed } = await convertFolder(
    path.join(destPath, conversion.type),
    conversion,
    convert
  )
  stats.filesConverted += converted.length
  if (converted.length > 0) {
    logger.log(`🎨 Converted ${converted.length} files to vector drawables`)
  }
  kept.forEach((file) =>
    stats.warnings.push(
      `Not converted, a vector drawable of it draws nothing: ${path.relative(run.cwd, file)}`
    )
  )
  failed.forEach(({ file, message }) =>
    stats.errors.push(
      `Failed to convert ${path.relative(run.cwd, file)} to a vector drawable: ${message}`
    )
  )
}

/**
 * Optimize the images of the output of one job, and write them in the formats of `--webp`
 * and `--avif` that the processor takes.
 * @param {Processor} processor - The platform processor
 * @param {string} destPath - The output folder of the job
 * @param {{ settings: import('./types.js').OptimizeSettings, encoders: import('./optimize.js').Encoders }} tools
 */
async function optimizeImages(processor, destPath, tools) {
  const formats = Object.fromEntries(
    run.formats
      .filter((format) => processor.imageFormats?.[format])
      .map((format) => [
        format,
        /** @type {'beside'|'replace'} */ (processor.imageFormats?.[format])
      ])
  )
  if (!run.optimize && Object.keys(formats).length === 0) return

  const { optimized, saved, generated, failed } = await optimizeJob(destPath, {
    ...tools,
    optimize: run.optimize,
    formats,
    fromSource: (file) =>
      collisionTracker.seen(path.dirname(file), path.basename(file)) !== undefined
  })
  stats.filesOptimized += optimized
  stats.bytesSaved += saved
  stats.filesGenerated += generated
  if (optimized > 0) logger.log(`🗜️  Optimized ${optimized} files`)
  if (generated > 0)
    logger.log(`🖼️  Wrote ${generated} files in ${Object.keys(formats).join(', ')}`)
  failed.forEach(({ file, message }) =>
    stats.errors.push(`Failed to read the image ${path.relative(run.cwd, file)}: ${message}`)
  )
}

/**
 * Write the fonts a processor names in `subset` again with the characters of the ranges
 * only, in the output of one job. A font without a character of the ranges stays as it is,
 * with a warning.
 * @param {Processor} processor - The platform processor
 * @param {string} destPath - The output folder of the job
 * @param {{ settings: import('./types.js').SubsetSettings, subsetter: import('./subset-fonts.js').Subsetter }} tools
 */
async function subsetFonts(processor, destPath, tools) {
  if (!processor.subset) return

  const { subsetted, saved, kept, failed } = await subsetJob(destPath, {
    ...tools,
    fonts: processor.subset
  })
  stats.fontsSubsetted += subsetted
  stats.fontBytesSaved += saved
  if (subsetted > 0) logger.log(`✂️  Subsetted ${subsetted} fonts`)
  kept.forEach((file) =>
    stats.warnings.push(
      `Not subsetted, the font has no character of the ranges: ${path.relative(run.cwd, file)}`
    )
  )
  failed.forEach(({ file, message }) =>
    stats.errors.push(`Failed to subset the font ${path.relative(run.cwd, file)}: ${message}`)
  )
}

/**
 * Move the images a processor names in `assetCatalog` into an asset catalog, in the output
 * of one job. A file without a place in an image set stays in its folder, with a warning
 * for the job.
 * @param {Processor} processor - The platform processor
 * @param {string} destPath - The output folder of the job
 */
function writeAssetCatalog(processor, destPath) {
  const catalog = processor.assetCatalog
  if (!catalog) return

  const typeDir = path.join(destPath, catalog.type)
  const { sets, left } = writeCatalog(typeDir, path.join(destPath, catalog.name))
  stats.imageSets += sets
  if (sets > 0) {
    logger.log(`🗂️  Wrote ${sets} image sets to ${catalog.name}`)
  }
  cleanupEmptyDirectories(typeDir)
  if (left.length > 0) {
    const first = left.slice(0, 3).map((file) => path.relative(typeDir, file))
    stats.warnings.push(
      `${left.length} file(s) have no place in an image set and stay in ${path.relative(run.cwd, typeDir)}: ${first.join(', ')}${left.length > 3 ? ', …' : ''}`
    )
  }
}

/**
 * Move the files a processor names in `res` into a `res/` folder, in the output of one job.
 * A file without a place in it stays in its folder, with a warning for the job.
 * @param {Processor} processor - The platform processor
 * @param {string} destPath - The output folder of the job
 */
function writeResLayout(processor, destPath) {
  const res = processor.res
  if (!res) return

  const { moved, left } = writeRes(destPath, res)
  stats.resourceFiles += moved
  if (moved > 0) {
    logger.log(`🗂️  Moved ${moved} files to ${res.name}/`)
  }
  cleanupEmptyDirectories(destPath)
  if (left.length > 0) {
    stats.warnings.push(
      `${left.length} file(s) have no place in ${res.name}/ and stay in ${path.relative(run.cwd, destPath)}: ${left.slice(0, 3).join(', ')}${left.length > 3 ? ', …' : ''}`
    )
  }
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
  const cwd = resolveRoot(options.cwd)
  run = {
    cwd,
    outDir: path.resolve(cwd, options.out || 'dist'),
    dryRun: options.dryRun || false,
    allowLfsPointers: options.allowLfsPointers || process.env.CHASSIS_ALLOW_LFS_POINTERS === '1',
    vectorDrawables: options.vectorDrawables || false,
    assetCatalog: options.assetCatalog || false,
    res: options.res || false,
    optimize: options.optimize || false,
    formats: Object.keys(IMAGE_FORMATS).filter((format) => options[format]),
    subset: Boolean(options.subset),
    filter: createFileFilter(options)
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
    filters.brands.length > 0 ||
    filters.apps.length > 0 ||
    filters.platforms.length > 0 ||
    run.filter.active
  const clean = options.clean === undefined ? null : options.clean
  const shouldClean = clean !== null ? clean : !isSelectiveBuild

  // The converter is loaded before anything is removed: a build that cannot run keeps
  // the output that is there
  let convert = null
  if (run.vectorDrawables) {
    if (!jobs.some((job) => platformProcessors[job.platform].vectorDrawables)) {
      stats.warnings.push(
        '--vector-drawables changes nothing: no selected job has a platform that converts'
      )
    } else if (!run.dryRun) {
      convert = await loadConverter()
    }
  }

  // The settings are checked and the packages are loaded before anything is removed
  let imageTools = null
  if (run.optimize || run.formats.length > 0) {
    const settings = resolveSettings(config.optimize)
    for (const format of run.formats) {
      if (!jobs.some((job) => platformProcessors[job.platform].imageFormats?.[format])) {
        stats.warnings.push(
          `--${format} changes nothing: no selected job has a platform that takes the format`
        )
      }
    }
    if (!run.dryRun) {
      const encoders = await loadEncoders(settings, {
        optimize: run.optimize,
        formats: run.formats
      })
      imageTools = { settings, encoders }
    }
  }

  // The ranges are checked and the package is loaded before anything is removed
  let fontTools = null
  if (run.subset) {
    const settings = resolveSubset(
      config.subset,
      Array.isArray(options.subset) ? options.subset : []
    )
    if (!jobs.some((job) => platformProcessors[job.platform].subset)) {
      stats.warnings.push(
        '--subset changes nothing: no selected job has a platform whose fonts are subsetted'
      )
    } else if (!run.dryRun) {
      fontTools = { settings, subsetter: await loadSubsetter() }
    }
  }

  if (run.assetCatalog && !jobs.some((job) => platformProcessors[job.platform].assetCatalog)) {
    stats.warnings.push(
      '--asset-catalog changes nothing: no selected job has a platform with an asset catalog'
    )
  }

  if (run.res && !jobs.some((job) => platformProcessors[job.platform].res)) {
    stats.warnings.push('--res changes nothing: no selected job has a platform with a res/ folder')
  }

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

    // With a filter the folder of a job is made with its first file: a job may have none
    if (!run.dryRun && !run.filter.active) {
      fs.mkdirSync(destPath, { recursive: true })
      stats.directoriesCreated++
    }

    // Prepare source paths (default + brand override)
    const defaultAppPath = path.join(run.cwd, 'source', config.brandFolder, app)
    const brandAppPath = path.join(run.cwd, 'source', brand, app)

    const processor = platformProcessors[platform]
    const before = stats.filesProcessed
    processAssets(processor, [defaultAppPath, brandAppPath], destPath, defaultAppPath)
    if (imageTools) await optimizeImages(processor, destPath, imageTools)
    if (fontTools) await subsetFonts(processor, destPath, fontTools)
    if (convert) await convertVectorDrawables(processor, destPath, convert)
    if (run.assetCatalog && !run.dryRun) writeAssetCatalog(processor, destPath)
    if (run.res && !run.dryRun) writeResLayout(processor, destPath)
    stats.jobs.push({ ...job, files: stats.filesProcessed - before })
  }

  // A filter that matches nothing is a mistake in the filter; one that matches nothing in
  // one job of several is the filter of another app
  if (run.filter.active && stats.lfsPointers.length === 0) {
    const empty = stats.jobs.filter((job) => job.files === 0)
    if (empty.length === stats.jobs.length) {
      stats.errors.push('The filters select no file. Check --type and --include.')
    } else {
      empty.forEach((job) =>
        stats.warnings.push(`The filters select no file of ${job.platform}/${job.app}/${job.brand}`)
      )
    }
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
    if (run.vectorDrawables) {
      logger.log(`🎨 ${stats.filesConverted} files converted to vector drawables`)
    }
    if (run.assetCatalog) {
      logger.log(`🗂️  ${stats.imageSets} image sets written to asset catalogs`)
    }
    if (run.res) {
      logger.log(`🗂️  ${stats.resourceFiles} files moved to res/ folders`)
    }
    if (run.optimize) {
      logger.log(
        `🗜️  ${stats.filesOptimized} files optimized, ${Math.round(stats.bytesSaved / 1024)} KB saved`
      )
    }
    if (run.formats.length > 0) {
      logger.log(`🖼️  ${stats.filesGenerated} files written in ${run.formats.join(', ')}`)
    }
    if (run.subset) {
      logger.log(
        `✂️  ${stats.fontsSubsetted} fonts subsetted, ${Math.round(stats.fontBytesSaved / 1024)} KB saved`
      )
    }
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

/**
 * The command line of the build: `pnpm assets`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  let options
  try {
    options = parseArgs(argv)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(2)
  }
  if (options.help) {
    console.log(HELP)
    process.exit(0)
  }
  if (options.version) {
    console.log(buildVersion())
    process.exit(0)
  }
  // The watch is loaded when it is asked for: it imports this module
  const started = options.watch
    ? import('./watch.js').then(({ watchCli }) => watchCli(options))
    : generateAssets(options)
  started.catch((error) => {
    console.error(`💥 Build failed: ${error.message}`)
    if (process.env.DEBUG) console.error(error.stack)
    process.exit(1)
  })
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
