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

/** @import { Catalog } from './types.js' */

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

/**
 * An image set: its name and its files.
 * @typedef {Object} ImageSet
 * @property {string} name - The base name of its files
 * @property {boolean} vector - Whether it holds one vector file in place of raster variants
 * @property {Array<{ file: string, scale?: string }>} images - The files, a raster with its slot
 */

/**
 * Sort the files of one folder into image sets. Files of one base name are one set: the
 * raster variants in the slots of their indicators, or, where there is no raster, one vector
 * file. A file that has no place in a set is left: a format or an indicator an image set
 * does not take, a vector beside rasters of its name, a second file for a slot.
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

  return { sets: sets.sort((a, b) => a.name.localeCompare(b.name)), left: left.sort() }
}

/**
 * The `Contents.json` of an image set, as Xcode writes it: the three slots of a raster
 * image, the empty ones without a file, or the one file of a vector image, which keeps its
 * vector data so that it stays sharp at any size.
 * @param {ImageSet} set
 * @returns {string} The text of the file
 */
export function imageSetContents(set) {
  const contents = set.vector
    ? {
        images: [{ filename: set.images[0].file, idiom: 'universal' }],
        ...CATALOG_INFO,
        properties: { 'preserves-vector-representation': true }
      }
    : {
        images: ['1x', '2x', '3x'].map((scale) => {
          const image = set.images.find((candidate) => candidate.scale === scale)
          return { ...(image ? { filename: image.file } : {}), idiom: 'universal', scale }
        }),
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
 * The path a file of a type folder has inside the catalog, when it is in an image set.
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
 * Move the images of a folder of the output into a catalog, recursively: each image set gets
 * a folder with its files and a `Contents.json`, and each subfolder becomes a folder of the
 * catalog with a namespace. A file without a place in a set stays where it is. A folder
 * without an image set is not written.
 * @param {string} dir - The folder of the images in the output
 * @param {string} catalogDir - The catalog, or the folder of it that `dir` becomes
 * @param {boolean} [namespace] - Whether `catalogDir` is a folder inside the catalog
 * @returns {{ sets: number, left: string[] }} The number of image sets, and the files that
 *   stay, by their paths
 */
export function writeCatalog(dir, catalogDir, namespace = false) {
  const result = { sets: 0, left: /** @type {string[]} */ ([]) }
  if (!fs.existsSync(dir)) return result

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  const { sets, left } = planImageSets(files)

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
    const inner = writeCatalog(path.join(dir, entry.name), path.join(catalogDir, entry.name), true)
    result.sets += inner.sets
    result.left.push(...inner.left)
  }

  if (result.sets > 0) {
    fs.writeFileSync(path.join(catalogDir, CONTENTS), folderContents(namespace))
  }
  return result
}
