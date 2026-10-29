/**
 * Font subsets: what `--subset` turns on.
 *
 * `--subset` writes a font again under its name with the characters of a list of Unicode
 * ranges only, where a processor says so. The ranges are those of the option, or of
 * `chassis.subset` of `package.json`, or `SUBSET_DEFAULTS`. A variable font keeps its axes,
 * but those that `axes` of `chassis.subset` fixes at a value for the brand of the job. With
 * `split` of `chassis.subset`, a font that a stylesheet of its folder declares is written
 * once per range too, beside itself, and the stylesheet gets a rule per range.
 *
 * The module uses the package `subset-font`, and loads it when the option is given, never
 * at import time: the default build needs nothing installed.
 *
 * @module subset-fonts
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { findFontFaces, splitFontFaces } from './font-faces.js'
import { axesOf, fontTables } from './font-info.js'

/** @import { FontSubset, SubsetPart, SubsetSettings } from './types.js' */

/** The package that subsets a font. */
export const SUBSET_PACKAGE = 'subset-font'

/** The file of the ranges that have a name, beside this module. */
export const RANGES_FILE = 'subset-ranges.json'

/**
 * The ranges that have a name, each with the code points that Google Fonts gives the
 * `unicode-range` of that name, as `RANGES_FILE` has them. Any other range is given as
 * `U+0590-05FF`.
 * @type {Record<string, string>}
 */
export const NAMED_RANGES = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL(RANGES_FILE, import.meta.url)), 'utf-8')
)

/**
 * The settings without a `chassis.subset` block and without a value of the option: the
 * characters of the languages that are written in Latin letters, no axis fixed, and a font
 * in one file.
 * @type {{ ranges: string[], axes: Record<string, Record<string, number>>, split: boolean }}
 */
export const SUBSET_DEFAULTS = { ranges: ['latin', 'latin-ext'], axes: {}, split: false }

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

/** The tag of a variation axis, as a font names it: `wght`, `opsz`. */
const AXIS_TAG = /^[\x20-\x7e]{4}$/

/**
 * The problems of `axes` of a `chassis.subset` block: a value per axis, per brand.
 * @param {unknown} axes - The setting as written, such as `{ "alpha": { "opsz": 14 } }`
 * @param {string[]} [brands] - The brands of the configuration, when they are known
 * @returns {string[]} One message per problem
 */
function axesProblems(axes, brands) {
  const isObject = (/** @type {unknown} */ value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
  const example = 'such as { "<brand>": { "opsz": 14 } }'
  if (!isObject(axes)) return [`"axes" is an object of axes by brand, ${example}`]

  const problems = []
  for (const [brand, values] of Object.entries(/** @type {Record<string, unknown>} */ (axes))) {
    if (brands && !brands.includes(brand)) {
      problems.push(
        `"axes" names "${brand}", which is not a brand. Configured: ${brands.join(', ')}`
      )
    }
    if (!isObject(values)) {
      problems.push(`"axes" of the brand "${brand}" is an object of values by axis, ${example}`)
      continue
    }
    for (const [tag, value] of Object.entries(/** @type {Record<string, unknown>} */ (values))) {
      if (!AXIS_TAG.test(tag)) {
        problems.push(`"${tag}" of the brand "${brand}" is not the tag of an axis, such as opsz`)
      } else if (typeof value !== 'number' || !Number.isFinite(value)) {
        problems.push(`"${tag}" of the brand "${brand}" is fixed at a number, such as 14`)
      }
    }
  }
  return problems
}

/**
 * The name of a range in the name of a file: `latin`, and `u2500-257f` for `U+2500-257F`.
 * @param {string} range - A range as it is written
 * @returns {string}
 */
export function rangeSlug(range) {
  return range
    .toLowerCase()
    .replace(/u\+/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * The name of the file that holds one range of a font: `text-latin.woff2` for `text.woff2`.
 * The name is one that a platform keeps: a build renames the files of an output that it
 * finds there, and a dot inside a name would become a hyphen in the next build.
 * @param {string} name - The name of the font, or its path, or the `url()` value of it
 * @param {string} slug - The name of the range, of `rangeSlug()`
 * @returns {string}
 */
export function rangeFileName(name, slug) {
  const extension = path.posix.extname(name)
  return `${name.slice(0, name.length - extension.length)}-${slug}${extension}`
}

/**
 * The settings of a run: the ranges of the option, or those of `chassis.subset`, or the
 * defaults, checked, with the characters they stand for, and the axes of the block.
 * @param {unknown} [given] - The `subset` block of the `chassis` configuration
 * @param {string[]} [ranges] - The values of the option, which win over the block
 * @param {string[]} [brands] - The brands of the configuration: `axes` names no other
 * @returns {SubsetSettings}
 * @throws {Error} When the block is not valid, or a range is not a name or a `U+` range
 */
export function resolveSubset(given, ranges = [], brands) {
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
  // The axes and the split are settings of the block only: a problem of theirs is one of it
  const axesErrors = block.axes === undefined ? [] : axesProblems(block.axes, brands)
  if (block.split !== undefined && typeof block.split !== 'boolean') {
    axesErrors.push('"split" is true or false')
  }

  const names = ranges.length > 0 ? ranges : errors.length === 0 && fromBlock
  const list = /** @type {string[]} */ (names || SUBSET_DEFAULTS.ranges)
  const textOf = (/** @type {Set<number>} */ set) =>
    String.fromCodePoint(...[...set].sort((a, b) => a - b))
  /** @type {Set<number>} */
  const codePoints = new Set()
  /** @type {SubsetPart[]} */
  const parts = []
  for (const name of list) {
    const written = (NAMED_RANGES[name] ?? name).split(',').map((range) => range.trim())
    /** @type {Set<number>} */
    const own = new Set()
    for (const part of written) {
      const match = RANGE.exec(part)
      const first = match ? parseInt(match[1], 16) : NaN
      const last = match?.[2] ? parseInt(match[2], 16) : first
      if (!match || last < first || last > LAST_CODE_POINT) {
        errors.push(
          `"${name}" is not a range. Known: ${Object.keys(NAMED_RANGES).join(', ')}, or a range such as U+0370-03FF`
        )
        break
      }
      for (let codePoint = first; codePoint <= last; codePoint++) own.add(codePoint)
    }
    own.forEach((codePoint) => codePoints.add(codePoint))
    // A range that is named twice is one file
    const slug = rangeSlug(name)
    if (!parts.some((part) => part.slug === slug)) {
      parts.push({
        range: name,
        slug,
        text: textOf(own),
        unicodeRange: written.map((range) => range.toUpperCase()).join(', ')
      })
    }
  }

  if (errors.length > 0 || axesErrors.length > 0) {
    const where = ranges.length > 0 && axesErrors.length === 0 ? '--subset' : 'chassis.subset'
    throw new Error(`${where} is not valid:\n  - ${[...errors, ...axesErrors].join('\n  - ')}`)
  }
  return {
    ranges: list,
    text: textOf(codePoints),
    axes: /** @type {Record<string, Record<string, number>>} */ (
      block.axes ?? SUBSET_DEFAULTS.axes
    ),
    split: block.split ?? SUBSET_DEFAULTS.split,
    parts
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
 * The variation axes of a font in the TrueType or OpenType container, from its `fvar`
 * table, by tag. A font that is not variable has none.
 * @param {Buffer} sfnt
 * @returns {Record<string, { min: number, max: number }>}
 */
export function fontAxes(sfnt) {
  return axesOf(fontTables(sfnt, ['fvar']).fvar)
}

/**
 * A subset of a font, loaded.
 * @typedef {Object} Subsetter
 * @property {(font: Buffer, text: string, axes?: Record<string, number>) => Promise<Buffer|null>} subset
 *   The font with the characters of the text only, in its format, with every layout feature
 *   it had, or null for a font that has none of the characters. Each of the axes that the
 *   font has is fixed at its value; a value outside the axis fails
 * @property {(font: Buffer, text: string) => Promise<number>} glyphs - How many glyphs the
 *   font draws the text with, the glyphs its layout features put in their place included
 * @property {(font: Buffer) => Promise<Record<string, { min: number, max: number }>>} axes
 *   The variation axes of the font, by tag
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
      `--subset needs the package ${SUBSET_PACKAGE}, which is not installed. Install it beside @chassis-ui/assets.`,
      { cause: error }
    )
  }

  // A font without a character of the text still has the glyph of a missing character
  /** @param {Buffer} font @param {string} text */
  const glyphs = async (font, text) =>
    glyphCount(await subsetFont(font, text, { targetFormat: 'sfnt' })) - 1

  /** @type {Map<string, Promise<any>>} */
  const cache = new Map()
  /**
   * @template T
   * @param {Array<string|Buffer>} parts @param {() => Promise<T>} work @returns {Promise<T>}
   */
  const once = (parts, work) => {
    const hash = crypto.createHash('sha1')
    parts.forEach((part) => hash.update(part).update('\0'))
    const key = hash.digest('hex')
    if (!cache.has(key)) cache.set(key, work())
    return /** @type {Promise<T>} */ (cache.get(key))
  }

  // A subset keeps the axes, and its `fvar` table is read without the glyphs of the font
  /** @param {Buffer} font */
  const axes = (font) =>
    once(['axes', font], async () => fontAxes(await subsetFont(font, '', { targetFormat: 'sfnt' })))

  return {
    glyphs,
    axes,
    subset(font, text, fixed = {}) {
      const tags = Object.keys(fixed).sort()
      const written = tags.map((tag) => `${tag}=${fixed[tag]}`).join(',')
      return once(['subset', font, text, written], async () => {
        if ((await glyphs(font, text)) === 0) return null
        /** @type {Record<string, number>} */
        const variationAxes = {}
        if (tags.length > 0) {
          const has = await axes(font)
          for (const tag of tags.filter((tag) => tag in has)) {
            const { min, max } = has[tag]
            if (fixed[tag] < min || fixed[tag] > max) {
              throw new Error(
                `the axis ${tag} of the font is ${min} to ${max}, and chassis.subset fixes it at ${fixed[tag]}`
              )
            }
            variationAxes[tag] = fixed[tag]
          }
        }
        return subsetFont(font, text, {
          preserveNameIds: KEPT_NAME_IDS,
          ...(Object.keys(variationAxes).length > 0 ? { variationAxes } : {})
        })
      })
    }
  }
}

/**
 * What `split` does in the fonts folder of a job, read before a font is written: the rules
 * of its stylesheets that are written per range, and the fonts they declare.
 * @typedef {Object} SplitPlan
 * @property {Array<{ file: string, css: string, scss: boolean, rules: Map<number, string[]> }>} sheets
 *   The stylesheets, each with the rules that are split, by where a rule starts, and the
 *   font files of the rule in the order of its `url()` values
 * @property {Set<string>} declared - The font files that a rule to split declares
 * @property {Set<string>} rangeFiles - The files of the ranges, whether they are written or
 *   not: no font of the folder to subset
 * @property {Array<{ sheet: string, reason: string }>} unsplit - The rules that stay as
 *   they are, each with the stylesheet and why: it declares something else than a font of
 *   the folder, or the file of a range has the name of a font that a rule declares
 */

/** An address that names no file beside the stylesheet: a scheme, a root, a query. */
const NOT_BESIDE = /^[a-z][a-z0-9+.-]*:|^\/|[?#$]/i

/**
 * Read the stylesheets of a fonts folder, and say which of their `@font-face` rules are
 * written once per range. A rule is split when it has no `unicode-range` of its own and
 * every `url()` of its `src` is a font of the folder.
 * @param {string[]} fontFiles - The fonts of the folder that are subsetted
 * @param {string[]} sheetFiles - The stylesheets of the folder
 * @param {SubsetPart[]} parts - The ranges
 * @returns {SplitPlan}
 */
function planSplit(fontFiles, sheetFiles, parts) {
  const fontSet = new Set(fontFiles)
  /** @type {SplitPlan} */
  const plan = { sheets: [], declared: new Set(), rangeFiles: new Set(), unsplit: [] }
  /** @type {Set<string>} */
  const named = new Set()

  for (const file of sheetFiles) {
    const css = fs.readFileSync(file, 'utf-8')
    const scss = path.extname(file).toLowerCase() === '.scss'
    /** @type {Map<number, string[]>} */
    const rules = new Map()
    for (const rule of findFontFaces(css, { scss })) {
      const files = rule.urls.map(({ value }) =>
        NOT_BESIDE.test(value) ? '' : path.join(path.dirname(file), value)
      )
      files.filter((font) => fontSet.has(font)).forEach((font) => named.add(font))
      if (rule.ranged || rule.urls.length === 0) continue
      const other = files.findIndex((font) => !fontSet.has(font))
      if (other !== -1) {
        const reason = `declares ${rule.urls[other].value}, which is not a font of its folder`
        plan.unsplit.push({ sheet: file, reason })
        continue
      }
      rules.set(rule.start, files)
    }
    plan.sheets.push({ file, css, scss, rules })
  }

  // The file of a range must not take the name of a font that a rule declares
  for (const sheet of plan.sheets) {
    for (const [start, files] of sheet.rules) {
      const names = files.flatMap((font) => parts.map((part) => rangeFileName(font, part.slug)))
      const taken = names.find((name) => named.has(name))
      if (taken) {
        const reason = `the file of a range would be ${path.basename(taken)}, which is a font that a stylesheet declares`
        plan.unsplit.push({ sheet: sheet.file, reason })
        sheet.rules.delete(start)
        continue
      }
      files.forEach((font) => plan.declared.add(font))
      names.forEach((name) => plan.rangeFiles.add(name))
    }
  }
  plan.sheets = plan.sheets.filter((sheet) => sheet.rules.size > 0)
  return plan
}

/**
 * Subset the fonts of the output of one job. A font is written again under its name only
 * when the result is smaller. A font that has none of the characters stays as it is: it is
 * a font of another script, or of symbols. With a brand, the axes that the settings fix for
 * it are fixed in each font that has them, and a font without them is subsetted as it is.
 *
 * With `split` of the settings, a font that a stylesheet of the folder declares is written
 * once per range too, as `<name>-<range>.<extension>` beside itself, where it has a
 * character of the range, and the stylesheet gets its rule once per range, with the
 * `unicode-range` of each. The rules of the first range are the last ones: a browser reads
 * the rules of a family from the last to the first, so a character of two ranges is drawn
 * with the file of the range that is named first.
 * @param {string} jobDir - The output folder of the job
 * @param {Object} options
 * @param {FontSubset} options.fonts - The type folder and the extensions, of the processor
 * @param {SubsetSettings} options.settings - The settings, of `resolveSubset()`
 * @param {Subsetter} options.subsetter - The subsetter, of `loadSubsetter()`
 * @param {string} [options.brand] - The brand of the job, whose axes of the settings are fixed
 * @returns {Promise<{ subsetted: number, saved: number, kept: string[], failed: Array<{ file: string, message: string }>, fixed: Record<string, number>, ranged: number, sheets: number, unsplit: Array<{ sheet: string, reason: string }> }>}
 *   The fonts written again, the bytes that saved, the fonts without a character of the
 *   ranges, the fonts that could not be read, per fixed axis the fonts it was fixed in, the
 *   files written for a range, the stylesheets written again, and the rules that stay
 */
export async function subsetJob(jobDir, options) {
  const { fonts, settings, subsetter, brand } = options
  const axes = (brand !== undefined && settings.axes[brand]) || {}
  const result = {
    subsetted: 0,
    saved: 0,
    kept: /** @type {string[]} */ ([]),
    failed: /** @type {Array<{ file: string, message: string }>} */ ([]),
    fixed: /** @type {Record<string, number>} */ ({}),
    ranged: 0,
    sheets: 0,
    unsplit: /** @type {Array<{ sheet: string, reason: string }>} */ ([])
  }

  const dir = path.join(jobDir, fonts.type)
  if (!fs.existsSync(dir)) return result
  const entries = fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort()
  const withExtension = (/** @type {string[]} */ extensions) =>
    entries.filter((file) => extensions.includes(path.extname(file).toLowerCase()))

  const plan = settings.split
    ? planSplit(
        withExtension(fonts.formats),
        withExtension(fonts.stylesheets ?? []),
        settings.parts
      )
    : null
  // The file of a range from an earlier build is written again from its font, not subsetted
  const files = withExtension(fonts.formats).filter((file) => !plan?.rangeFiles.has(file))
  /** @type {Map<string, Map<string, Buffer>>} */
  const ranges = new Map()

  for (const file of files) {
    try {
      const original = fs.readFileSync(file)
      const subset = await subsetter.subset(original, settings.text, axes)
      if (subset === null) {
        result.kept.push(file)
      } else if (subset.length < original.length) {
        fs.writeFileSync(file, subset)
        result.subsetted++
        result.saved += original.length - subset.length
        if (Object.keys(axes).length > 0) {
          const has = await subsetter.axes(original)
          for (const tag of Object.keys(axes).filter((tag) => tag in has)) {
            result.fixed[tag] = (result.fixed[tag] ?? 0) + 1
          }
        }
      }
      if (plan?.declared.has(file) && subset !== null) {
        /** @type {Map<string, Buffer>} */
        const own = new Map()
        for (const part of settings.parts) {
          const range = await subsetter.subset(original, part.text, axes)
          if (range !== null) own.set(part.slug, range)
        }
        ranges.set(file, own)
      }
    } catch (error) {
      result.failed.push({ file, message: /** @type {Error} */ (error).message })
    }
  }

  if (plan) {
    result.unsplit = plan.unsplit
    /** @type {Map<string, Buffer>} */
    const written = new Map()
    for (const sheet of plan.sheets) {
      const css = splitFontFaces(
        sheet.css,
        (rule) => {
          const declared = sheet.rules.get(rule.start)
          if (!declared) return null
          // A range of a rule is one that every file of the rule has a character of
          const parts = settings.parts.filter((part) =>
            declared.every((font) => ranges.get(font)?.has(part.slug))
          )
          for (const part of parts) {
            for (const font of declared) {
              const range = /** @type {Buffer} */ (ranges.get(font)?.get(part.slug))
              written.set(rangeFileName(font, part.slug), range)
            }
          }
          return parts.reverse().map((part) => ({
            rename: (url) => rangeFileName(url, part.slug),
            unicodeRange: part.unicodeRange
          }))
        },
        { scss: sheet.scss }
      )
      if (css !== sheet.css) {
        fs.writeFileSync(sheet.file, css)
        result.sheets++
      }
    }
    for (const [file, font] of written) fs.writeFileSync(file, font)
    result.ranged = written.size
  }
  return result
}
