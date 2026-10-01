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
 * The `chassis` block of `package.json` and the data of `chassis.checks.json`, read by
 * `loadConfig()`.
 * @typedef {Object} BuildConfig
 * @property {string[]} brands - Brands to build, `chassis.build.brands`
 * @property {Record<string, string[]>} apps - Apps with their platforms, `chassis.build.apps`
 * @property {string} brandFolder - The fallback brand folder, `chassis.defaults.brandFolder`
 * @property {unknown} [optimize] - The settings of `--optimize`, `--webp` and `--avif`,
 *   `chassis.optimize`, as written. `resolveSettings()` checks them when an option is given
 * @property {ContractEntry[]} contracts - The files consumers read, `contracts` of `chassis.checks.json`
 * @property {LintAllowance[]} lintAllow - Names the source lint accepts, `lint.allow` of `chassis.checks.json`
 * @property {string} [name] - The package name
 * @property {string} [version] - The package version
 */

/**
 * The options of `generateAssets()`, and of the command line through `parseArgs()`.
 * @typedef {Object} BuildOptions
 * @property {string[]} [brands] - Only these brands
 * @property {string[]} [apps] - Only these apps
 * @property {string[]} [platforms] - Only these platforms
 * @property {string[]} [types] - Only these type folders of an app
 * @property {string[]} [include] - Only the files that match one of these patterns, by
 *   their path in the folder of the app in `source/`
 * @property {boolean|null} [clean] - true removes the output first, false keeps it,
 *   null (default) removes it for a full build and keeps it for a filtered one
 * @property {boolean} [quiet] - Print errors only
 * @property {string} [cwd] - The repository root, where `package.json` and `source/` are
 * @property {string} [out] - The output folder, relative to `cwd`. Default `dist`
 * @property {boolean} [dryRun] - Print the jobs and their file counts, write nothing
 * @property {boolean} [allowLfsPointers] - Copy Git LFS pointer files instead of failing
 * @property {boolean} [vectorDrawables] - Write the files a processor names in
 *   `vectorDrawables` as vector drawables. Needs the package `svg2vectordrawable`
 * @property {boolean} [assetCatalog] - Move the images a processor names in `assetCatalog`
 *   into an asset catalog
 * @property {boolean} [res] - Move the files a processor names in `res` into a `res/` folder
 * @property {boolean} [optimize] - Write the images again under their names where that makes
 *   them smaller. Needs the packages `sharp` and `svgo`
 * @property {boolean} [webp] - Write the PNG and JPEG images as WebP too, where a processor
 *   takes the format in `imageFormats`. Needs the package `sharp`
 * @property {boolean} [avif] - The same for AVIF
 */

/**
 * The settings of `--optimize`, `--webp` and `--avif`: `chassis.optimize` of `package.json`
 * over the defaults of `optimize.js`.
 * @typedef {Object} OptimizeSettings
 * @property {string[]} types - The type folders whose files are optimized and converted
 * @property {{ quality: number|null }} png - null compresses a PNG again without a loss; a
 *   number reduces its colors to a palette at that quality
 * @property {{ quality: number|null }} jpeg - null leaves a JPEG as it is; a number encodes
 *   it again at that quality
 * @property {false | { precision: number|null }} svg - false leaves an SVG as it is. A
 *   `precision` of null minifies it and keeps its shapes; a number rounds the coordinates to
 *   that many decimals and rewrites the paths
 * @property {{ quality: number, lossless: boolean }} webp - `lossless` encodes a PNG without
 *   a loss; `quality` is of a JPEG, and of a PNG without `lossless`
 * @property {{ quality: number, lossless: boolean }} avif - The same for AVIF
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
 * @property {number} filesConverted - Files written as vector drawables, with
 *   `vectorDrawables`
 * @property {number} imageSets - Image sets written to asset catalogs, with `assetCatalog`
 * @property {number} resourceFiles - Files moved into `res/` folders, with `res`
 * @property {number} filesOptimized - Files written again under their names, with `optimize`
 * @property {number} bytesSaved - What the optimized files lost in size, in bytes
 * @property {number} filesGenerated - Files written in a second format, with `webp` and `avif`
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
 * A conversion of the files of one type folder, which an option of the build turns on.
 * @typedef {Object} Conversion
 * @property {string} type - The type folder whose files are converted, such as `icons`
 * @property {string} from - The extension of the files that are converted, such as `.svg`
 * @property {string} to - The extension they are written with, such as `.xml`
 */

/**
 * An asset catalog that takes the images of one type folder, which an option of the build
 * turns on.
 * @typedef {Object} Catalog
 * @property {string} type - The type folder whose images move into the catalog, such as `images`
 * @property {string} name - The folder of the catalog in the output of a job, such as
 *   `Assets.xcassets`
 */

/**
 * A `res/` folder that takes the fonts, the images and the icons of a job, which an option
 * of the build turns on.
 * @typedef {Object} ResLayout
 * @property {string} name - The folder in the output of a job, `res`
 * @property {{ type: string, folder: string, formats: string[] }} font - The type folder of
 *   the fonts, the folder of `res/` they move to, and the extensions it takes
 * @property {{ types: string[], folder: string, formats: string[] }} drawable - The type
 *   folders of the images and the icons, the folder of `res/` a file without a density
 *   folder moves to, and the extensions it takes, the first one first when two files have
 *   one name
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
 * @property {(fileName: string) => string} [imageFolder] - The folder `processImage()` writes
 *   an image to, under the folder of the image. The build reads it to find collisions
 * @property {Conversion} [vectorDrawables] - What `--vector-drawables` converts for the
 *   platform. Without it the option leaves the platform as it is
 * @property {Catalog} [assetCatalog] - What `--asset-catalog` writes for the platform.
 *   Without it the option leaves the platform as it is
 * @property {Record<string, 'beside' | 'replace'>} [imageFormats] - The formats of `--webp`
 *   and `--avif` the platform takes: `beside` writes the file next to the image, `replace`
 *   writes it in place of the image when it is smaller. Without a format its option leaves
 *   the platform as it is
 * @property {ResLayout} [res] - What `--res` writes for the platform. Without it the option
 *   leaves the platform as it is
 */

/**
 * A problem of the source lint, `lint-source.js`.
 * @typedef {Object} LintProblem
 * @property {string} file - Relative to `source/`, with forward slashes
 * @property {string} message
 */

/**
 * A name that breaks the naming rules and is kept, `lint.allow` of `chassis.checks.json`.
 * @typedef {Object} LintAllowance
 * @property {string} pattern - Relative to `source/`, with `*` for one folder
 * @property {string} reason - Why the name is kept, printed with the warning
 */

/**
 * A set of a contract: files that are read together.
 * @typedef {Object} ContractSet
 * @property {string} pattern - With `*` and `{a,b}` alternatives
 * @property {string[]} [except] - Patterns of files the set does not ask anything of
 */

/**
 * A contract of `chassis.checks.json`, with the job it is listed under, checked by
 * `contract.js`.
 * @typedef {Object} ContractEntry
 * @property {string} job - The output it is about, `<platform>/<app>/<brand>`
 * @property {string} reader - The code that reads the files
 * @property {string[]} [files] - Paths relative to the output of the job, with `{a,b}`
 *   alternatives
 * @property {Array<string | ContractSet>} [sets] - Patterns of files that are read together
 */

/**
 * A file of a consumer contract that an output lacks.
 * @typedef {Object} ContractProblem
 * @property {string} path - Relative to the output of the job
 * @property {string} reader - The code that reads it
 */

export {}
