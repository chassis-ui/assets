/**
 * The `res/` layout: what `--res` turns on.
 *
 * The files of a job that the `res/` folder of an Android app takes are moved into one:
 * the fonts into `res/font/`, the images and the icons into `res/drawable/` and the density
 * folders, without the subfolders they had, since `res/` does not nest. A pair `<name>_light`
 * and `<name>_dark` becomes one resource with a night folder, an image of one size goes to
 * `drawable-nodpi`, and the layers of an adaptive icon become one app icon. Node.js modules
 * only.
 *
 * @module res-layout
 */

import fs from 'fs'
import path from 'path'
import { findBundles } from './processors/shared.js'

/** @import { ResCollision, ResLayout } from '../types.js' */

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

/** The name of a file for the light appearance, with the name it shares with its dark file. */
const LIGHT_NAME = /^(.+)_light$/

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
 * The pairs among the drawables that have a place in `res/`: `<name>_light` and `<name>_dark`
 * of one folder are one resource `<name>`, as they are one image set on iOS (D41). A pair stays
 * apart when one is vector and the other raster, and when another drawable is named `<name>`,
 * which is a collision: the build fails on it.
 * @param {Array<{ file: string, base: string, ext: string }>} placed - The drawables with a place
 * @param {(base: string) => string|undefined} ownerOf - The folder a drawable comes from
 * @param {Array<{ file: string, base: string }>} candidates - Every drawable, with a place or not
 * @param {ResLayout} res - The layout, of the processor
 * @returns {{ names: Map<string, { name: string, dark: boolean }>, collisions: ResCollision[] }}
 *   What each name of a pair becomes, and the pairs that cannot be joined
 */
function joinPairs(placed, ownerOf, candidates, res) {
  /** @type {Map<string, { name: string, dark: boolean }>} */
  const names = new Map()
  /** @type {ResCollision[]} */
  const collisions = []
  const filesOf = (/** @type {string} */ base) => placed.filter((item) => item.base === base)
  const isVector = (/** @type {string} */ base) =>
    filesOf(base).every((item) => item.ext === res.drawable.vector)

  for (const light of new Set(placed.map((item) => item.base))) {
    const name = LIGHT_NAME.exec(light)?.[1]
    const dark = `${name}_dark`
    if (!name || filesOf(dark).length === 0 || ownerOf(light) !== ownerOf(dark)) continue
    if (isVector(light) !== isVector(dark)) continue

    const others = candidates.filter((item) => item.base === name)
    if (others.length > 0) {
      const files = [...others, ...filesOf(light), ...filesOf(dark)].map((item) => item.file)
      collisions.push({ resource: `${res.drawable.folder}/${name}`, files })
      continue
    }
    names.set(light, { name, dark: false })
    names.set(dark, { name, dark: true })
  }
  return { names, collisions }
}

/**
 * Where the files of a job go in `res/`. A font goes to the font folder. An image or an icon
 * goes to the density folder it is in, or to `drawable`, and a raster of a resource with no
 * density folder goes to `drawable-nodpi`, since Android takes `drawable` for mdpi and scales
 * up an image of one size. `<name>_light` and `<name>_dark` of one folder are the resource
 * `<name>`, the dark files in the night folders. The subfolders are dropped, so two files can
 * ask for one resource: the folder nearest to the type folder gets it, with every density it
 * has, and the files of the other folder are left. A file is left too when `res/` does not take
 * its format, when its name cannot be a resource, and when a file of another format has its
 * name in its folder, the first format of the processor's list first.
 * @param {string[]} files - The files of the type folders, relative to the output of the job
 * @param {ResLayout} res - The layout, of the processor
 * @returns {{ moves: Array<{ from: string, to: string }>, left: string[], collisions: ResCollision[] }}
 *   The files that move, with their paths in `res/`, the files that stay, both relative to
 *   the job, and the pairs whose name another drawable has, which stay apart
 * @example
 * planResources(['images/logo/drawable-xhdpi/mark.png', 'images/drawable/mark.svg'], res)
 * // Returns: { moves: [{ from: 'images/logo/drawable-xhdpi/mark.png',
 * //   to: 'res/drawable-xhdpi/mark.png' }], left: ['images/drawable/mark.svg'], collisions: [] }
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
      ext,
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
  const placed = []
  for (const candidate of candidates) {
    const { file, base, kind, folder, owner } = candidate
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
    placed.push(candidate)
  }

  const isDrawable = (/** @type {{ kind: string }} */ item) => item.kind === res.drawable.folder
  const { names, collisions } = joinPairs(
    placed.filter(isDrawable),
    (base) => owners.get(`${res.drawable.folder}/${base}`),
    candidates.filter(isDrawable),
    res
  )

  const nameOf = (/** @type {typeof placed[number]} */ item) =>
    (isDrawable(item) && names.get(item.base)?.name) || item.base
  // A resource with a density folder keeps `drawable` for its mdpi file
  const sized = new Set(
    placed
      .filter((item) => isDrawable(item) && item.folder !== res.drawable.folder)
      .map((item) => nameOf(item))
  )
  const moves = placed.map((item) => {
    let folder = item.folder
    if (isDrawable(item)) {
      const oneSize = folder === res.drawable.folder && !sized.has(nameOf(item))
      if (oneSize && item.ext !== res.drawable.vector) folder = res.drawable.noDensity
      if (names.get(item.base)?.dark) {
        folder = folder.replace(res.drawable.folder, res.drawable.night)
      }
    }
    const name = nameOf(item) + item.name.slice(item.base.length)
    return { from: item.file, to: path.join(res.name, folder, name) }
  })

  return { moves, left: left.sort(), collisions }
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
 * The paths a file can have in `res/`, when it is there: the folder of its density or the
 * folder of an image of one size, under its name, or under the name of its pair.
 * @param {ResLayout} res - The layout, of the processor
 * @param {string} type - The type folder of the file
 * @param {string} fileName - The name of the file in the output
 * @param {string} [folder] - The density folder of an image. Default: the drawable folder
 * @returns {string[]} The paths, relative to the output of the job, none for a type that
 *   `res/` does not take
 * @example
 * resourcePaths(res, 'images', 'logo_dark.png')
 * // Returns: ['res/drawable/logo_dark.png', 'res/drawable-nodpi/logo_dark.png',
 * //   'res/drawable-night/logo.png', 'res/drawable-night-nodpi/logo.png']
 */
export function resourcePaths(res, type, fileName, folder = res.drawable.folder) {
  const plain = resourcePath(res, type, fileName, folder)
  if (plain === null) return []
  if (type === res.font.type) return [plain]

  const folders = [folder, ...(folder === res.drawable.folder ? [res.drawable.noDensity] : [])]
  const pair = /^(.+)_(light|dark)(\.\w+)$/.exec(fileName)
  return [
    ...folders.map((name) => path.join(res.name, name, fileName)),
    ...(pair
      ? folders.map((name) =>
          path.join(
            res.name,
            pair[2] === 'dark' ? name.replace(res.drawable.folder, res.drawable.night) : name,
            pair[1] + pair[3]
          )
        )
      : [])
  ]
}

/**
 * The path of the app icon that a bundle becomes in `res/`.
 * @param {ResLayout} res - The layout, of the processor
 * @param {string} bundle - The name of the bundle in the output
 * @returns {string|null} The path, relative to the output of the job, or null for a folder
 *   that is no such bundle
 * @example
 * appIconPath(res, 'app_icon.adaptive') // Returns: 'res/mipmap-anydpi-v26/app_icon.xml'
 */
export function appIconPath(res, bundle) {
  const ext = path.extname(bundle).toLowerCase()
  if (ext !== res.appIcon.bundle) return null
  return path.join(res.name, res.appIcon.folder, `${bundle.slice(0, -ext.length)}.xml`)
}

/**
 * The XML of an adaptive icon, of the drawables of its layers.
 * @param {string} name - The name of the app icon
 * @param {string[]} layers - The layers it has
 * @returns {string}
 */
function adaptiveIcon(name, layers) {
  const lines = layers.map(
    (layer) => `    <${layer} android:drawable="@drawable/${name}_${layer}" />`
  )
  return `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
${lines.join('\n')}
</adaptive-icon>
`
}

/**
 * Turn the adaptive icon bundles of a job into app icons: the vector drawables of the layers
 * move to `res/drawable/<name>_<layer>.xml`, and `res/mipmap-anydpi-v26/<name>.xml` names them.
 * A bundle without vector drawables stays where it is: it needs `--vector-drawables`.
 * @param {string} jobDir - The output folder of the job
 * @param {ResLayout} res - The layout, of the processor
 * @param {Set<string>} drawables - The names of the drawables of `res/`
 * @returns {{ moved: number, left: string[], collisions: ResCollision[] }}
 */
function moveAppIcons(jobDir, res, drawables) {
  const { bundle: extension, layers, required, folder } = res.appIcon
  const result = {
    moved: 0,
    left: /** @type {string[]} */ ([]),
    collisions: /** @type {ResCollision[]} */ ([])
  }
  const icons = new Set()

  for (const bundle of findBundles(jobDir, extension)) {
    const relative = path.relative(jobDir, bundle)
    const name = path.basename(bundle).slice(0, -extension.length)
    const present = layers.filter((layer) => fs.existsSync(path.join(bundle, `${layer}.xml`)))
    if (!isResourceName(name) || !required.every((layer) => present.includes(layer))) {
      result.left.push(relative)
      continue
    }
    const clash = present.map((layer) => `${name}_${layer}`).filter((base) => drawables.has(base))
    if (icons.has(name) || clash.length > 0) {
      result.collisions.push({
        resource: icons.has(name) ? `${folder}/${name}` : `${res.drawable.folder}/${clash[0]}`,
        files: [relative]
      })
      continue
    }
    icons.add(name)

    fs.mkdirSync(path.join(jobDir, res.name, res.drawable.folder), { recursive: true })
    fs.mkdirSync(path.join(jobDir, res.name, folder), { recursive: true })
    for (const layer of present) {
      fs.renameSync(
        path.join(bundle, `${layer}.xml`),
        path.join(jobDir, res.name, res.drawable.folder, `${name}_${layer}.xml`)
      )
    }
    fs.writeFileSync(
      path.join(jobDir, res.name, folder, `${name}.xml`),
      adaptiveIcon(name, present)
    )
    fs.rmSync(bundle, { recursive: true })
    result.moved += present.length + 1
  }
  return result
}

/**
 * Move the files of the output of a job into `res/`, which is written anew. A file without
 * a place in it stays where it is.
 * @param {string} jobDir - The output folder of the job
 * @param {ResLayout} res - The layout, of the processor
 * @returns {{ moved: number, left: string[], collisions: ResCollision[] }} The number of files
 *   in `res/`, the files that stay, relative to the job, and the resources that two files ask
 *   for, on which the build fails
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

  const { moves, left, collisions } = planResources(files, res)
  for (const { from, to } of moves) {
    fs.mkdirSync(path.dirname(path.join(jobDir, to)), { recursive: true })
    fs.renameSync(path.join(jobDir, from), path.join(jobDir, to))
  }

  const drawables = new Set(
    moves
      .filter(({ to }) => path.basename(path.dirname(to)) !== res.font.folder)
      .map(({ to }) => path.parse(to).name)
  )
  const icons = moveAppIcons(jobDir, res, drawables)
  return {
    moved: moves.length + icons.moved,
    left: [...left, ...icons.left].sort(),
    collisions: [...collisions, ...icons.collisions]
  }
}
