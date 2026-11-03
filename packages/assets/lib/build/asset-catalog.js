/**
 * Asset catalogs: the layout that `--asset-catalog` turns on.
 *
 * The images of a job are moved from their type folder into an Xcode asset catalog, one
 * image set per base name, with the `Contents.json` files Xcode writes. Node.js modules
 * only: the catalog is folders and JSON.
 *
 * @module asset-catalog
 */

import fs from 'fs'
import path from 'path'
import { extractResolutionIndicator } from './processors/shared.js'

/** @import { Catalog } from '../types.js' */

/** The extension of the folder of an image set. */
export const IMAGE_SET = '.imageset'

/** The name of the file that describes a catalog, a folder of it or an image set. */
export const CONTENTS = 'Contents.json'

/** What every `Contents.json` of a catalog ends with. */
const CATALOG_INFO = { info: { author: 'xcode', version: 1 } }

/** The slots of an image set, by the resolution indicator of a name. */
const SCALES = { '': '1x', '@1x': '1x', '@2x': '2x', '@3x': '3x' }

/** The raster formats an image set takes, the first one first when two share a slot. */
const RASTER_FORMATS = ['.png', '.jpg', '.jpeg']

/** The vector formats an image set takes as its one file. */
const VECTOR_FORMATS = ['.svg', '.pdf']

/** The name of a file for the light appearance, with the name it shares with its dark file. */
const LIGHT_NAME = /^(.+)_light$/

/** What `Contents.json` says of a file of the dark appearance. */
const DARK_APPEARANCE = [{ appearance: 'luminosity', value: 'dark' }]

/** A paint of an SVG, as an attribute or a CSS property, with its value. */
const SVG_PAINT =
  /(?<![\w-])(?:fill|stroke|color|stop-color|flood-color|lighting-color)\s*[=:]\s*["']?([^"';\s>}!]+)/gi

/** The values of a paint that give a file no color of its own. */
const NO_COLOR = ['currentcolor', 'none', 'transparent', 'inherit']

/**
 * An image set: its name and its files.
 * @typedef {Object} ImageSet
 * @property {string} name - The base name of its files
 * @property {boolean} vector - Whether it holds one vector file per appearance in place of
 *   raster variants
 * @property {Array<{ file: string, scale?: string, dark?: boolean }>} images - The files, a
 *   raster with its slot, and a file of the dark appearance marked
 * @property {boolean} [template] - Whether it renders as a template, in the tint of its view
 */

/**
 * Join the sets of `<name>_light` and `<name>_dark` into one set `<name>`, the dark files in
 * the row of the dark appearance. A pair stays apart when one is vector and the other raster,
 * or when a set of `<name>` exists already.
 * @param {ImageSet[]} sets
 * @returns {ImageSet[]} The sets, with the pairs joined
 */
function joinAppearances(sets) {
  const byName = new Map(sets.map((set) => [set.name, set]))
  for (const light of sets) {
    const name = LIGHT_NAME.exec(light.name)?.[1]
    if (!name || byName.has(name)) continue
    const dark = byName.get(`${name}_dark`)
    if (!dark || dark.vector !== light.vector) continue

    byName.delete(light.name)
    byName.delete(dark.name)
    byName.set(name, {
      name,
      vector: light.vector,
      images: [...light.images, ...dark.images.map((image) => ({ ...image, dark: true }))]
    })
  }
  return [...byName.values()]
}

/**
 * Sort the files of one folder into image sets. Files of one base name are one set: the
 * raster variants in the slots of their indicators, or, where there is no raster, one vector
 * file. A file that has no place in a set is left: a format or an indicator an image set
 * does not take, a vector beside rasters of its name, a second file for a slot. The sets of
 * `<name>_light` and `<name>_dark` are one set of two appearances.
 * @param {string[]} fileNames - The names of the files of the folder
 * @returns {{ sets: ImageSet[], left: string[] }} The sets by name, and the files left
 * @example
 * planImageSets(['logo.png', 'logo@2x.png', 'logo.svg', 'logo@4x.png'])
 * // Returns: { sets: [{ name: 'logo', vector: false, images: [
 * //   { file: 'logo.png', scale: '1x' }, { file: 'logo@2x.png', scale: '2x' }] }],
 * //   left: ['logo.svg', 'logo@4x.png'] }
 */
export function planImageSets(fileNames) {
  /** @type {Map<string, { rasters: Record<string, string>, vectors: string[] }>} */
  const groups = new Map()
  /** @type {string[]} */
  const left = []

  /** @param {string} fileName */
  const rank = (fileName) => {
    const { resolution, ext } = extractResolutionIndicator(fileName)
    const format = ext.toLowerCase()
    const formats = RASTER_FORMATS.includes(format) ? RASTER_FORMATS : VECTOR_FORMATS
    return formats.indexOf(format) * 2 + (resolution ? 1 : 0)
  }

  // The file that takes a slot is the first in the order of the formats, and the one
  // without an indicator before `@1x`
  const ordered = [...fileNames].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  for (const fileName of ordered) {
    const { base, resolution, ext } = extractResolutionIndicator(fileName)
    const format = ext.toLowerCase()
    const scale = SCALES[resolution]
    const isRaster = RASTER_FORMATS.includes(format) && scale !== undefined
    const isVector = VECTOR_FORMATS.includes(format) && resolution === ''
    if (!isRaster && !isVector) {
      left.push(fileName)
      continue
    }

    const group = groups.get(base) ?? { rasters: {}, vectors: [] }
    groups.set(base, group)
    if (isVector) {
      group.vectors.push(fileName)
    } else if (group.rasters[scale]) {
      left.push(fileName)
    } else {
      group.rasters[scale] = fileName
    }
  }

  /** @type {ImageSet[]} */
  const sets = []
  for (const [name, { rasters, vectors }] of groups) {
    const scales = Object.keys(rasters).sort()
    if (scales.length > 0) {
      sets.push({
        name,
        vector: false,
        images: scales.map((scale) => ({ file: rasters[scale], scale }))
      })
      left.push(...vectors)
    } else {
      sets.push({ name, vector: true, images: [{ file: vectors[0] }] })
      left.push(...vectors.slice(1))
    }
  }

  return {
    sets: joinAppearances(sets).sort((a, b) => a.name.localeCompare(b.name)),
    left: left.sort()
  }
}

/**
 * The `Contents.json` of an image set, as Xcode writes it: the three slots of a raster
 * image, the empty ones without a file, or the one file of a vector image, which keeps its
 * vector data so that it stays sharp at any size. A set with a dark file has the rows of the
 * dark appearance too.
 * @param {ImageSet} set
 * @returns {string} The text of the file
 */
export function imageSetContents(set) {
  /** @param {boolean} dark */
  const slots = (dark) =>
    ['1x', '2x', '3x'].map((scale) => {
      const image = set.images.find(
        (candidate) => candidate.scale === scale && Boolean(candidate.dark) === dark
      )
      return {
        ...(dark ? { appearances: DARK_APPEARANCE } : {}),
        ...(image ? { filename: image.file } : {}),
        idiom: 'universal',
        scale
      }
    })

  const hasDark = set.images.some((image) => image.dark)
  const contents = set.vector
    ? {
        images: set.images.map((image) => ({
          ...(image.dark ? { appearances: DARK_APPEARANCE } : {}),
          filename: image.file,
          idiom: 'universal'
        })),
        ...CATALOG_INFO,
        properties: {
          'preserves-vector-representation': true,
          ...(set.template ? { 'template-rendering-intent': 'template' } : {})
        }
      }
    : {
        images: [...slots(false), ...(hasDark ? slots(true) : [])],
        ...CATALOG_INFO
      }
  return `${JSON.stringify(contents, null, 2)}\n`
}

/**
 * The `Contents.json` of a catalog or of a folder of it. A folder provides a namespace: an
 * image of `logo/` is named `logo/<name>`, since a name is unique within its folder only.
 * @param {boolean} namespace - Whether it is of a folder inside the catalog
 * @returns {string} The text of the file
 */
export function folderContents(namespace) {
  const contents = namespace
    ? { ...CATALOG_INFO, properties: { 'provides-namespace': true } }
    : CATALOG_INFO
  return `${JSON.stringify(contents, null, 2)}\n`
}

/**
 * The paths a file of a type folder can have inside the catalog, when it is in an image set:
 * the set of its base name, and the set it shares with the file of the other appearance.
 * @param {Catalog} catalog - The catalog, of the processor
 * @param {string} subFolder - The folder of the file under the type folder, or ''
 * @param {string} fileName - The name of the file in the output
 * @returns {string[]} The paths, relative to the output of the job
 */
export function catalogPaths(catalog, subFolder, fileName) {
  const { base } = extractResolutionIndicator(fileName)
  const name = /^(.+)_(?:light|dark)$/.exec(base)?.[1]
  return [
    catalogPath(catalog, subFolder, fileName),
    ...(name ? [path.join(catalog.name, subFolder, name + IMAGE_SET, fileName)] : [])
  ]
}

/**
 * The path a file of a type folder has inside the catalog, when it is in the set of its name.
 * @param {Catalog} catalog - The catalog, of the processor
 * @param {string} subFolder - The folder of the file under the type folder, or ''
 * @param {string} fileName - The name of the file in the output
 * @returns {string} The path, relative to the output of the job
 * @example
 * catalogPath({ type: 'images', name: 'Assets.xcassets' }, 'logo', 'mark@2x.png')
 * // Returns: 'Assets.xcassets/logo/mark.imageset/mark@2x.png'
 */
export function catalogPath(catalog, subFolder, fileName) {
  const { base } = extractResolutionIndicator(fileName)
  return path.join(catalog.name, subFolder, base + IMAGE_SET, fileName)
}

/**
 * Whether the text of an SVG paints only in `currentcolor`, so that it has no color of its
 * own and can take the tint of its view. Another color or a gradient would be lost in a tint.
 * @param {string} text - The text of the SVG
 * @returns {boolean}
 * @example
 * isTemplateSvg('<svg fill="currentcolor"><path fill="#e11"/></svg>') // Returns: false
 */
export function isTemplateSvg(text) {
  const paints = [...text.matchAll(SVG_PAINT)].map((match) => match[1].toLowerCase())
  return paints.includes('currentcolor') && paints.every((paint) => NO_COLOR.includes(paint))
}

/**
 * Move the images of a folder of the output into a catalog, recursively: each image set gets
 * a folder with its files and a `Contents.json`, and each subfolder becomes a folder of the
 * catalog with a namespace. A file without a place in a set stays where it is. A folder
 * without an image set is not written.
 * @param {string} dir - The folder of the images in the output
 * @param {string} catalogDir - The catalog, or the folder of it that `dir` becomes
 * @param {boolean} [namespace] - Whether `catalogDir` is a folder inside the catalog
 * @param {boolean} [icons] - Whether the files are icons, whose SVG text is read
 * @returns {{ sets: number, left: string[] }} The number of image sets, and the files that
 *   stay, by their paths
 */
export function writeCatalog(dir, catalogDir, namespace = false, icons = false) {
  const result = { sets: 0, left: /** @type {string[]} */ ([]) }
  if (!fs.existsSync(dir)) return result

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  const { sets: planned, left } = planImageSets(files)

  // What the text of an icon says: a sprite of <symbol> elements is no image, and an icon that
  // paints only in `currentcolor` takes the tint of its view
  const sets = []
  for (const set of planned) {
    const text =
      icons && set.vector
        ? set.images
            .filter(({ file }) => path.extname(file).toLowerCase() === '.svg')
            .map(({ file }) => fs.readFileSync(path.join(dir, file), 'utf8'))
            .join('')
        : ''
    if (text.includes('<symbol')) {
      left.push(...set.images.map(({ file }) => file))
      continue
    }
    sets.push(isTemplateSvg(text) ? { ...set, template: true } : set)
  }

  for (const set of sets) {
    // An image set of an earlier build may hold a file that the set no longer has
    const setDir = path.join(catalogDir, set.name + IMAGE_SET)
    fs.rmSync(setDir, { recursive: true, force: true })
    fs.mkdirSync(setDir, { recursive: true })
    for (const { file } of set.images) {
      fs.renameSync(path.join(dir, file), path.join(setDir, file))
    }
    fs.writeFileSync(path.join(setDir, CONTENTS), imageSetContents(set))
  }
  result.sets += sets.length
  result.left.push(...left.map((file) => path.join(dir, file)))

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const inner = writeCatalog(
      path.join(dir, entry.name),
      path.join(catalogDir, entry.name),
      true,
      icons
    )
    result.sets += inner.sets
    result.left.push(...inner.left)
  }

  if (result.sets > 0) {
    fs.writeFileSync(path.join(catalogDir, CONTENTS), folderContents(namespace))
  }
  return result
}
