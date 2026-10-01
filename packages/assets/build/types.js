/**
 * The shared types of the build, as JSDoc. `pnpm assets:typecheck` checks `build/` against
 * them with TypeScript's `checkJs`. The build stays JavaScript: this module exports nothing
 * at run time.
 *
 * Import a type with `/** @import { Job } from './types.js' *\/`.
 *
 * @module types
 */

/**
 * The `chassis` block of `package.json`, read by `loadConfig()`.
 * @typedef {Object} BuildConfig
 * @property {string[]} brands - Brands to build, `chassis.build.brands`
 * @property {Record<string, string[]>} apps - Apps with their platforms, `chassis.build.apps`
 * @property {string} brandFolder - The fallback brand folder, `chassis.defaults.brandFolder`
 * @property {string} [name] - The package name
 * @property {string} [version] - The package version
 */

/**
 * The options of `generateAssets()`, and of the command line through `parseArgs()`.
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
 * One brand, one app, one platform: the output folder `<platform>/<app>/<brand>/`.
 * @typedef {Object} Job
 * @property {string} brand
 * @property {string} app
 * @property {string} platform
 */

/**
 * What `generateAssets()` resolves to.
 * @typedef {Object} BuildStats
 * @property {number} filesProcessed
 * @property {number} filesRenamed
 * @property {number} directoriesCreated
 * @property {string[]} errors
 * @property {string[]} warnings
 * @property {string[]} lfsPointers - Source files that are Git LFS pointers
 * @property {Array<Job & { files: number }>} jobs
 */

/**
 * The context `renameFile()` of a processor gets: the folder of the file and its parent.
 * Android also takes a boolean, true for an icon.
 * @typedef {{ currentDir?: string, parentDir?: string } | boolean} RenameContext
 */

/**
 * What `processImage()` of a processor gets.
 * @typedef {Object} ImageContext
 * @property {string} srcPath - The source file
 * @property {string} destPath - The folder the file is copied into
 * @property {string} fileName
 * @property {typeof import('fs')} fs
 * @property {typeof import('path')} path
 * @property {BuildStats} stats
 * @property {{ log: Function, warn: Function, error: Function }} logger
 */

/**
 * A platform processor of `build/processors/`: the platform's names and filters.
 * @typedef {Object} Processor
 * @property {string} name - The platform, a key of `platformProcessors`
 * @property {string} icon - Printed before the platform's name
 * @property {(fileName: string, context?: RenameContext) => string} renameFile
 * @property {string[]} [allowedFontFormats] - The extensions `fonts/` keeps
 * @property {string[]} [allowedIconFormats] - The extensions `icons/` keeps
 * @property {string[]} [excludedImageFormats] - The extensions `images/` drops
 * @property {string[]} [excludedFormats] - Unused by the build; read by the validator
 * @property {Record<string, string>} [densityMapping] - Resolution indicator to folder
 * @property {(resolution: string) => string} [getDensityFolder]
 * @property {(context: ImageContext) => boolean} [processImage] - Places an image itself;
 *   true when it did
 */

/**
 * A problem of the source lint, `lint-source.js`.
 * @typedef {Object} LintProblem
 * @property {string} file - Relative to `source/`, with forward slashes
 * @property {string} message
 */

/**
 * An entry of the consumer contract, `contract.js`.
 * @typedef {Object} ContractEntry
 * @property {string} reader - The code that reads the files
 * @property {string[]} files - Paths relative to the docs output, with `{a,b}` alternatives
 */

/**
 * A file of the consumer contract that an output lacks.
 * @typedef {Object} ContractProblem
 * @property {string} path - Relative to the docs output
 * @property {string} reader - The code that reads it
 */

export {}
