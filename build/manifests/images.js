/**
 * @file manifests/images.js
 * @description The image manifest, `images.json`: checks one, and returns the rule of an
 *              image from the rules that match it.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { BuildError } from '../errors.js'
import { PLATFORMS } from '../names.js'

/** @import { ImageRule, ImageRuleEntry } from '../types.js' */

/** The version of the format of the manifest. */
export const IMAGES_VERSION = 1

/** The name of the manifest, at the root of `images/`. */
export const IMAGES_MANIFEST = 'images.json'

/** The densities that a rule can ask for. */
export const DENSITIES = [1, 1.5, 2, 3, 4]

/** The formats that a rule can ask for. `svg` writes an SVG master as it is. */
export const FORMATS = ['png', 'jpeg', 'webp', 'avif', 'svg']

/** The formats that have a quality, with the quality that a rule without one gets. */
export const QUALITY = { jpeg: 82, webp: 80, avif: 50 }

const NAME = /^[a-z][a-z0-9-]*$/
const PATTERN = /^[a-z0-9*-]+(\/[a-z0-9*-]+)*$/

const isObject = (/** @type {unknown} */ value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isList = (/** @type {unknown} */ value, /** @type {unknown[]} */ of) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => of.includes(item)) &&
  new Set(value).size === value.length

/** What each key of a rule takes: a check, and what the message says it has to be. */
const KEYS = {
  match: [
    (/** @type {unknown} */ value) => typeof value === 'string' && PATTERN.test(value),
    'a pattern of image names, as "home/*" or "figma/**"'
  ],
  densities: [
    (/** @type {unknown} */ value) => isList(value, DENSITIES),
    `a list of ${DENSITIES.join(', ')}`
  ],
  sizes: [
    (/** @type {unknown} */ value) =>
      isObject(value) &&
      Object.keys(value).length > 0 &&
      Object.entries(value).every(
        ([name, width]) => NAME.test(name) && Number.isInteger(width) && width > 0
      ),
    'an object of names and widths in pixels, as { "small": 480 }'
  ],
  formats: [
    (/** @type {unknown} */ value) => isList(value, FORMATS),
    `a list of ${FORMATS.join(', ')}`
  ],
  quality: [
    (/** @type {unknown} */ value) =>
      isObject(value) &&
      Object.entries(value).every(
        ([format, quality]) =>
          format in QUALITY && Number.isInteger(quality) && quality >= 1 && quality <= 100
      ),
    `an object of ${Object.keys(QUALITY).join(', ')} and a quality from 1 to 100`
  ],
  palette: [(/** @type {unknown} */ value) => typeof value === 'boolean', 'true or false'],
  budget: [
    (/** @type {unknown} */ value) => Number.isInteger(value) && Number(value) > 0,
    'a size in bytes'
  ],
  committed: [(/** @type {unknown} */ value) => typeof value === 'boolean', 'true or false'],
  platforms: [
    (/** @type {unknown} */ value) => isList(value, PLATFORMS),
    `a list of ${PLATFORMS.join(', ')}`
  ],
  name: [
    (/** @type {unknown} */ value) => typeof value === 'string' && NAME.test(value),
    'a name in lowercase with hyphens'
  ]
}

/** The keys that ask the build to derive files. A committed image has none of them. */
const DERIVING = ['densities', 'sizes', 'formats', 'quality', 'palette']

/**
 * Checks an image manifest.
 * @param {unknown} raw - The content of the file, parsed.
 * @param {string} file - The path of the file, for the messages.
 * @returns {ImageRuleEntry[]} The rules, in the order of the file.
 * @throws {BuildError} That names the rule and the key, when the manifest is wrong.
 */
export function checkImagesManifest(raw, file) {
  /** @type {(message: string) => never} */
  const fail = (message) => {
    throw new BuildError(`${file}: ${message}`, { file, rule: 'manifest' })
  }
  if (!isObject(raw)) fail('is not an object with "version" and "rules"')
  const manifest = /** @type {Record<string, unknown>} */ (raw)
  for (const key of Object.keys(manifest)) {
    if (key !== 'version' && key !== 'rules') fail(`"${key}" is not a key of the manifest`)
  }
  if (manifest.version !== IMAGES_VERSION) fail(`"version" is not ${IMAGES_VERSION}`)
  if (!Array.isArray(manifest.rules)) fail('"rules" is not a list')

  return /** @type {unknown[]} */ (manifest.rules).map((rule, index) => {
    const where = `rule ${index + 1}`
    if (!isObject(rule)) fail(`${where} is not an object`)
    const entry = /** @type {Record<string, unknown>} */ (rule)
    if (!('match' in entry)) fail(`${where} has no "match"`)
    for (const [key, value] of Object.entries(entry)) {
      if (!(key in KEYS)) {
        fail(`${where} has the key "${key}", which is not one of ${Object.keys(KEYS).join(', ')}`)
      }
      const [check, expected] = KEYS[key]
      if (!check(value)) fail(`${where}: "${key}" is not ${expected}`)
    }
    const deriving = DERIVING.filter((key) => key in entry)
    if (entry.committed === true && deriving.length > 0) {
      fail(`${where} says "committed", and asks for "${deriving.join('", "')}" too`)
    }
    if ('name' in entry && String(entry.match).includes('*')) {
      fail(`${where} has a "name", so its "match" has to name one image`)
    }
    return /** @type {ImageRuleEntry} */ ({ ...entry, file })
  })
}

/**
 * Whether a pattern matches the name of an image. `*` stays in a folder, `**` does not.
 * @param {string} pattern - `home/comp-gallery-*`
 * @param {string} image - The folders and the name of an image below `images/`, without
 *   resolution indicator and extension: `home/comp-gallery-light`.
 * @returns {boolean}
 */
export function matches(pattern, image) {
  const source = pattern
    .split('**')
    .map((part) => part.split('*').map(escape).join('[^/]*'))
    .join('.*')
  return new RegExp(`^${source}$`).test(image)
}

/**
 * @param {string} text
 * @returns {string} The text with every character that a regular expression reads escaped.
 */
function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Returns the rule of an image. The rules are read in order, and a later rule overrides
 * the keys it sets, as in a `.gitattributes` file.
 * @param {string} image - The folders and the name of an image below `images/`.
 * @param {ImageRuleEntry[]} rules - The rules of the layers of a job, in override order.
 * @returns {ImageRule | undefined} The keys of every rule that matches, without `match`.
 *   Nothing when no rule matches.
 */
export function ruleOf(image, rules) {
  /** @type {ImageRule | undefined} */
  let result
  for (const rule of rules) {
    if (!matches(rule.match, image)) continue
    const keys = Object.entries(rule).filter(([key]) => key !== 'match' && key !== 'file')
    result = { ...result, ...Object.fromEntries(keys) }
  }
  return result
}

/**
 * Whether a rule asks the build to derive files of an image.
 * @param {ImageRule | undefined} rule
 * @returns {boolean}
 */
export function derives(rule) {
  return (
    rule !== undefined &&
    rule.committed !== true &&
    ['densities', 'sizes', 'formats'].some((key) => key in rule)
  )
}
