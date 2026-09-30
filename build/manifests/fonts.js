/**
 * @file manifests/fonts.js
 * @description The font manifest, `fonts.json`: checks one, and returns the families with
 *              their faces.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { BuildError } from '../errors.js'

/** @import { FontFamily } from '../types.js' */

/** The version of the format of the manifest. */
export const FONTS_VERSION = 1

/** The name of the manifest, at the root of `fonts/`. */
export const FONTS_MANIFEST = 'fonts.json'

/** The extensions of the font files of `source/`. */
export const FONT_EXTENSIONS = ['.otf', '.ttf']

const ID = /^[a-z][a-z0-9-]*$/
const FONT_FILE = /^[a-z][a-z0-9-]*\.(otf|ttf)$/
const LICENSE_FILE = /^licenses\/[a-z][a-z0-9-]*\.txt$/
const UNICODE_RANGE = /^U\+[0-9A-F]{1,6}(-[0-9A-F]{1,6})?$/
const STYLES = ['normal', 'italic']
const FAMILY_KEYS = ['id', 'family', 'license', 'subset', 'faces']
const FACE_KEYS = ['file', 'weight', 'style']

const isObject = (/** @type {unknown} */ value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Checks a font manifest. It reads no file: whether the files exist is for the inventory.
 * @param {unknown} raw - The content of the file, parsed.
 * @param {string} file - The path of the file, for the messages.
 * @returns {FontFamily[]} The families, in the order of the file.
 * @throws {BuildError} That names the family and the key, when the manifest is wrong.
 */
export function checkFontsManifest(raw, file) {
  /** @type {(message: string) => never} */
  const fail = (message) => {
    throw new BuildError(`${file}: ${message}`, { file, rule: 'manifest' })
  }
  if (!isObject(raw)) fail('is not an object with "version" and "families"')
  const manifest = /** @type {Record<string, unknown>} */ (raw)
  for (const key of Object.keys(manifest)) {
    if (key !== 'version' && key !== 'families') fail(`"${key}" is not a key of the manifest`)
  }
  if (manifest.version !== FONTS_VERSION) fail(`"version" is not ${FONTS_VERSION}`)
  if (!Array.isArray(manifest.families)) fail('"families" is not a list')

  /** @type {Set<string>} */
  const ids = new Set()
  /** @type {Set<string>} */
  const files = new Set()
  return /** @type {unknown[]} */ (manifest.families).map((value, index) => {
    if (!isObject(value)) fail(`family ${index + 1} is not an object`)
    const family = /** @type {Record<string, any>} */ (value)
    const where = `the family ${JSON.stringify(family.id ?? index + 1)}`
    for (const key of Object.keys(family)) {
      if (!FAMILY_KEYS.includes(key)) {
        fail(`${where} has the key "${key}", which is not one of ${FAMILY_KEYS.join(', ')}`)
      }
    }
    if (typeof family.id !== 'string' || !ID.test(family.id)) {
      fail(`family ${index + 1}: "id" is not a name in lowercase with hyphens`)
    }
    if (ids.has(family.id)) fail(`${where} is there twice`)
    ids.add(family.id)
    if (typeof family.family !== 'string' || family.family.trim() === '') {
      fail(`${where}: "family" is not the name of a font family`)
    }
    if (typeof family.license !== 'string' || !LICENSE_FILE.test(family.license)) {
      fail(`${where}: "license" is not a file of licenses/, as "licenses/inter.txt"`)
    }
    if ('subset' in family) {
      const ranges = family.subset
      if (
        !Array.isArray(ranges) ||
        ranges.length === 0 ||
        !ranges.every((range) => UNICODE_RANGE.test(range))
      ) {
        fail(`${where}: "subset" is not a list of Unicode ranges, as "U+0020-007E"`)
      }
    }
    if (!Array.isArray(family.faces) || family.faces.length === 0) {
      fail(`${where}: "faces" is not a list of faces`)
    }

    /** @type {Set<string>} */
    const faces = new Set()
    for (const [number, face] of family.faces.entries()) {
      const which = `${where}, face ${number + 1}`
      if (!isObject(face)) fail(`${which} is not an object`)
      for (const key of Object.keys(face)) {
        if (!FACE_KEYS.includes(key)) {
          fail(`${which} has the key "${key}", which is not one of ${FACE_KEYS.join(', ')}`)
        }
      }
      if (typeof face.file !== 'string' || !FONT_FILE.test(face.file)) {
        fail(`${which}: "file" is not an OTF or TTF file of fonts/, as "text-normal.otf"`)
      }
      if (files.has(face.file)) fail(`${which}: the file ${face.file} is there twice`)
      files.add(face.file)
      if (!Number.isInteger(face.weight) || face.weight < 100 || face.weight > 900) {
        fail(`${which}: "weight" is not a number from 100 to 900`)
      }
      if (!STYLES.includes(face.style)) fail(`${which}: "style" is not normal or italic`)
      const key = `${face.weight} ${face.style}`
      if (faces.has(key)) fail(`${where} has two faces of the weight ${face.weight}, ${face.style}`)
      faces.add(key)
    }
    return /** @type {FontFamily} */ ({ ...family, manifest: file })
  })
}
