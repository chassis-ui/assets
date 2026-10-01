/**
 * Font subsets: what `--subset` turns on.
 *
 * `--subset` writes a font again under its name with the characters of a list of Unicode
 * ranges only, where a processor says so. The ranges are those of the option, or of
 * `chassis.subset` of `package.json`, or `SUBSET_DEFAULTS`.
 *
 * The module uses the package `subset-font`, and loads it when the option is given, never
 * at import time: the default build needs nothing installed.
 *
 * @module subset-fonts
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/** @import { FontSubset, SubsetSettings } from './types.js' */

/** The package that subsets a font. */
export const SUBSET_PACKAGE = 'subset-font'

/**
 * The ranges that have a name, each with the code points that Google Fonts gives the
 * `unicode-range` of that name. Any other range is given as `U+0590-05FF`.
 * @type {Record<string, string>}
 */
export const NAMED_RANGES = {
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext':
    'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  'cyrillic-ext': 'U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F',
  greek: 'U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF',
  'greek-ext': 'U+1F00-1FFF',
  vietnamese:
    'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB',
  math: 'U+0302-0303, U+0305, U+0307-0308, U+0310, U+0312, U+0315, U+031A, U+0326-0327, U+032C, U+032F-0330, U+0332-0333, U+0338, U+033A, U+0346, U+034D, U+0391-03A1, U+03A3-03A9, U+03B1-03C9, U+03D1, U+03D5-03D6, U+03F0-03F1, U+03F4-03F5, U+2016-2017, U+2034-2038, U+203C, U+2040, U+2043, U+2047, U+2050, U+2057, U+205F, U+2070-2071, U+2074-208E, U+2090-209C, U+20D0-20DC, U+20E1, U+20E5-20EF, U+2100-2112, U+2114-2115, U+2117-2121, U+2123-214F, U+2190, U+2192, U+2194-21AE, U+21B0-21E5, U+21F1-21F2, U+21F4-2211, U+2213-2214, U+2216-22FF, U+2308-230B, U+2310, U+2319, U+231C-2321, U+2336-237A, U+237C, U+2395, U+239B-23B7, U+23D0, U+23DC-23E1, U+2474-2475, U+25AF, U+25B3, U+25B7, U+25BD, U+25C1, U+25CA, U+25CC, U+25FB, U+266D-266F, U+27C0-27FF, U+2900-2AFF, U+2B0E-2B11, U+2B30-2B4C, U+2BFE, U+3030, U+FF5B, U+FF5D, U+1D400-1D7FF, U+1EE00-1EEFF',
  symbols:
    'U+0001-000C, U+000E-001F, U+007F-009F, U+20DD-20E0, U+20E2-20E4, U+2150-218F, U+2190, U+2192, U+2194-2199, U+21AF, U+21E6-21F0, U+21F3, U+2218-2219, U+2299, U+22C4-22C6, U+2300-243F, U+2440-244A, U+2460-24FF, U+25A0-27BF, U+2800-28FF, U+2921-2922, U+2981, U+29BF, U+29EB, U+2B00-2BFF, U+4DC0-4DFF, U+FFF9-FFFB, U+10140-1018E, U+10190-1019C, U+101A0, U+101D0-101FD, U+102E0-102FB, U+10E60-10E7E, U+1D2C0-1D2D3, U+1D2E0-1D37F, U+1F000-1F0FF, U+1F100-1F1AD, U+1F1E6-1F1FF, U+1F30D-1F30F, U+1F315, U+1F31C, U+1F31E, U+1F320-1F32C, U+1F336, U+1F378, U+1F37D, U+1F382, U+1F393-1F39F, U+1F3A7-1F3A8, U+1F3AC-1F3AF, U+1F3C2, U+1F3C4-1F3C6, U+1F3CA-1F3CE, U+1F3D4-1F3E0, U+1F3ED, U+1F3F1-1F3F3, U+1F3F5-1F3F7, U+1F408, U+1F415, U+1F41F, U+1F426, U+1F43F, U+1F441-1F442, U+1F444, U+1F446-1F449, U+1F44C-1F44E, U+1F453, U+1F46A, U+1F47D, U+1F4A3, U+1F4B0, U+1F4B3, U+1F4B9, U+1F4BB, U+1F4BF, U+1F4C8-1F4CB, U+1F4D6, U+1F4DA, U+1F4DF, U+1F4E3-1F4E6, U+1F4EA-1F4ED, U+1F4F7, U+1F4F9-1F4FB, U+1F4FD-1F4FE, U+1F503, U+1F507-1F50B, U+1F50D, U+1F512-1F513, U+1F53E-1F54A, U+1F54F-1F5FA, U+1F610, U+1F650-1F67F, U+1F687, U+1F68D, U+1F691, U+1F694, U+1F698, U+1F6AD, U+1F6B2, U+1F6B9-1F6BA, U+1F6BC, U+1F6C6-1F6CF, U+1F6D3-1F6D7, U+1F6E0-1F6EA, U+1F6F0-1F6F3, U+1F6F7-1F6FC, U+1F700-1F7FF, U+1F800-1F80B, U+1F810-1F847, U+1F850-1F859, U+1F860-1F887, U+1F890-1F8AD, U+1F8B0-1F8BB, U+1F8C0-1F8C1, U+1F900-1F90B, U+1F93B, U+1F946, U+1F984, U+1F996, U+1F9E9, U+1FA00-1FA6F, U+1FA70-1FA7C, U+1FA80-1FA89, U+1FA8F-1FAC6, U+1FACE-1FADC, U+1FADF-1FAE9, U+1FAF0-1FAF8, U+1FB00-1FBFF'
}

/**
 * The settings without a `chassis.subset` block and without a value of the option: the
 * characters of the languages that are written in Latin letters.
 */
export const SUBSET_DEFAULTS = { ranges: ['latin', 'latin-ext'] }

/**
 * The entries of the `name` table that are kept beside the names of the family: the
 * trademark, the manufacturer, the designer, their addresses, and the license with its
 * address. A font license asks for them in every copy.
 */
export const KEPT_NAME_IDS = [7, 8, 9, 11, 12, 13, 14]

/** A range as it is written: `U+0041`, `U+0041-005A`. */
const RANGE = /^U\+([0-9A-F]{1,6})(?:-([0-9A-F]{1,6}))?$/i

/** The last code point of Unicode. */
const LAST_CODE_POINT = 0x10ffff

/**
 * The settings of a run: the ranges of the option, or those of `chassis.subset`, or the
 * defaults, checked, with the characters they stand for.
 * @param {unknown} [given] - The `subset` block of the `chassis` configuration
 * @param {string[]} [ranges] - The values of the option, which win over the block
 * @returns {SubsetSettings}
 * @throws {Error} When the block is not valid, or a range is not a name or a `U+` range
 */
export function resolveSubset(given, ranges = []) {
  const errors = []
  let block = /** @type {Record<string, any>} */ ({})
  if (given !== undefined) {
    if (given === null || typeof given !== 'object' || Array.isArray(given)) {
      throw new Error('chassis.subset is an object, such as { "ranges": ["latin"] }')
    }
    block = /** @type {Record<string, any>} */ (given)
  }
  for (const key of Object.keys(block)) {
    if (!(key in SUBSET_DEFAULTS)) {
      errors.push(`"${key}" is not a setting. Known: ${Object.keys(SUBSET_DEFAULTS).join(', ')}`)
    }
  }
  const fromBlock = block.ranges
  if (
    fromBlock !== undefined &&
    (!Array.isArray(fromBlock) ||
      fromBlock.length === 0 ||
      fromBlock.some((range) => typeof range !== 'string'))
  ) {
    errors.push('"ranges" is a list of range names or U+ ranges, such as ["latin", "U+2190-21FF"]')
  }

  const names = ranges.length > 0 ? ranges : errors.length === 0 && fromBlock
  const list = /** @type {string[]} */ (names || SUBSET_DEFAULTS.ranges)
  /** @type {Set<number>} */
  const codePoints = new Set()
  for (const name of list) {
    const written = NAMED_RANGES[name] ?? name
    for (const part of written.split(',').map((range) => range.trim())) {
      const match = RANGE.exec(part)
      const first = match ? parseInt(match[1], 16) : NaN
      const last = match?.[2] ? parseInt(match[2], 16) : first
      if (!match || last < first || last > LAST_CODE_POINT) {
        errors.push(
          `"${name}" is not a range. Known: ${Object.keys(NAMED_RANGES).join(', ')}, or a range such as U+0370-03FF`
        )
        break
      }
      for (let codePoint = first; codePoint <= last; codePoint++) codePoints.add(codePoint)
    }
  }

  if (errors.length > 0) {
    const where = ranges.length > 0 ? '--subset' : 'chassis.subset'
    throw new Error(`${where} is not valid:\n  - ${errors.join('\n  - ')}`)
  }
  return {
    ranges: list,
    text: String.fromCodePoint(...[...codePoints].sort((a, b) => a - b))
  }
}

/**
 * The number of glyphs of a font in the TrueType or OpenType container, from its `maxp`
 * table.
 * @param {Buffer} sfnt
 * @returns {number}
 */
export function glyphCount(sfnt) {
  const tables = sfnt.readUInt16BE(4)
  for (let i = 0; i < tables; i++) {
    const record = 12 + i * 16
    if (sfnt.toString('latin1', record, record + 4) === 'maxp') {
      return sfnt.readUInt16BE(sfnt.readUInt32BE(record + 8) + 4)
    }
  }
  throw new Error('The font has no maxp table')
}

/**
 * A subset of a font, loaded.
 * @typedef {Object} Subsetter
 * @property {(font: Buffer, text: string) => Promise<Buffer|null>} subset - The font with
 *   the characters of the text only, in its format, with every layout feature it had, or
 *   null for a font that has none of the characters
 * @property {(font: Buffer, text: string) => Promise<number>} glyphs - How many glyphs the
 *   font draws the text with, the glyphs its layout features put in their place included
 */

/**
 * Load the package, and return the subsetter. One file content is subsetted once in a run:
 * the brands of an app share most of their files.
 * @returns {Promise<Subsetter>}
 * @throws {Error} When the package is not installed
 */
export async function loadSubsetter() {
  let subsetFont
  try {
    subsetFont = (await import(SUBSET_PACKAGE)).default
  } catch (error) {
    throw new Error(
      `--subset needs the package ${SUBSET_PACKAGE}, which is not installed. Run \`pnpm install\` in the repository root.`,
      { cause: error }
    )
  }

  // A font without a character of the text still has the glyph of a missing character
  /** @param {Buffer} font @param {string} text */
  const glyphs = async (font, text) =>
    glyphCount(await subsetFont(font, text, { targetFormat: 'sfnt' })) - 1

  /** @type {Map<string, Promise<Buffer|null>>} */
  const cache = new Map()

  return {
    glyphs,
    subset(font, text) {
      const key = crypto.createHash('sha1').update(font).update(text).digest('hex')
      let result = cache.get(key)
      if (!result) {
        result = (async () =>
          (await glyphs(font, text)) === 0
            ? null
            : subsetFont(font, text, { preserveNameIds: KEPT_NAME_IDS }))()
        cache.set(key, result)
      }
      return result
    }
  }
}

/**
 * Subset the fonts of the output of one job. A font is written again under its name only
 * when the result is smaller. A font that has none of the characters stays as it is: it is
 * a font of another script, or of symbols.
 * @param {string} jobDir - The output folder of the job
 * @param {Object} options
 * @param {FontSubset} options.fonts - The type folder and the extensions, of the processor
 * @param {SubsetSettings} options.settings - The settings, of `resolveSubset()`
 * @param {Subsetter} options.subsetter - The subsetter, of `loadSubsetter()`
 * @returns {Promise<{ subsetted: number, saved: number, kept: string[], failed: Array<{ file: string, message: string }> }>}
 *   The fonts written again, the bytes that saved, the fonts without a character of the
 *   ranges, and the fonts that could not be read
 */
export async function subsetJob(jobDir, options) {
  const { fonts, settings, subsetter } = options
  const result = {
    subsetted: 0,
    saved: 0,
    kept: /** @type {string[]} */ ([]),
    failed: /** @type {Array<{ file: string, message: string }>} */ ([])
  }

  const dir = path.join(jobDir, fonts.type)
  if (!fs.existsSync(dir)) return result
  const files = fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && fonts.formats.includes(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()

  for (const file of files) {
    try {
      const original = fs.readFileSync(file)
      const subset = await subsetter.subset(original, settings.text)
      if (subset === null) {
        result.kept.push(file)
      } else if (subset.length < original.length) {
        fs.writeFileSync(file, subset)
        result.subsetted++
        result.saved += original.length - subset.length
      }
    } catch (error) {
      result.failed.push({ file, message: /** @type {Error} */ (error).message })
    }
  }
  return result
}
