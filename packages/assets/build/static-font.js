/**
 * Chassis Assets Static Font
 *
 * Writes the static font of a variable font at a weight, or at any values of its axes: the
 * file by weight of a role that the fonts page asks a brand for, such as `ui-strong.ttf` at
 * `wght=600` from the variable `ui.ttf`. Every axis is fixed, the ones that are given at
 * their value and the others at their default, and the result has no axis.
 *
 * The font keeps every glyph, every character and every layout feature of the variable
 * font, with the outline of the missing glyph, and its metrics at those values. HarfBuzz
 * writes it: the one that the package `subset-font` brings, which this command loads when it
 * runs, as the options of the build load theirs.
 *
 * The names are those the `STAT` table of the variable font gives the values, as fontTools
 * writes them for a static font: `Inter SemiBold Italic`, with the style bits of `OS/2` and
 * `head` of a regular, a bold or an italic. The PostScript name is the family and the style
 * without spaces, `Inter-SemiBoldItalic`, as a download of the family by weight has it; an
 * iOS app loads a font by that name. An optical size that the table names, such as `18pt`,
 * is a part of the family and not of the style, as in such a download: `DM Sans 18pt`,
 * `DMSans18pt-SemiBold`. The dates of the font are kept, so the same command on the same
 * file writes the same bytes.
 *
 * `staticFont(font, settings)` returns the font and its names; the command-line entry at the
 * bottom reads the variable font and writes the static one to each output it is given, as
 * TrueType for the apps and as WOFF2 for the web.
 *
 * @module static-font
 */

import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import { fontTables } from './font-info.js'
import {
  layoutNameIds,
  readAxes,
  readNames,
  readStat,
  replaceTables,
  writeNames
} from './font-tables.js'
import { isEntry } from './root.js'

/** The package whose HarfBuzz writes the static font: an optional peer dependency. */
export const STATIC_FONT_PACKAGE = 'subset-font'

/** The names of a style that the regular, bold and italic model of a family has. */
const RIBBI = ['Regular', 'Italic', 'Bold', 'Bold Italic']

/** The English entries of Windows, which the names are read from first. */
const WINDOWS_ENGLISH = { platform: 3, encoding: 1, language: 0x409 }

/** The sets of a HarfBuzz subset: what a static font keeps. */
const HB_SETS = { glyphs: 0, unicodes: 1, nameIds: 4, nameLanguages: 5, features: 6, scripts: 7 }

/**
 * The flags of the subset: the Macintosh names, the overlap flags of the outlines that
 * fontTools sets too, the tables HarfBuzz does not know, the outline of the missing glyph,
 * the glyph names, and the Unicode ranges of `OS/2` as they are.
 */
const HB_FLAGS = 0x08 | 0x10 | 0x20 | 0x40 | 0x80 | 0x100

/**
 * @typedef {import('./font-tables.js').NameRecord} NameRecord
 * @typedef {import('./font-tables.js').StatTable} StatTable
 * @typedef {import('./font-tables.js').AxisValue} AxisValue
 * @typedef {{ platform: number, encoding: number, language: number }} Platform
 */

/**
 * @typedef {Object} StaticFont
 * @property {Buffer} font - The static font, TrueType or OpenType as the variable font is
 * @property {string} fullName - The full name, as `Inter SemiBold Italic`
 * @property {string} postscript - The PostScript name, as `Inter-SemiBoldItalic`
 * @property {number} weight - The weight class of `OS/2`
 */

/** @type {Promise<{ hb: any, fontverter: any }> | undefined} */
let loading

/**
 * Load HarfBuzz and the font converter of the package `subset-font`, from the folder of the
 * package, or say how to install it.
 * @returns {Promise<{ hb: any, fontverter: any }>}
 * @throws {Error} When the package is not installed
 */
export function loadHarfBuzz() {
  loading ??= (async () => {
    let entry
    try {
      entry = fileURLToPath(import.meta.resolve(STATIC_FONT_PACKAGE))
    } catch (error) {
      throw new Error(
        `static-font needs the package ${STATIC_FONT_PACKAGE}, which is not installed. Install it beside @chassis-ui/assets.`,
        { cause: error }
      )
    }
    // The modules of the package, resolved from its folder
    const load = createRequire(entry)
    const fontverter = load('fontverter')
    const wasm = fs.readFileSync(load.resolve('harfbuzzjs/dist/harfbuzz-subset.wasm'))
    const { instance } = await /** @type {any} */ (globalThis).WebAssembly.instantiate(wasm)
    const hb = /** @type {any} */ (instance.exports)
    hb._initialize()
    return { hb, fontverter }
  })().catch((error) => {
    loading = undefined
    throw error
  })
  return loading
}

/**
 * The number HarfBuzz takes for a tag of four letters.
 * @param {string} tag
 * @returns {number}
 */
function hbTag(tag) {
  return [...tag].reduce((value, letter) => value * 256 + letter.charCodeAt(0), 0)
}

/**
 * Write the font with every axis fixed at a value, and everything else kept.
 * @param {any} hb - The HarfBuzz of `loadHarfBuzz()`
 * @param {Buffer} font - A TrueType or OpenType font
 * @param {Record<string, number>} location - The value of every axis
 * @param {number[]} nameIds - The names to keep beside those up to 255
 * @returns {Buffer}
 * @throws {Error} When HarfBuzz cannot write the font
 */
function pinAxes(hb, font, location, nameIds) {
  const heap = () => new Uint8Array(hb.memory.buffer)
  const input = hb.hb_subset_input_create_or_fail()
  if (input === 0) throw new Error('HarfBuzz could not start')
  const data = hb.malloc(font.length)
  heap().set(font, data)
  const blob = hb.hb_blob_create(data, font.length, 2, 0, 0)
  const face = hb.hb_face_create(blob, 0)
  hb.hb_blob_destroy(blob)
  try {
    // Every glyph, character, language of a name, feature and script
    for (const set of [
      HB_SETS.glyphs,
      HB_SETS.unicodes,
      HB_SETS.nameLanguages,
      HB_SETS.features,
      HB_SETS.scripts
    ]) {
      const handle = hb.hb_subset_input_set(input, set)
      hb.hb_set_clear(handle)
      hb.hb_set_invert(handle)
    }
    // The names up to 255, the ones of the features, and the ones that STAT refers to, which
    // HarfBuzz keeps itself; the names of the instances of the variable font go
    const ids = hb.hb_subset_input_set(input, HB_SETS.nameIds)
    hb.hb_set_clear(ids)
    for (let id = 0; id < 256; id++) hb.hb_set_add(ids, id)
    for (const id of nameIds) hb.hb_set_add(ids, id)
    hb.hb_subset_input_set_flags(input, HB_FLAGS)
    for (const [tag, value] of Object.entries(location)) {
      if (!hb.hb_subset_input_pin_axis_location(input, face, hbTag(tag), value)) {
        throw new Error(`HarfBuzz could not fix the axis ${tag} at ${value}`)
      }
    }
    const result = hb.hb_subset_or_fail(face, input)
    if (result === 0) throw new Error('HarfBuzz could not write the static font')
    const written = hb.hb_face_reference_blob(result)
    const at = hb.hb_blob_get_data(written, 0)
    const length = hb.hb_blob_get_length(written)
    const out = Buffer.from(heap().subarray(at, at + length))
    hb.hb_blob_destroy(written)
    hb.hb_face_destroy(result)
    if (length === 0) throw new Error('HarfBuzz could not write the static font')
    return out
  } finally {
    hb.hb_subset_input_destroy(input)
    hb.hb_face_destroy(face)
    hb.free(data)
  }
}

/**
 * The names of a font, as a list of entries that the functions below change.
 */
class Names {
  /** @param {NameRecord[]} records */
  constructor(records) {
    this.records = records
  }

  /**
   * The text of an entry on a platform, or null.
   * @param {number} id
   * @param {Platform} [platform] - Default: English of Windows
   * @returns {string | null}
   */
  get(id, { platform, encoding, language } = WINDOWS_ENGLISH) {
    const record = this.records.find(
      (record) =>
        record.id === id &&
        record.platform === platform &&
        record.encoding === encoding &&
        record.language === language
    )
    return record?.text || null
  }

  /**
   * Give an entry of a platform a text, adding the entry when the platform has none.
   * @param {number} id
   * @param {Platform} where
   * @param {string} text
   */
  set(id, where, text) {
    const record = this.records.find(
      (record) =>
        record.id === id &&
        record.platform === where.platform &&
        record.encoding === where.encoding &&
        record.language === where.language
    )
    if (record) record.text = text
    else this.records.push({ ...where, id, text })
  }

  /** @param {number} id - Remove the entries of a name on every platform */
  remove(id) {
    this.records = this.records.filter((record) => record.id !== id)
  }

  /**
   * Give a name the same text on every platform and in every language that has it, or the
   * English of Windows when none has, or remove it.
   * @param {number} id
   * @param {string | null} text
   */
  rename(id, text) {
    if (text === null) return this.remove(id)
    const records = this.records.filter((record) => record.id === id)
    if (records.length === 0) this.set(id, WINDOWS_ENGLISH, text)
    for (const record of records) record.text = text
  }

  /** @returns {Platform[]} - The platforms and languages the names have, in a fixed order */
  platforms() {
    const keys = [...new Set(this.records.map((r) => `${r.platform}/${r.encoding}/${r.language}`))]
    return keys.sort().map((key) => {
      const [platform, encoding, language] = key.split('/').map(Number)
      return { platform, encoding, language }
    })
  }
}

/**
 * The axis values of `STAT` that name the style at a location, without the ones a style
 * leaves out, sorted by axis: `axisValuesFromAxisLimits`, `checkAxisValuesExist` and
 * `_sortAxisValues` of fontTools.
 * @param {StatTable} stat
 * @param {Record<string, number>} location - The value of every axis of `fvar`
 * @returns {AxisValue[]}
 * @throws {Error} When an axis that `STAT` names values of has no value at the location
 */
export function axisValuesAt(stat, location) {
  const tagOf = (/** @type {number} */ axis) => stat.axes[axis]?.tag
  const fits = (/** @type {{ axis: number, value: number }} */ { axis, value }) =>
    !(tagOf(axis) in location) || location[tagOf(axis)] === value
  const matching = stat.values.filter((value) => value.values.every(fits))

  const named = new Set(stat.values.flatMap((value) => value.values.map(({ axis }) => tagOf(axis))))
  const seen = new Set(
    matching.flatMap((value) =>
      value.values
        .filter(({ axis, value: at }) => tagOf(axis) in location && location[tagOf(axis)] === at)
        .map(({ axis }) => tagOf(axis))
    )
  )
  const missing = Object.keys(location).filter((tag) => named.has(tag) && !seen.has(tag))
  if (missing.length > 0) {
    throw new Error(
      `the STAT table names no style at ${missing.map((tag) => `${tag}=${location[tag]}`).join(', ')}`
    )
  }

  const shown = matching.filter((value) => !(value.flags & 2))
  /** @type {Array<[number, AxisValue]>} */
  const results = []
  const taken = new Set()
  // A value of several axes first, the one of the most axes first, then one per axis
  const multiple = shown
    .filter((value) => value.format === 4)
    .sort((a, b) => b.values.length - a.values.length)
  for (const value of multiple) {
    const axes = value.values.map(({ axis }) => axis)
    if (axes.some((axis) => taken.has(axis))) continue
    axes.forEach((axis) => taken.add(axis))
    results.push([Math.min(...axes), value])
  }
  for (const value of shown) {
    if (value.format === 4) continue
    const axis = value.values[0].axis
    if (taken.has(axis)) continue
    taken.add(axis)
    results.push([axis, value])
  }
  return results.sort((a, b) => a[0] - b[0]).map(([, value]) => value)
}

/**
 * Name the styles of a static font from the axis values of its location, on every platform
 * that has a family and a style: `_updateNameRecords` and `_updateNameTableStyleRecords` of
 * fontTools, with the regular, bold and italic model. A family keeps a style of that model
 * in its style name, and moves any other into the family, with a typographic family and
 * style beside.
 * @param {Names} names
 * @param {StatTable} stat
 * @param {AxisValue[]} values - Of `axisValuesAt()`
 */
function nameStyles(names, stat, values) {
  const isRibbi = (/** @type {number} */ id) => RIBBI.includes(names.get(id) ?? '')
  const ids = values.map((value) => value.nameId)
  const ribbi = ids.filter(isRibbi)
  const others = ids.filter((id) => !ribbi.includes(id))
  const elided = stat.elidedNameId

  for (const where of names.platforms()) {
    const text = (/** @type {number} */ id) => names.get(id, where)
    if (![1, 2, elided, ...ids].every((id) => text(id))) continue

    let style = ribbi.map(text).join(' ')
    let typographicStyle = others.length > 0 ? ids.map(text).join(' ') : null
    if (!typographicStyle && !style) {
      if (isRibbi(elided)) style = /** @type {string} */ (text(elided))
      else typographicStyle = text(elided)
    }
    const suffix = others.map(text).join(' ')
    const currentFamily = /** @type {string} */ (text(16) ?? text(1))

    /** @type {Record<number, string>} */
    const set = { 1: currentFamily, 2: style || 'Regular' }
    if (typographicStyle) {
      set[1] = `${currentFamily} ${suffix}`.trim()
      set[16] = currentFamily
      set[17] = typographicStyle
    } else {
      names.remove(16)
      names.remove(17)
    }
    const family = set[16] ?? set[1]
    const fullStyle = set[17] ?? set[2]
    set[4] = `${family} ${fullStyle}`
    const prefix = text(25) ?? family
    set[6] = `${prefix}-${fullStyle}`.replace(/[^A-Za-z0-9-]/g, '').slice(0, 127)
    // The unique name is written again below; only a platform that has one keeps one
    const unique = text(3)
    if (unique) set[3] = unique
    for (const [id, value] of Object.entries(set)) names.set(Number(id), where, value)
  }
}

/**
 * The name `STAT` gives the optical size a font is fixed at, such as `18pt`, or null for a
 * font without the axis and for a size the table leaves out of a name.
 * @param {StatTable} stat
 * @param {Names} names - The names of the variable font
 * @param {Record<string, number>} location
 * @returns {string | null}
 */
function cutOf(stat, names, location) {
  if (!('opsz' in location)) return null
  for (const value of stat.values) {
    if (value.format === 4 || stat.axes[value.values[0].axis]?.tag !== 'opsz') continue
    if (value.values[0].value === location.opsz && !(value.flags & 2))
      return names.get(value.nameId)
  }
  return null
}

/**
 * Write the static font of a variable font at a location.
 * @param {Buffer} font - The variable font: TrueType or OpenType, or in a WOFF container
 * @param {Record<string, number>} settings - The axes to fix and their values, by tag. An
 *   axis that is not given is fixed at its default
 * @param {{ name?: string }} [options] - `name`: the file, for the messages
 * @returns {Promise<StaticFont>}
 * @throws {Error} When the font is not variable, has not an axis or its value, or has no
 *   `STAT` table to name the style from; or when `subset-font` is not installed
 */
export async function staticFont(font, settings, { name = 'the font' } = {}) {
  const { hb, fontverter } = await loadHarfBuzz()
  const sfnt = Buffer.from(await fontverter.convert(font, 'truetype'))
  const tables = fontTables(sfnt, ['fvar', 'STAT', 'name', 'GSUB', 'GPOS'])
  if (!tables.fvar) throw new Error(`${name} is not a variable font`)

  const axes = readAxes(tables.fvar)
  /** @type {Record<string, number>} */
  const location = Object.fromEntries(axes.map((axis) => [axis.tag, axis.default]))
  for (const [tag, value] of Object.entries(settings)) {
    const axis = axes.find((axis) => axis.tag === tag)
    if (!axis)
      throw new Error(
        `${name} has no axis ${tag}. It has: ${axes.map((axis) => axis.tag).join(', ')}`
      )
    if (!(value >= axis.min && value <= axis.max)) {
      throw new Error(`${tag}=${value}: the axis ${tag} of ${name} is ${axis.min} to ${axis.max}`)
    }
    location[tag] = value
  }

  if (!tables.STAT)
    throw new Error(`${name} has no STAT table, which names the style of a static font`)
  const stat = readStat(tables.STAT)
  if (stat.values.length === 0) throw new Error(`the STAT table of ${name} names no style`)
  const values = axisValuesAt(stat, location)
  const cut = cutOf(stat, new Names(readNames(tables.name).records), location)

  const featureNames = [tables.GSUB, tables.GPOS].flatMap((table) =>
    table ? layoutNameIds(table) : []
  )
  const pinned = pinAxes(hb, sfnt, location, featureNames)
  const out = fontTables(pinned, ['name', 'OS/2', 'head'])
  const nameTable = readNames(out.name)
  const names = new Names(nameTable.records)
  nameStyles(names, stat, values)

  // The style bits of a regular, a bold and an italic, from the style name
  const os2 = Buffer.from(out['OS/2'])
  const head = Buffer.from(out.head)
  const ribbi = (names.get(2) ?? '').toLowerCase()
  if (['regular', 'bold', 'italic', 'bold italic'].includes(ribbi)) {
    let selection = os2.readUInt16BE(62) & ~(1 | (1 << 5) | (1 << 6))
    let macStyle = head.readUInt16BE(44) & ~0b11
    if (ribbi === 'regular') selection |= 1 << 6
    if (ribbi.includes('bold')) {
      selection |= 1 << 5
      macStyle |= 1
    }
    if (ribbi.includes('italic')) {
      selection |= 1
      macStyle |= 2
    }
    os2.writeUInt16BE(selection, 62)
    head.writeUInt16BE(macStyle, 44)
  }

  let family = /** @type {string} */ (names.get(16) ?? names.get(1))
  let style = /** @type {string} */ (names.get(17) ?? names.get(2))

  // An optical size is a part of the family, as in a download by weight, not of the style
  if (cut && (style === cut || style.startsWith(`${cut} `))) {
    family = `${family} ${cut}`
    style = style.slice(cut.length).trim() || 'Regular'
    const italic = style === 'Italic' || style.endsWith(' Italic')
    const weight = italic ? style.slice(0, -'Italic'.length).trim() : style
    if (['', 'Regular', 'Bold'].includes(weight)) {
      names.rename(1, family)
      names.rename(2, style)
    } else {
      names.rename(1, `${family} ${weight}`)
      names.rename(2, italic ? 'Italic' : 'Regular')
    }
    names.rename(16, family)
    names.rename(17, style)
    names.rename(4, `${family} ${style}`)
  }

  // The PostScript name and the unique name of a file by weight
  const postscript = `${family}-${style}`.replaceAll(' ', '')
  const vendor = os2.toString('latin1', 58, 62).trim()
  const revision = head.readInt32BE(4) / 65536
  names.rename(6, postscript)
  names.rename(3, `${revision.toFixed(3)};${vendor};${postscript}`)

  return {
    font: replaceTables(pinned, {
      name: writeNames({ records: names.records, languageTags: nameTable.languageTags }),
      'OS/2': os2,
      head
    }),
    fullName: /** @type {string} */ (names.get(4)),
    postscript,
    weight: os2.readUInt16BE(4)
  }
}

/**
 * The settings of the command line: `wght=600 opsz=18`.
 * @param {string[]} values
 * @returns {Record<string, number>}
 * @throws {Error} On a value that is not `<axis>=<number>`
 */
export function parseSettings(values) {
  /** @type {Record<string, number>} */
  const settings = {}
  for (const value of values) {
    const [tag, number] = [value.slice(0, value.indexOf('=')), value.slice(value.indexOf('=') + 1)]
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(number.trim())) {
      throw new Error(`${value}: the value of an axis is a number, such as wght=600`)
    }
    settings[tag] = Number(number)
  }
  return settings
}

const USAGE =
  'Usage: chassis-assets static-font <variable font> <output> [<output> ...] <axis>=<value> [<axis>=<value> ...]'

/** A setting of an axis: its tag of up to four letters or digits, `=` and the value. */
const SETTING_RE = /^[A-Za-z0-9]{1,4}=/

const HELP = `${USAGE}

Writes the static font of a variable font: every axis fixed, the ones given at their value,
such as wght=600, and the others at their default. The files by weight of a role, such as
ui-strong.ttf and ui-strong.woff2 from the variable ui.ttf. The font keeps every glyph,
every character and every layout feature, and gets the names that the STAT table gives the
values, with the PostScript name of a download by weight: Inter-SemiBoldItalic.

The variable font is TrueType or OpenType, or in a WOFF or WOFF2 container. The font is
written to each output: TrueType or OpenType as the variable font is, or WOFF2 or WOFF
when the name of the output ends so. Needs the package subset-font.

Options:
  --help, -h             Print this help
`

/**
 * The parts of the command line: the variable font, the outputs and the settings.
 * @param {string[]} argv
 * @returns {{ source: string, outputs: string[], settings: Record<string, number> } | null}
 *   Null when a part is missing
 * @throws {Error} On a setting whose value is not a number
 */
export function parseArgs(argv) {
  const settings = argv.filter((arg) => SETTING_RE.test(arg))
  const [source, ...outputs] = argv.filter((arg) => !SETTING_RE.test(arg))
  if (!source || outputs.length === 0 || settings.length === 0) return null
  return { source, outputs, settings: parseSettings(settings) }
}

/**
 * The command line of the static fonts: `chassis-assets static-font`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP)
    process.exit(0)
  }
  let args
  try {
    args = parseArgs(argv)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(2)
  }
  if (!args) {
    console.error(USAGE)
    process.exit(2)
  }
  const { source, outputs, settings } = args
  ;(async () => {
    const result = await staticFont(fs.readFileSync(source), settings, { name: source })
    const { fontverter } = await loadHarfBuzz()
    for (const output of outputs) {
      const extension = path.extname(output).toLowerCase()
      const data =
        extension === '.woff2' || extension === '.woff'
          ? await fontverter.convert(result.font, extension.slice(1))
          : result.font
      fs.writeFileSync(output, data)
      console.log(`${output}: ${result.fullName}, ${result.postscript}, weight ${result.weight}`)
    }
  })().catch((error) => {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  })
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
