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
 * @property {string} [sha256] - The hash of the content, when the lint asked for it.
 */

/**
 * What is wrong with the source, as the lint lists it.
 * @typedef {Object} Problem
 * @property {string} rule - The rule that found it: `names`, `one-master`.
 * @property {string} file - The path of the file or the folder that it is about.
 * @property {string} message - What is wrong, and what to do. It follows the path.
 */

/**
 * A source layer, as it is read.
 * @typedef {Object} Layer
 * @property {string} path - The folder of the layer: `source/default/docs`.
 * @property {SourceFile[]} files - The files of its type folders, without the manifests
 *   and the files of the system, sorted by path.
 * @property {ImageRuleEntry[]} rules - The rules of its image manifest.
 * @property {FontFamily[]} families - The families of its font manifest.
 * @property {Problem[]} problems - What is wrong with the layer.
 */

/**
 * The layers of one brand and one app, as the jobs of that brand and app read them.
 * @typedef {Object} Stack
 * @property {string} brand
 * @property {string} app
 * @property {Layer[]} layers - The layers that exist, in override order.
 * @property {Problem[]} problems - The layers that are missing and that every app needs.
 */

/**
 * What was read of `source/`, for the lint.
 * @typedef {Object} Source
 * @property {Config} config
 * @property {Record<string, SourceEntry[]>} folders - The entries of `source/` and of
 *   every folder of a brand, by the path of the folder.
 * @property {Stack[]} stacks - One per brand and app of the configuration.
 */

/**
 * What the image manifest says of an image: the keys of every rule that matches it.
 * @typedef {Object} ImageRule
 * @property {number[]} [densities] - The densities to write. That of the master without.
 * @property {Record<string, number>} [sizes] - Narrower renditions: a name, and a width
 *   in pixels at 1x.
 * @property {string[]} [formats] - The formats to write. That of the master without.
 * @property {Record<string, number>} [quality] - The quality of a format, 1 to 100.
 * @property {boolean} [palette] - Lets the optimization reduce a PNG file to a palette.
 * @property {number} [budget] - The largest size in bytes of a file of the image.
 * @property {boolean} [committed] - The variants are committed, and the build copies them.
 * @property {Platform[]} [platforms] - The platforms that get the image.
 * @property {string} [name] - The name of the image in the native outputs.
 */

/**
 * A rule of an image manifest, as it is in the file.
 * @typedef {ImageRule & { match: string, file: string }} ImageRuleEntry
 */

/**
 * A face of a font family.
 * @typedef {Object} FontFace
 * @property {string} file - The file of the face, in `fonts/`: `text-normal.otf`.
 * @property {number} weight - 100 to 900.
 * @property {'normal' | 'italic'} style
 */

/**
 * A family of the font manifest.
 * @typedef {Object} FontFamily
 * @property {string} id - The name in the native outputs, and what a layer overrides.
 * @property {string} family - The family name in the stylesheet: `Inter`.
 * @property {string} license - The license file, from `fonts/`: `licenses/inter.txt`.
 * @property {string[]} [subset] - The Unicode ranges that a subset keeps.
 * @property {FontFace[]} faces
 * @property {string} manifest - The path of the manifest that has the family.
 */

/**
 * What a layer overrides: the files of one name in one folder of one type, or the files
 * of one font family.
 * @typedef {Object} Asset
 * @property {AssetType} type
 * @property {string} id - Type, folder and name: `images/home/lego-chassis`. For a font
 *   family `fonts` and its id: `fonts/text`.
 * @property {string} folder
 * @property {string} name
 * @property {SourceFile[]} files - The files of the last layer that has the asset. For a
 *   font family its faces in the order of the manifest, then its license.
 * @property {ImageRule} [rule] - The rule of an image, when a rule matches it.
 * @property {FontFamily} [family] - The family of the font manifest.
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
