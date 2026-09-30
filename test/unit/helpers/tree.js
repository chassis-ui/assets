/**
 * @file helpers/tree.js
 * @description Source trees for the tests: one in memory for the inventory, and one in a
 *              scratch folder for what writes files. No test reads the real `source/`.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach } from 'vitest'

/** @import { SourceReader } from '../../../build/types.js' */

/**
 * The first bytes of a PNG file of a size: the signature and the header. It is enough to
 * read the size from. It is not an image that a tool can decode.
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function png(width, height) {
  const header = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header)
  header.writeUInt32BE(13, 8)
  header.write('IHDR', 12, 'latin1')
  header.writeUInt32BE(width, 16)
  header.writeUInt32BE(height, 20)
  header.writeUInt8(8, 24)
  header.writeUInt8(6, 25)
  return header
}

/**
 * An SVG file of a size.
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function svg(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"/>\n`
}

/** What Git LFS leaves in the place of a file that was not pulled. */
export const LFS_POINTER =
  'version https://git-lfs.github.com/spec/v1\n' +
  'oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393\n' +
  'size 12345\n'

/**
 * A reader of a tree in memory.
 * @param {Record<string, string | object | { width?: number, height?: number,
 *   bytes?: number, content?: string }>} tree - The files by their path from the root. A
 *   file is its content as text, a manifest as an object with `version`, or an object
 *   with the size of an image.
 * @returns {SourceReader}
 */
export function memoryReader(tree) {
  const paths = Object.keys(tree)
  const contentOf = (/** @type {string} */ file) => {
    const value = tree[file]
    if (typeof value === 'string') return value
    if ('version' in value) return JSON.stringify(value)
    return value.content ?? `the content of ${file}`
  }
  return {
    async list(folder) {
      const below = paths.filter((file) => file.startsWith(`${folder}/`))
      if (below.length === 0) return null
      const names = [...new Set(below.map((file) => file.slice(folder.length + 1).split('/')[0]))]
      // Not sorted: the inventory has to give one order whatever the reader gives
      return names.reverse().map((name) => {
        const file = `${folder}/${name}`
        const directory = !paths.includes(file)
        const bytes = directory ? 0 : (tree[file].bytes ?? contentOf(file).length)
        return { name, directory, bytes }
      })
    },
    async size(file) {
      const { width, height } = /** @type {any} */ (tree[file] ?? {})
      return width && height ? { width, height } : null
    },
    async read(file) {
      return Buffer.from(contentOf(file))
    }
  }
}

/** @type {string[]} */
const scratchFolders = []

afterEach(async () => {
  for (const folder of scratchFolders.splice(0)) {
    await rm(folder, { recursive: true, force: true })
  }
})

/**
 * Writes a tree into a scratch folder, which is removed after the test.
 * @param {Record<string, string | Uint8Array | object | undefined>} [tree] - The files by
 *   their path. An object is written as JSON, and a file without content is left out.
 * @returns {Promise<string>} The scratch folder.
 */
export async function scratch(tree = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'chassis-assets-test-'))
  scratchFolders.push(root)
  await writeTree(root, tree)
  return root
}

/**
 * Writes files into a folder.
 * @param {string} root
 * @param {Record<string, string | Uint8Array | object>} tree
 */
export async function writeTree(root, tree) {
  for (const [file, content] of Object.entries(tree)) {
    // A test takes a file out of a tree by giving it no content
    if (content === undefined) continue
    const target = path.join(root, file)
    await mkdir(path.dirname(target), { recursive: true })
    const plain = typeof content === 'string' || content instanceof Uint8Array
    await writeFile(target, plain ? content : `${JSON.stringify(content, null, 2)}\n`)
  }
}

/**
 * Lists the files of a folder and of the folders below it.
 * @param {string} folder
 * @returns {Promise<string[]>} The paths from the folder, sorted. Empty folders are
 *   listed with a `/` at their end.
 */
export async function listTree(folder) {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true })
  const names = entries.map((entry) => {
    const name = path.relative(folder, path.join(entry.parentPath, entry.name))
    return { name: name.split(path.sep).join('/'), directory: entry.isDirectory() }
  })
  return names
    .filter(
      ({ name, directory }) =>
        !directory || !names.some((other) => other.name.startsWith(`${name}/`))
    )
    .map(({ name, directory }) => (directory ? `${name}/` : name))
    .sort()
}

/**
 * A `package.json` with a build configuration.
 * @param {object} [build] - The value of `chassis.build`.
 * @returns {object}
 */
export function packageJson(build = { brands: ['acme'], apps: { docs: ['web'] } }) {
  return { name: 'fixture', version: '1.2.3', chassis: { build } }
}
