/**
 * @file inventory.js
 * @description Walks the source layers of a job and returns its assets: for each, the
 *              files of the last layer that has it. The reading is passed in, so that a
 *              test gives it a tree in memory.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { open, readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { mapLimit } from './concurrency.js'
import { BuildError } from './errors.js'
import {
  ASSET_TYPES,
  DEFAULT_LAYER,
  IMAGE_EXTENSIONS,
  SHARED_LAYER,
  SOURCE,
  byCodeUnit,
  isSystemFile,
  parseFileName
} from './names.js'

/** @import { Asset, AssetType, SourceFile, SourceReader } from './types.js' */

/** How many files are open at a time. */
const OPEN_FILES = 32

/** What image-size reads of a file to find its size, in bytes. */
const HEADER_BYTES = 512 * 1024

const LFS_POINTER = 'version https://git-lfs.github.com/spec/'

/**
 * Whether the content of a file is a Git LFS pointer, and not the file it stands for.
 * @param {Uint8Array} content
 * @returns {boolean}
 */
export function isLfsPointer(content) {
  if (content.length > 1024) return false
  return Buffer.from(content.subarray(0, LFS_POINTER.length)).toString('latin1') === LFS_POINTER
}

/**
 * The error of a file that is a Git LFS pointer.
 * @param {string} file - The path of the file, from the root.
 * @returns {BuildError}
 */
export function lfsPointerError(file) {
  return new BuildError(
    `${file}: is a Git LFS pointer, not the file. Install Git LFS and run \`git lfs pull\``,
    { file, rule: 'real-files' }
  )
}

/**
 * Reads the first bytes of a file.
 * @param {string} file
 * @param {number} bytes
 * @returns {Promise<Uint8Array>}
 */
async function readHeader(file, bytes) {
  const handle = await open(file, 'r')
  try {
    const { size } = await handle.stat()
    const header = new Uint8Array(Math.min(size, bytes))
    await handle.read(header, 0, header.length, 0)
    return header
  } finally {
    await handle.close()
  }
}

/**
 * The reader of the file system. It imports `image-size` when it first reads a size.
 * @param {string} [root] - The folder that holds `source/`. The working directory
 *   without it.
 * @returns {SourceReader}
 */
export function fsReader(root = process.cwd()) {
  return {
    async list(folder) {
      const absolute = path.join(root, folder)
      let names
      try {
        names = await readdir(absolute)
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null
        throw error
      }
      return mapLimit(names.sort(byCodeUnit), OPEN_FILES, async (name) => {
        const stats = await stat(path.join(absolute, name))
        const directory = stats.isDirectory()
        return { name, directory, bytes: directory ? 0 : stats.size }
      })
    },

    async size(file) {
      const header = await readHeader(path.join(root, file), HEADER_BYTES)
      if (isLfsPointer(header)) throw lfsPointerError(file)
      const { imageSize } = await import('image-size')
      try {
        const { width, height } = imageSize(header)
        return width > 0 && height > 0 ? { width, height } : null
      } catch {
        return null
      }
    },

    read(file) {
      return readFile(path.join(root, file))
    }
  }
}

/**
 * Walks a type folder of a layer.
 * @param {SourceReader} reader
 * @param {string} layer
 * @param {AssetType} type
 * @param {string} [folder] - The folders below the type folder.
 * @returns {Promise<SourceFile[]>}
 */
async function walk(reader, layer, type, folder = '') {
  const here = [layer, type, folder].filter(Boolean).join('/')
  const entries = (await reader.list(here)) ?? []
  /** @type {SourceFile[]} */
  const files = []
  for (const entry of entries) {
    if (isSystemFile(entry.name)) continue
    if (entry.directory) {
      const below = folder ? `${folder}/${entry.name}` : entry.name
      files.push(...(await walk(reader, layer, type, below)))
    } else {
      files.push({
        path: `${here}/${entry.name}`,
        layer,
        type,
        folder,
        ...parseFileName(entry.name),
        bytes: entry.bytes
      })
    }
  }
  return files
}

/**
 * Reads a layer: the files of its type folders.
 * @param {SourceReader} reader
 * @param {string} layer
 * @returns {Promise<SourceFile[] | null>} `null` when the layer does not exist.
 * @throws {BuildError} When the layer holds something outside a type folder.
 */
async function readLayer(reader, layer) {
  const entries = await reader.list(layer)
  if (entries === null) return null

  /** @type {SourceFile[]} */
  const files = []
  for (const entry of entries) {
    if (isSystemFile(entry.name)) continue
    const type = ASSET_TYPES.find((name) => name === entry.name)
    if (!type || !entry.directory) {
      throw new BuildError(
        `${layer}/${entry.name}: is outside a type folder. ` +
          `A layer holds the folders ${ASSET_TYPES.join(', ')}`,
        { file: `${layer}/${entry.name}`, rule: 'known-types' }
      )
    }
    files.push(...(await walk(reader, layer, type)))
  }
  return files
}

/**
 * Reads the size of every image of a list, into the files.
 * @param {SourceReader} reader
 * @param {SourceFile[]} files
 * @throws {BuildError} When a raster image does not say its size.
 */
async function readSizes(reader, files) {
  const images = files.filter(
    (file) => file.type === 'images' && IMAGE_EXTENSIONS.includes(file.extension.toLowerCase())
  )
  await mapLimit(images, OPEN_FILES, async (file) => {
    const size = await reader.size(file.path)
    if (size) {
      file.width = size.width
      file.height = size.height
    } else if (file.extension.toLowerCase() !== '.svg') {
      throw new BuildError(`${file.path}: is not an image whose size can be read`, {
        file: file.path,
        rule: 'real-files'
      })
    }
  })
}

/**
 * Whether a layer is the one that every app needs: `source/default/<app>`.
 * @param {string} layer
 * @returns {boolean}
 */
function isRequired(layer) {
  const [source, brand, app, ...rest] = layer.split('/')
  return source === SOURCE && brand === DEFAULT_LAYER && app !== SHARED_LAYER && rest.length === 0
}

/**
 * Reads the assets of a job. A later layer overrides an asset of an earlier one, with
 * every file of it: the job takes the files of the last layer that has the asset.
 * @param {string[]} layers - The source folders in override order, as a job has them.
 * @param {SourceReader} [reader] - The reader of the file system without it.
 * @returns {Promise<Asset[]>} Sorted by id, and the files of each by path.
 * @throws {BuildError} When the layer of the app in `default` is missing, when a layer
 *   holds something outside a type folder, or when an image cannot be read.
 */
export async function readInventory(layers, reader = fsReader()) {
  /** @type {Map<string, Asset>} */
  const assets = new Map()
  for (const layer of layers) {
    const files = await readLayer(reader, layer)
    if (files === null) {
      if (!isRequired(layer)) continue
      throw new BuildError(`${layer}/: is missing. Every app has a folder in the first layer`, {
        file: layer,
        rule: 'layers'
      })
    }

    /** @type {Map<string, Asset>} */
    const ofLayer = new Map()
    for (const file of files) {
      const { type, folder, name } = file
      const id = [type, folder, name].filter(Boolean).join('/')
      if (!ofLayer.has(id)) ofLayer.set(id, { type, id, folder, name, files: [] })
      ofLayer.get(id).files.push(file)
    }
    for (const [id, asset] of ofLayer) assets.set(id, asset)
  }

  // Sorted here, so that the order does not depend on the order of the reader
  const taken = [...assets.values()].sort((a, b) => byCodeUnit(a.id, b.id))
  for (const asset of taken) asset.files.sort((a, b) => byCodeUnit(a.path, b.path))
  await readSizes(
    reader,
    taken.flatMap((asset) => asset.files)
  )
  return taken
}
