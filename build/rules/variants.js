/**
 * @file rules/variants.js
 * @description The files of an image: its master, or the variants that its rule asks for,
 *              each with its name, its size in pixels and the step that makes it.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { BuildError } from '../errors.js'
import { QUALITY, derives } from '../manifests/images.js'

/** @import { Asset, Job, PlannedFile, SourceFile } from '../types.js' */

/** The format of a file, by its extension. */
const FORMAT_OF = {
  '.png': 'png',
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.webp': 'webp',
  '.avif': 'avif',
  '.gif': 'gif',
  '.svg': 'svg'
}

/** The extension of a format. */
const EXTENSION_OF = { png: '.png', jpeg: '.jpg', webp: '.webp', avif: '.avif', svg: '.svg' }

/**
 * Whether the rule of an image leaves the platform of a job out.
 * @param {Asset} asset
 * @param {Job} job
 * @returns {boolean}
 */
export function isLeftOut(asset, job) {
  const platforms = asset.rule?.platforms
  return platforms !== undefined && !platforms.includes(job.platform)
}

/**
 * @param {SourceFile} file
 * @returns {string | undefined} The format of a file, from its extension.
 */
export function formatOf(file) {
  return FORMAT_OF[file.extension.toLowerCase()]
}

/**
 * The name of a variant: `<name>[-<size>][@<density>x].<extension>`. The variant at 1x
 * has no indicator.
 * @param {string} name - The name of the image.
 * @param {Object} variant
 * @param {string} [variant.size] - The name of a size.
 * @param {number} variant.density
 * @param {string} variant.format
 * @returns {string}
 */
export function variantName(name, { size, density, format }) {
  const indicator = density === 1 ? '' : `@${density}x`
  return `${name}${size ? `-${size}` : ''}${indicator}${EXTENSION_OF[format]}`
}

/**
 * Rounds half up. A size in pixels is never negative, so it is what `Math.round` does.
 * @param {number} value
 * @returns {number}
 */
const round = (value) => Math.round(value)

/**
 * The master of an image: its one file.
 * @param {Asset} asset
 * @returns {SourceFile}
 * @throws {BuildError} When the image has more than one file.
 */
function masterOf(asset) {
  if (asset.files.length > 1) {
    const files = asset.files.map((file) => file.path).join(', ')
    throw new BuildError(
      `${asset.id}: has ${asset.files.length} files, and its rule derives the variants from ` +
        `one master (${files})`,
      { file: asset.files[0].path, rule: 'one-master' }
    )
  }
  return asset.files[0]
}

/**
 * Plans the variants of an image whose rule derives them.
 *
 * The width of a variant is the width of the master times the density of the variant,
 * divided by the density of the master. For a size, it is the width of the size times
 * the density. The height follows from the ratio of the master. Both are rounded half up.
 * An SVG master has no density: its size is its size at 1x.
 * @param {Asset} asset - An image with a rule.
 * @returns {Array<{ name: string, size?: string, density: number, format: string,
 *   width: number, height: number, master: boolean }>} The variants, each with its file
 *   name. `master` says that the variant is the master itself.
 * @throws {BuildError} When the image has two files, when its master has no size or a
 *   format that the build does not read, or when a variant would scale the master up.
 */
export function variantsOf(asset) {
  const master = masterOf(asset)
  const { rule } = asset
  /** @type {(message: string, name?: string) => never} */
  const fail = (message, name = 'manifest') => {
    throw new BuildError(`${master.path}: ${message}`, { file: master.path, rule: name })
  }

  const from = formatOf(master)
  if (!from || from === 'gif') fail('is not a file that the build derives variants from')
  if (master.width === undefined || master.height === undefined) {
    fail('does not say its size, which the variants are computed from', 'real-files')
  }
  const vector = from === 'svg'
  const formats = rule.formats ?? [from]
  if (!vector && formats.includes('svg')) fail('is not an SVG file, and its rule asks for "svg"')

  const masterDensity = vector ? 1 : master.density
  const densities = rule.densities ?? [masterDensity]
  const sizes = [undefined, ...Object.keys(rule.sizes ?? {})]

  const variants = []
  for (const format of formats) {
    if (format === 'svg') {
      const { width, height } = master
      variants.push({ name: `${asset.name}.svg`, density: 1, format, width, height, master: true })
      continue
    }
    for (const size of sizes) {
      for (const density of densities) {
        const width = size
          ? rule.sizes[size] * density
          : round((master.width * density) / masterDensity)
        const height = size
          ? round((width * master.height) / master.width)
          : round((master.height * density) / masterDensity)
        if (!vector && (density > masterDensity || width > master.width)) {
          const what = size ? `the size "${size}" at ${density}x` : `the density ${density}`
          fail(
            `${what} is ${width} pixels wide, and the master is ${master.width} at ` +
              `${masterDensity}x. The build never scales up`,
            'no-scaling-up'
          )
        }
        variants.push({
          name: variantName(asset.name, { size, density, format }),
          ...(size ? { size } : {}),
          density,
          format,
          width,
          height,
          master: !size && density === masterDensity && format === from
        })
      }
    }
  }
  return variants
}

/**
 * Plans the files of an image for an output that keeps the folders and the names of the
 * source: the web.
 *
 * An image without a rule, or with a rule that derives nothing, is copied as it is, with
 * every file it has. So is an image whose rule says `committed`.
 * @param {Asset} asset - An image.
 * @returns {PlannedFile[]}
 * @throws {BuildError} As `variantsOf`.
 */
export function imageFiles(asset) {
  const folder = [asset.type, asset.folder].filter(Boolean).join('/')
  if (!derives(asset.rule)) {
    return asset.files.map((file) => {
      const { width, height, density } = file
      const size = width === undefined ? {} : { width, height, density }
      const name = file.path.slice(file.path.lastIndexOf('/') + 1)
      return { path: `${folder}/${name}`, type: asset.type, source: file.path, ...size }
    })
  }

  const master = masterOf(asset)
  return variantsOf(asset).map((variant) => {
    const { name, width, height, density, format } = variant
    /** @type {PlannedFile} */
    const file = { path: `${folder}/${name}`, type: asset.type, source: master.path }
    if (!variant.master) {
      const quality = asset.rule.quality?.[format] ?? QUALITY[format]
      file.step = {
        name: 'raster',
        params: { width, height, format, ...(quality === undefined ? {} : { quality }) }
      }
    }
    return { ...file, width, height, density }
  })
}
