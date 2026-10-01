/**
 * The `res/` layout: what `--res` turns on.
 *
 * The files of a job that the `res/` folder of an Android app takes are moved into one:
 * the fonts into `res/font/`, the images and the icons into `res/drawable/` and the density
 * folders, without the subfolders they had, since `res/` does not nest. Node.js modules only.
 *
 * @module res-layout
 */

import fs from 'fs'
import path from 'path'

/** @import { ResLayout } from './types.js' */

/**
 * The name of a resource: lowercase letters, digits and underscores, a letter first, since
 * the name is a field of the `R` class.
 */
const RESOURCE_NAME = /^[a-z][a-z0-9_]*$/

/** The words of Java that a field cannot be named with. */
const RESERVED_WORDS = new Set(
  `abstract assert boolean break byte case catch char class const continue default do double
  else enum extends false final finally float for goto if implements import instanceof int
  interface long native new null package private protected public return short static
  strictfp super switch synchronized this throw throws transient true try void volatile
  while`.split(/\s+/)
)

/** The folder of an image that the build sorted by its indicator: `drawable`, `drawable-xhdpi`. */
const DENSITY_FOLDER = /^drawable(-|$)/

/**
 * Whether a file name without its extension can be the name of a resource.
 * @param {string} base
 * @returns {boolean}
 * @example
 * isResourceName('ic_arrow_right') // Returns: true
 * isResourceName('404') // Returns: false
 */
export function isResourceName(base) {
  return RESOURCE_NAME.test(base) && !RESERVED_WORDS.has(base)
}

/**
 * Where the files of a job go in `res/`. A font goes to the font folder. An image or an icon
 * goes to the density folder it is in, or to `drawable`. The subfolders are dropped, so two
 * files can ask for one resource: the folder nearest to the type folder gets it, with every
 * density it has, and the files of the other folder are left. A file is left too when `res/`
 * does not take its format, when its name cannot be a resource, and when a file of another
 * format has its name in its folder, the first format of the processor's list first.
 * @param {string[]} files - The files of the type folders, relative to the output of the job
 * @param {ResLayout} res - The layout, of the processor
 * @returns {{ moves: Array<{ from: string, to: string }>, left: string[] }} The files that
 *   move, with their paths in `res/`, and the files that stay, both relative to the job
 * @example
 * planResources(['images/logo/drawable-xhdpi/mark.png', 'images/drawable/mark.svg'], res)
 * // Returns: { moves: [{ from: 'images/logo/drawable-xhdpi/mark.png',
 * //   to: 'res/drawable-xhdpi/mark.png' }], left: ['images/drawable/mark.svg'] }
 */
export function planResources(files, res) {
  const candidates = []
  /** @type {string[]} */
  const left = []

  for (const file of files) {
    const parts = file.split(path.sep)
    const name = parts[parts.length - 1]
    const ext = path.extname(name).toLowerCase()
    const base = name.slice(0, name.length - ext.length)
    const isFont = parts[0] === res.font.type
    if (!isFont && !res.drawable.types.includes(parts[0])) continue

    const sorted = !isFont && parts.length > 2 && DENSITY_FOLDER.test(parts[parts.length - 2])
    const formats = isFont ? res.font.formats : res.drawable.formats
    if (!formats.includes(ext) || !isResourceName(base)) {
      left.push(file)
      continue
    }
    candidates.push({
      file,
      name,
      base,
      format: formats.indexOf(ext),
      kind: isFont ? res.font.folder : res.drawable.folder,
      folder: isFont ? res.font.folder : sorted ? parts[parts.length - 2] : res.drawable.folder,
      // The folder a resource comes from. The fonts are one folder: a font has one file
      owner: isFont ? [] : parts.slice(0, sorted ? -2 : -1)
    })
  }

  candidates.sort(
    (a, b) =>
      a.owner.length - b.owner.length ||
      a.owner.join('/').localeCompare(b.owner.join('/')) ||
      a.format - b.format ||
      a.file.localeCompare(b.file)
  )

  /** @type {Map<string, string>} */
  const owners = new Map()
  /** @type {Map<string, string>} */
  const taken = new Map()
  const moves = []
  for (const { file, name, base, kind, folder, owner } of candidates) {
    const resource = `${kind}/${base}`
    const from = owner.join('/')
    if (!owners.has(resource)) owners.set(resource, from)
    // A font is one file, an image one file per density folder
    const slot = kind === res.font.folder ? resource : `${folder}/${base}`
    if (owners.get(resource) !== from || taken.has(slot)) {
      left.push(file)
      continue
    }
    taken.set(slot, file)
    moves.push({ from: file, to: path.join(res.name, folder, name) })
  }

  return { moves, left: left.sort() }
}

/**
 * The path a file has in `res/`, when it is there.
 * @param {ResLayout} res - The layout, of the processor
 * @param {string} type - The type folder of the file
 * @param {string} fileName - The name of the file in the output
 * @param {string} [folder] - The density folder of an image. Default: the drawable folder
 * @returns {string|null} The path, relative to the output of the job, or null for a type
 *   that `res/` does not take
 * @example
 * resourcePath(res, 'fonts', 'text_normal.otf') // Returns: 'res/font/text_normal.otf'
 * resourcePath(res, 'images', 'mark.png', 'drawable-xhdpi') // Returns: 'res/drawable-xhdpi/mark.png'
 */
export function resourcePath(res, type, fileName, folder = res.drawable.folder) {
  if (type === res.font.type) return path.join(res.name, res.font.folder, fileName)
  if (res.drawable.types.includes(type)) return path.join(res.name, folder, fileName)
  return null
}

/**
 * Move the files of the output of a job into `res/`, which is written anew. A file without
 * a place in it stays where it is.
 * @param {string} jobDir - The output folder of the job
 * @param {ResLayout} res - The layout, of the processor
 * @returns {{ moved: number, left: string[] }} The number of files in `res/`, and the files
 *   that stay, relative to the job
 */
export function writeRes(jobDir, res) {
  fs.rmSync(path.join(jobDir, res.name), { recursive: true, force: true })

  const files = [res.font.type, ...res.drawable.types].flatMap((type) => {
    const dir = path.join(jobDir, type)
    if (!fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(jobDir, path.join(entry.parentPath, entry.name)))
  })

  const { moves, left } = planResources(files, res)
  for (const { from, to } of moves) {
    fs.mkdirSync(path.dirname(path.join(jobDir, to)), { recursive: true })
    fs.renameSync(path.join(jobDir, from), path.join(jobDir, to))
  }
  return { moved: moves.length, left }
}
