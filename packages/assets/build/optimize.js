/**
 * Optimization and image formats: what `--optimize`, `--webp` and `--avif` turn on.
 *
 * `--optimize` writes an image again under its name when that makes it smaller. `--webp` and
 * `--avif` write an image in a second format, beside the file or in its place, as the
 * processor of the platform says. The settings are `chassis.optimize` of `package.json`.
 *
 * The module uses the packages `sharp` and `svgo`, and loads them when an option is given,
 * never at import time: the default build needs nothing installed.
 *
 * @module optimize
 */

import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

/** @import { OptimizeSettings } from './types.js' */

/** The package that encodes the raster images. */
export const RASTER_PACKAGE = 'sharp'

/** The package that minifies the SVG files. */
export const SVG_PACKAGE = 'svgo'

/** The formats `--webp` and `--avif` write, with the extension of each. */
export const IMAGE_FORMATS = { webp: '.webp', avif: '.avif' }

/**
 * The plugins of the SVG minifier that are never used. They take away what nothing inside
 * the file refers to, and a page refers to a symbol of a sprite from outside the file, by
 * its id: with them a sprite comes out empty. The third rewrites `transform` attributes,
 * which moved an embedded image of this project's files.
 */
const SVG_NEVER = { cleanupIds: false, removeHiddenElems: false, convertTransform: false }

/**
 * The plugins that rewrite the shapes: they round coordinates, merge paths and turn shapes
 * into paths. A file is much smaller with them, and the pixels at the edge of a shape are
 * not the same. Without a `svg.precision` they are off, and a file is drawn as before.
 */
const SVG_SHAPES = ['convertPathData', 'mergePaths', 'convertShapeToPath', 'cleanupNumericValues']

/**
 * The options of the SVG minifier for a precision.
 * @param {number|null} precision - The decimals a coordinate keeps, or null to leave the
 *   shapes as they are
 * @returns {Object}
 */
export function svgOptions(precision) {
  const overrides =
    precision === null
      ? { ...SVG_NEVER, ...Object.fromEntries(SVG_SHAPES.map((name) => [name, false])) }
      : SVG_NEVER
  return {
    multipass: true,
    ...(precision === null ? {} : { floatPrecision: precision }),
    plugins: [{ name: 'preset-default', params: { overrides } }]
  }
}

/** The raster formats that are optimized, and that a second format is written from. */
const PNG = ['.png']
const JPEG = ['.jpg', '.jpeg']

/**
 * The settings without a `chassis.optimize` block. They change no visible pixel: a PNG is
 * compressed again, a JPEG is left as it is, since a JPEG cannot be encoded again without a
 * loss, an SVG keeps its shapes, and a WebP of a PNG is lossless.
 * @type {OptimizeSettings}
 */
export const OPTIMIZE_DEFAULTS = {
  types: ['images'],
  png: { quality: null },
  jpeg: { quality: null },
  svg: { precision: null },
  webp: { quality: 80, lossless: true },
  avif: { quality: 60, lossless: false }
}

/**
 * The settings of a run: `chassis.optimize` over the defaults, checked.
 * @param {unknown} [given] - The `optimize` block of the `chassis` configuration
 * @returns {OptimizeSettings}
 * @throws {Error} On a key the build does not know, or a value of the wrong kind
 */
export function resolveSettings(given = {}) {
  const errors = []
  if (typeof given !== 'object' || given === null || Array.isArray(given)) {
    throw new Error('chassis.optimize is an object, such as { "jpeg": { "quality": 80 } }')
  }
  const block = /** @type {Record<string, any>} */ (given)

  /** @param {unknown} value */
  const isQuality = (value) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 100

  for (const key of Object.keys(block)) {
    if (!(key in OPTIMIZE_DEFAULTS)) {
      errors.push(`"${key}" is not a setting. Known: ${Object.keys(OPTIMIZE_DEFAULTS).join(', ')}`)
    }
  }

  if (
    block.types !== undefined &&
    (!Array.isArray(block.types) ||
      block.types.length === 0 ||
      block.types.some((type) => typeof type !== 'string' || type === ''))
  ) {
    errors.push('"types" is a list of type folders, such as ["images", "icons"]')
  }
  if (block.svg !== undefined && block.svg !== false) {
    const svg = block.svg
    if (typeof svg !== 'object' || svg === null || Array.isArray(svg)) {
      errors.push('"svg" is false, or an object with "precision"')
    } else {
      for (const key of Object.keys(svg)) {
        if (key !== 'precision') errors.push(`"svg.${key}" is not a setting`)
      }
      const { precision } = svg
      if (
        precision !== undefined &&
        precision !== null &&
        !(Number.isInteger(precision) && precision >= 0 && precision <= 8)
      ) {
        errors.push('"svg.precision" is a whole number from 0 to 8, or null')
      }
    }
  }

  for (const format of ['png', 'jpeg', 'webp', 'avif']) {
    const value = block[format]
    if (value === undefined) continue
    const lossy = format === 'png' || format === 'jpeg'
    const known = lossy ? ['quality'] : ['quality', 'lossless']
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`"${format}" is an object with ${known.map((key) => `"${key}"`).join(' and ')}`)
      continue
    }
    for (const key of Object.keys(value)) {
      if (!known.includes(key)) errors.push(`"${format}.${key}" is not a setting`)
    }
    if (
      value.quality !== undefined &&
      !isQuality(value.quality) &&
      !(lossy && value.quality === null)
    ) {
      errors.push(`"${format}.quality" is a whole number from 1 to 100${lossy ? ', or null' : ''}`)
    }
    if (value.lossless !== undefined && typeof value.lossless !== 'boolean') {
      errors.push(`"${format}.lossless" is true or false`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`chassis.optimize is not valid:\n  - ${errors.join('\n  - ')}`)
  }

  return {
    types: block.types ?? OPTIMIZE_DEFAULTS.types,
    png: { ...OPTIMIZE_DEFAULTS.png, ...block.png },
    jpeg: { ...OPTIMIZE_DEFAULTS.jpeg, ...block.jpeg },
    svg: block.svg === false ? false : { ...OPTIMIZE_DEFAULTS.svg, ...block.svg },
    webp: { ...OPTIMIZE_DEFAULTS.webp, ...block.webp },
    avif: { ...OPTIMIZE_DEFAULTS.avif, ...block.avif }
  }
}

/**
 * What the options of a run do to the images: the encoders, loaded.
 * @typedef {Object} Encoders
 * @property {(buffer: Buffer, ext: string) => Promise<Buffer|null>} optimize - The file
 *   again in its format, or null for a file the settings leave as it is
 * @property {(buffer: Buffer, ext: string, format: 'webp' | 'avif') => Promise<Buffer>} convert -
 *   The file in a second format
 */

/**
 * Load a package, or say which option needs it and how to install it.
 * @param {string} name - The package
 * @param {string} option - The option that needs it
 * @returns {Promise<any>} The module
 * @throws {Error} When the package is not installed
 */
async function loadPackage(name, option) {
  try {
    return await import(name)
  } catch (error) {
    throw new Error(
      `${option} needs the package ${name}, which is not installed. Run \`pnpm install\` in the repository root.`,
      { cause: error }
    )
  }
}

/**
 * Load the packages the options of a run need, and return the encoders. One file content is
 * encoded once in a run: the brands of an app share most of their files.
 * @param {OptimizeSettings} settings - The settings, of `resolveSettings()`
 * @param {{ optimize?: boolean, formats?: string[] }} options - Whether `--optimize` is
 *   given, and the formats of `--webp` and `--avif`
 * @returns {Promise<Encoders>}
 * @throws {Error} When a package is not installed, naming the option that needs it
 */
export async function loadEncoders(settings, options) {
  const formats = options.formats ?? []
  const option = [
    ...(options.optimize ? ['--optimize'] : []),
    ...formats.map((f) => `--${f}`)
  ].join(', ')
  const sharp = (await loadPackage(RASTER_PACKAGE, option)).default
  const svgo =
    options.optimize && settings.svg ? await loadPackage(SVG_PACKAGE, '--optimize') : null

  /** @type {Map<string, Promise<Buffer|null>>} */
  const cache = new Map()
  /**
   * @param {string} operation
   * @param {Buffer} buffer
   * @param {() => Promise<Buffer|null>} encode
   */
  const once = (operation, buffer, encode) => {
    const key = `${operation}:${crypto.createHash('sha1').update(buffer).digest('hex')}`
    let result = cache.get(key)
    if (!result) {
      result = encode()
      cache.set(key, result)
    }
    return result
  }

  // The color profile is kept, and a JPEG is turned as its orientation says, which is
  // lost with the rest of its metadata
  /** @param {Buffer} buffer @param {string} ext */
  const image = (buffer, ext) => {
    const pipeline = sharp(buffer).keepIccProfile()
    return JPEG.includes(ext) ? pipeline.rotate() : pipeline
  }

  return {
    optimize(buffer, ext) {
      if (PNG.includes(ext)) {
        // `effort` and `quality` turn the palette on, which changes pixels: the lossless
        // encoding sets the compression level only
        const { quality } = settings.png
        return once('png', buffer, () =>
          image(buffer, ext)
            .png(
              quality === null
                ? { compressionLevel: 9, palette: false }
                : { compressionLevel: 9, palette: true, quality, effort: 10 }
            )
            .toBuffer()
        )
      }
      if (JPEG.includes(ext)) {
        const { quality } = settings.jpeg
        if (quality === null) return Promise.resolve(null)
        return once('jpeg', buffer, () =>
          image(buffer, ext).jpeg({ quality, mozjpeg: true }).toBuffer()
        )
      }
      if (ext === '.svg' && svgo && settings.svg) {
        const { precision } = settings.svg
        return once('svg', buffer, async () =>
          Buffer.from(svgo.optimize(buffer.toString('utf-8'), svgOptions(precision)).data)
        )
      }
      return Promise.resolve(null)
    },

    convert(buffer, ext, format) {
      // A PNG is encoded without a loss when the format says so. A JPEG has lost already
      const { quality, lossless } = settings[format]
      const exact = lossless && PNG.includes(ext)
      return /** @type {Promise<Buffer>} */ (
        once(format, buffer, () =>
          format === 'webp'
            ? image(buffer, ext)
                .webp(exact ? { lossless: true, effort: 6 } : { quality, effort: 6 })
                .toBuffer()
            : image(buffer, ext)
                .avif(exact ? { lossless: true, effort: 4 } : { quality, effort: 4 })
                .toBuffer()
        )
      )
    }
  }
}

/**
 * Run a function over a list, a few at a time.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => Promise<void>} run
 */
async function each(items, run) {
  const queue = [...items]
  const workers = Array.from({ length: Math.min(8, os.availableParallelism()) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await run(item)
    }
  })
  await Promise.all(workers)
}

/**
 * The file name of an image in a second format.
 * @param {string} fileName
 * @param {string} format - A key of `IMAGE_FORMATS`
 * @returns {string|null} The name, or null for a file a second format is not written from
 * @example
 * formatName('hero@2x.png', 'webp') // Returns: 'hero@2x.webp'
 * formatName('logo.svg', 'webp') // Returns: null
 */
export function formatName(fileName, format) {
  const ext = path.extname(fileName)
  if (![...PNG, ...JPEG].includes(ext.toLowerCase())) return null
  return fileName.slice(0, -ext.length) + IMAGE_FORMATS[format]
}

/**
 * Optimize the images of the output of one job, and write them in the second formats.
 *
 * A file is written again under its name only when the result is smaller. A second format
 * is written beside the file (`beside`), or in place of it when it is smaller (`replace`).
 * A file of the source that has the name of a second format is kept: the file the designer
 * exported wins over the one the build would write.
 * @param {string} jobDir - The output folder of the job
 * @param {Object} options
 * @param {OptimizeSettings} options.settings - The settings, of `resolveSettings()`
 * @param {Encoders} options.encoders - The encoders, of `loadEncoders()`
 * @param {boolean} [options.optimize] - Whether the files are written again in their format
 * @param {Record<string, 'beside' | 'replace'>} [options.formats] - The second formats of
 *   the job, each with where it is written
 * @param {(file: string) => boolean} [options.fromSource] - Whether a file of the output
 *   was copied from the source in this run. Default: every file that exists
 * @returns {Promise<{ optimized: number, saved: number, generated: number, failed: Array<{ file: string, message: string }> }>}
 *   The files written again, the bytes that saved, the files written in a second format,
 *   and the files that could not be read
 */
export async function optimizeJob(jobDir, options) {
  const { settings, encoders, formats = {} } = options
  const fromSource = options.fromSource ?? ((file) => fs.existsSync(file))
  const result = {
    optimized: 0,
    saved: 0,
    generated: 0,
    failed: /** @type {Array<{ file: string, message: string }>} */ ([])
  }

  const files = settings.types.flatMap((type) => {
    const dir = path.join(jobDir, type)
    if (!fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath, entry.name))
  })
  // A PNG before a JPEG of its name, so that the same file gets a name both ask for
  files.sort(
    (a, b) =>
      Number(JPEG.includes(path.extname(a).toLowerCase())) -
        Number(JPEG.includes(path.extname(b).toLowerCase())) || a.localeCompare(b)
  )

  // The names of the second formats that are taken: by a file of the source, or by the
  // first of two files that ask for one
  /** @type {Set<string>} */
  const claimed = new Set()
  /** @type {Array<{ file: string, targets: Array<{ format: string, target: string, mode: string }> }>} */
  const work = files.map((file) => {
    const targets = []
    for (const [format, mode] of Object.entries(formats)) {
      const name = formatName(path.basename(file), format)
      if (name === null) continue
      const target = path.join(path.dirname(file), name)
      if (claimed.has(target) || (fs.existsSync(target) && fromSource(target))) continue
      claimed.add(target)
      targets.push({ format, target, mode })
    }
    return { file, targets }
  })

  await each(work, async ({ file, targets }) => {
    const ext = path.extname(file).toLowerCase()
    try {
      const original = fs.readFileSync(file)
      /** @type {Buffer} */
      let current = original

      if (options.optimize) {
        const smaller = await encoders.optimize(original, ext)
        if (smaller && smaller.length < original.length) {
          fs.writeFileSync(file, smaller)
          current = smaller
          result.optimized++
          result.saved += original.length - smaller.length
        }
      }

      for (const { format, target, mode } of targets) {
        const converted = await encoders.convert(
          original,
          ext,
          /** @type {'webp'|'avif'} */ (format)
        )
        if (mode === 'replace' && converted.length >= current.length) {
          // The file stays as it is. A file of an earlier build under the name goes
          fs.rmSync(target, { force: true })
          continue
        }
        fs.writeFileSync(target, converted)
        result.generated++
        if (mode === 'replace') {
          fs.rmSync(file)
          break
        }
      }
    } catch (error) {
      result.failed.push({ file, message: /** @type {Error} */ (error).message })
    }
  })

  result.failed.sort((a, b) => a.file.localeCompare(b.file))
  return result
}
