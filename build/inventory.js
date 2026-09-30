/**
 * @file inventory.js
 * @description Reads the source layers and returns the assets of a job: for each, the
 *              files of the last layer that has it, with the rule of an image and the
 *              family of a font. The reading is passed in, so that a test gives it a
 *              tree in memory.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { createHash } from 'node:crypto'
import { open, readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { compose } from './assets.js'
import { mapLimit } from './concurrency.js'
import { BuildError, errorOf } from './errors.js'
import { FONTS_MANIFEST, checkFontsManifest } from './manifests/fonts.js'
import { IMAGES_MANIFEST, checkImagesManifest } from './manifests/images.js'
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
import { layers as layersOf } from './plan.js'

/**
 * @import { Asset, AssetType, Config, Layer, Problem, Source, SourceEntry, SourceFile,
 *   SourceReader } from './types.js'
 */

/** How many files are open at a time. */
const OPEN_FILES = 32

/** What image-size reads of a file to find its size, in bytes. */
const HEADER_BYTES = 512 * 1024

const LFS_POINTER = 'version https://git-lfs.github.com/spec/'

/** The manifest of a type folder, and what checks it. */
const MANIFESTS = {
  images: { name: IMAGES_MANIFEST, check: checkImagesManifest, key: 'rules' },
  fonts: { name: FONTS_MANIFEST, check: checkFontsManifest, key: 'families' }
}

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
 * What is wrong with a file that is a Git LFS pointer.
 * @param {string} file - The path of the file, from the root.
 * @returns {Problem}
 */
export function lfsPointerProblem(file) {
  return {
    rule: 'real-files',
    file,
    message: 'is a Git LFS pointer, not the file. Install Git LFS and run `git lfs pull`'
  }
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
 * @returns {Promise<SourceFile[]>} Sorted by path.
 */
async function walk(reader, layer, type, folder = '') {
  const here = [layer, type, folder].filter(Boolean).join('/')
  const entries = (await reader.list(here)) ?? []
  /** @type {SourceFile[]} */
  const files = []
  for (const entry of [...entries].sort((a, b) => byCodeUnit(a.name, b.name))) {
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
 * Reads the manifest of a type folder of a layer, and takes it out of the files.
 * @param {SourceReader} reader
 * @param {SourceFile[]} files - The files of the layer. The manifest is removed.
 * @param {string} layer
 * @param {'images' | 'fonts'} type
 * @returns {Promise<{ entries: any[], problems: Problem[] }>} The rules or the families
 *   of the manifest. Empty without a manifest, and when it is wrong.
 */
async function readManifest(reader, files, layer, type) {
  const { name, check } = MANIFESTS[type]
  const file = `${layer}/${type}/${name}`
  const index = files.findIndex((entry) => entry.path === file)
  if (index === -1) return { entries: [], problems: [] }
  files.splice(index, 1)

  try {
    const text = Buffer.from(await reader.read(file)).toString('utf8')
    let raw
    try {
      raw = JSON.parse(text)
    } catch (error) {
      throw new BuildError(`${file}: is not JSON (${error.message})`, { file, rule: 'manifest' })
    }
    return { entries: check(raw, file), problems: [] }
  } catch (error) {
    if (!(error instanceof BuildError)) throw error
    const message = error.message.replace(`${file}: `, '')
    return { entries: [], problems: [{ rule: 'manifest', file, message }] }
  }
}

/**
 * Reads a layer: the files of its type folders, the sizes of its images, and its
 * manifests. What is wrong with the layer is returned, not thrown, so that the lint can
 * list everything.
 * @param {SourceReader} reader
 * @param {string} layer - The folder of the layer: `source/default/docs`.
 * @param {Object} [options]
 * @param {boolean} [options.content] - Reads every file, for its hash and to see whether
 *   it is a Git LFS pointer. The lint asks for it.
 * @returns {Promise<Layer | null>} `null` when the layer does not exist.
 */
export async function readLayer(reader, layer, { content = false } = {}) {
  const entries = await reader.list(layer)
  if (entries === null) return null

  /** @type {SourceFile[]} */
  const files = []
  /** @type {Problem[]} */
  const problems = []
  for (const entry of [...entries].sort((a, b) => byCodeUnit(a.name, b.name))) {
    if (isSystemFile(entry.name)) continue
    const type = ASSET_TYPES.find((name) => name === entry.name)
    if (type && entry.directory) {
      files.push(...(await walk(reader, layer, type)))
    } else {
      problems.push({
        rule: 'known-types',
        file: `${layer}/${entry.name}`,
        message: `is outside a type folder. A layer holds the folders ${ASSET_TYPES.join(', ')}`
      })
    }
  }

  const images = await readManifest(reader, files, layer, 'images')
  const fonts = await readManifest(reader, files, layer, 'fonts')
  problems.push(...images.problems, ...fonts.problems)

  /** @type {Set<string>} */
  const pointers = new Set()
  if (content) {
    await mapLimit(files, OPEN_FILES, async (file) => {
      const bytes = await reader.read(file.path)
      if (isLfsPointer(bytes)) pointers.add(file.path)
      else file.sha256 = createHash('sha256').update(bytes).digest('hex')
    })
  }

  const sized = files.filter(
    (file) => file.type === 'images' && IMAGE_EXTENSIONS.includes(file.extension.toLowerCase())
  )
  await mapLimit(sized, OPEN_FILES, async (file) => {
    if (pointers.has(file.path)) return
    const size = await reader.size(file.path)
    if (size) {
      file.width = size.width
      file.height = size.height
    } else if (file.extension.toLowerCase() !== '.svg') {
      if (file.bytes <= 1024 && isLfsPointer(await reader.read(file.path))) pointers.add(file.path)
      else {
        problems.push({
          rule: 'real-files',
          file: file.path,
          message: 'is not an image whose size can be read'
        })
      }
    }
  })
  problems.push(...[...pointers].map(lfsPointerProblem))

  return {
    path: layer,
    files,
    rules: images.entries,
    families: fonts.entries,
    problems: problems.sort((a, b) => byCodeUnit(a.file, b.file))
  }
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
 * Reads the layers of a job that exist.
 * @param {string[]} layers - The source folders in override order, as a job has them.
 * @param {SourceReader} reader
 * @param {Object} [options] - As `readLayer`.
 * @param {(layer: string) => Promise<Layer | null>} [options.read] - What reads a layer.
 *   A caller that reads many jobs passes one that remembers.
 * @param {boolean} [options.content]
 * @returns {Promise<{ layers: Layer[], problems: Problem[] }>} `problems` has the layers
 *   that are missing and that every app needs.
 */
export async function readLayers(layers, reader, options = {}) {
  const read = options.read ?? ((layer) => readLayer(reader, layer, options))
  /** @type {Layer[]} */
  const found = []
  /** @type {Problem[]} */
  const problems = []
  for (const layer of layers) {
    const data = await read(layer)
    if (data) found.push(data)
    else if (isRequired(layer)) {
      problems.push({
        rule: 'layers',
        file: `${layer}/`,
        message: 'is missing. Every app has a folder in the first layer'
      })
    }
  }
  return { layers: found, problems }
}

/**
 * Reads the assets of a job.
 * @param {string[]} layers - The source folders in override order, as a job has them.
 * @param {SourceReader} [reader] - The reader of the file system without it.
 * @returns {Promise<Asset[]>} Sorted by id.
 * @throws {BuildError} The first thing that is wrong: a layer that every app needs is
 *   missing, a layer holds something outside a type folder, a manifest is wrong or names
 *   a file that does not exist, a file is a Git LFS pointer, or an image cannot be read.
 */
export async function readInventory(layers, reader = fsReader()) {
  const read = await readLayers(layers, reader)
  const { assets, problems } = compose(read.layers)
  const [first] = [...read.problems, ...problems]
  if (first) throw errorOf(first)
  return assets
}

/**
 * Reads the whole of `source/` for the lint: the layers of every brand and app of the
 * configuration, each once and with the hash of every file, and the folders of `source/`.
 * @param {Config} config
 * @param {SourceReader} [reader] - The reader of the file system without it.
 * @returns {Promise<Source>}
 */
export async function readSource(config, reader = fsReader()) {
  /** @type {Map<string, Promise<Layer | null>>} */
  const layers = new Map()
  const read = (/** @type {string} */ layer) => {
    if (!layers.has(layer)) layers.set(layer, readLayer(reader, layer, { content: true }))
    return layers.get(layer)
  }

  const stacks = []
  for (const brand of config.brands) {
    for (const app of Object.keys(config.apps)) {
      const found = await readLayers(layersOf(brand, app), reader, { read })
      stacks.push({ brand, app, ...found })
    }
  }

  /** @type {Record<string, SourceEntry[]>} */
  const folders = {}
  const list = async (/** @type {string} */ folder) =>
    ((await reader.list(folder)) ?? [])
      .filter((entry) => !isSystemFile(entry.name))
      .sort((a, b) => byCodeUnit(a.name, b.name))
  folders[SOURCE] = await list(SOURCE)
  for (const entry of folders[SOURCE]) {
    if (!entry.directory || ![DEFAULT_LAYER, ...config.brands].includes(entry.name)) continue
    folders[`${SOURCE}/${entry.name}`] = await list(`${SOURCE}/${entry.name}`)
  }
  return { config, folders, stacks }
}
