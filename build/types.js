/**
 * @file types.js
 * @description The JSDoc types of the data that moves between the modules of the build.
 *              It holds no code.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

/**
 * @typedef {'web' | 'ios' | 'android'} Platform
 * @typedef {'fonts' | 'images' | 'icons' | 'other'} AssetType
 * @typedef {'images' | 'svg' | 'fonts'} Optimization
 */

/**
 * The options of one platform, from `chassis.build.options.<platform>`.
 * @typedef {Object} PlatformOptions
 * @property {boolean | Optimization[]} [optimize] - What the build optimizes.
 */

/**
 * The build configuration: `chassis.build` of `package.json`, or the file of `--config`.
 * @typedef {Object} Config
 * @property {string[]} brands - The brands to build.
 * @property {Record<string, Platform[]>} apps - The apps, each with its platforms.
 * @property {Partial<Record<Platform, PlatformOptions>>} options - Options by platform.
 */

/**
 * What selects the jobs of a build. An empty or missing list selects everything.
 * @typedef {Object} Filters
 * @property {string[]} [brands]
 * @property {string[]} [apps]
 * @property {string[]} [platforms]
 */

/**
 * One brand and one app for one platform.
 * @typedef {Object} Job
 * @property {string} brand
 * @property {string} app
 * @property {Platform} platform
 * @property {string[]} layers - The source folders in override order, from the root.
 * @property {string} out - The folder of the job: `dist/web/docs/chassis`.
 * @property {Optimization[]} optimize - What the job optimizes. Empty when it is off.
 */

/**
 * A file of `source/`.
 * @typedef {Object} SourceFile
 * @property {string} path - The path from the root: `source/default/docs/images/a@2x.png`.
 * @property {string} layer - The layer that holds the file: `source/default/docs`.
 * @property {AssetType} type
 * @property {string} folder - The folders below the type folder: `home`, or an empty string.
 * @property {string} name - The file name without resolution indicator and extension.
 * @property {number} density - The pixels per point. 1 without a resolution indicator.
 * @property {string} extension - With its dot, as it is written: `.png`.
 * @property {number} bytes
 * @property {number} [width] - The width of an image, in pixels.
 * @property {number} [height] - The height of an image, in pixels.
 */

/**
 * What a layer overrides: the files of one name in one folder of one type.
 * @typedef {Object} Asset
 * @property {AssetType} type
 * @property {string} id - Type, folder and name: `images/home/lego-chassis`.
 * @property {string} folder
 * @property {string} name
 * @property {SourceFile[]} files - The files of the last layer that has the asset.
 */

/**
 * What makes a file that is not a copy.
 * @typedef {Object} Step
 * @property {string} name - A key of the steps that the pipeline knows.
 * @property {Record<string, unknown>} [params] - The parameters of the step.
 */

/**
 * A file that a job writes. Without a step and without text it is a copy of its source.
 * @typedef {Object} PlannedFile
 * @property {string} path - The path in the folder of the job: `images/home/a@2x.png`.
 * @property {AssetType} type
 * @property {string} [source] - The path of the source file, from the root.
 * @property {Step} [step]
 * @property {string} [text] - The content of a file that a writer made.
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [density]
 */

/**
 * A file of the output manifest.
 * @typedef {Object} ManifestFile
 * @property {string} path
 * @property {AssetType} type
 * @property {number} bytes
 * @property {string} sha256
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [density]
 * @property {string} [source]
 * @property {boolean} derived - `true` when the build made the file, `false` for a copy.
 */

/**
 * The output manifest of a job, `chassis-assets.json`.
 * @typedef {Object} Manifest
 * @property {number} version - The version of the format.
 * @property {string} [package] - The version of the package. A golden file has none.
 * @property {string} brand
 * @property {string} app
 * @property {Platform} platform
 * @property {ManifestFile[]} files - Sorted by path.
 */

/**
 * What a job did.
 * @typedef {Object} Report
 * @property {string} brand
 * @property {string} app
 * @property {Platform} platform
 * @property {string} out - The folder of the job.
 * @property {number} written - The files written, those from the cache included.
 * @property {number} cached - The files whose step did not run, since the cache had them.
 * @property {string[]} removed - The files of the folder that the job did not write.
 * @property {number} bytes - The bytes written.
 * @property {number} ms - The time the job took.
 * @property {Error[]} errors - Empty when the job succeeded.
 */

/**
 * The three functions of a platform. They take data and return data.
 * @typedef {Object} Rules
 * @property {(asset: Asset, job: Job) => boolean} include - Whether the platform takes it.
 * @property {(asset: Asset, job: Job) => PlannedFile[]} files - The files of one asset.
 * @property {(assets: Asset[], job: Job) => PlannedFile[]} extras - The files of all.
 */

/**
 * What runs a step: the only code that knows a tool.
 * @typedef {Object} StepRunner
 * @property {() => string | Promise<string>} version - The version of the tool. It is
 *   part of the key of the cache.
 * @property {(input: Uint8Array, params: Record<string, unknown>, file: PlannedFile) =>
 *   Promise<Uint8Array>} run - Turns the bytes of the source file into those of the output.
 */

/**
 * An entry of a folder.
 * @typedef {Object} SourceEntry
 * @property {string} name
 * @property {boolean} directory
 * @property {number} bytes - 0 for a folder.
 */

/**
 * How the inventory reads `source/`. A test passes one that reads a tree in memory.
 * @typedef {Object} SourceReader
 * @property {(folder: string) => Promise<SourceEntry[] | null>} list - The entries of a
 *   folder, or `null` when there is no such folder.
 * @property {(file: string) => Promise<{ width: number, height: number } | null>} size -
 *   The size of an image in pixels, or `null` when the file does not say.
 * @property {(file: string) => Promise<Uint8Array>} read - The content of a file.
 */

export {}
