/**
 * @file static-font.test.js
 * @description `chassis-assets static-font` and the tables of `font-tables.js`, on the
 *              variable fonts of the dev dependency `inter-ui`. The names to expect are the
 *              ones fontTools and the instancer of the fonts page wrote for the same fonts at
 *              the same values: the command writes them as it did.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { fontTables, readFont } from '../build/font-info.js'
import {
  layoutNameIds,
  readAxes,
  readNames,
  readStat,
  replaceTables,
  writeNames
} from '../build/font-tables.js'
import { axisValuesAt, parseArgs, parseSettings, staticFont } from '../build/static-font.js'
import { CLI, removeTempDirs, ROOT, tempDir } from './helpers.js'

afterAll(removeTempDirs)

const PACKAGE = path.dirname(createRequire(import.meta.url).resolve('inter-ui/package.json'))
const UPRIGHT = fs.readFileSync(path.join(PACKAGE, 'variable/InterVariable.woff2'))
const ITALIC = fs.readFileSync(path.join(PACKAGE, 'variable/InterVariable-Italic.woff2'))

/**
 * The English names of Windows of a font, by number.
 * @param {Buffer} font
 * @returns {Record<number, string | null>}
 */
function names(font) {
  const { records } = readNames(fontTables(font, ['name']).name)
  const english = records.filter((r) => r.platform === 3 && r.language === 0x409)
  return Object.fromEntries(english.map((r) => [r.id, r.text]))
}

/**
 * The style bits of `OS/2` and `head`, and the weight class.
 * @param {Buffer} font
 */
function bits(font) {
  const { 'OS/2': os2, head } = fontTables(font, ['OS/2', 'head'])
  return {
    fsSelection: os2.readUInt16BE(62),
    macStyle: head.readUInt16BE(44),
    weight: os2.readUInt16BE(4)
  }
}

/**
 * The 32-bit sum of a file, which the adjustment of `head` makes the number the format asks.
 * @param {Buffer} file
 */
function fileSum(file) {
  let sum = 0
  for (let at = 0; at < file.length; at += 4) sum = (sum + file.readUInt32BE(at)) >>> 0
  return sum
}

describe('staticFont()', () => {
  test('SemiBold of the upright: a style outside regular and bold moves into the family', async () => {
    const { font, fullName, postscript, weight } = await staticFont(UPRIGHT, { wght: 600 })
    expect({ fullName, postscript, weight }).toEqual({
      fullName: 'Inter Variable Text SemiBold',
      postscript: 'InterVariableText-SemiBold',
      weight: 600
    })
    expect(names(font)).toMatchObject({
      1: 'Inter Variable Text SemiBold',
      2: 'Regular',
      3: '4.001;RSMS;InterVariableText-SemiBold',
      4: 'Inter Variable Text SemiBold',
      6: 'InterVariableText-SemiBold',
      16: 'Inter Variable Text',
      17: 'SemiBold'
    })
    // Regular, and the bit to use the typographic metrics of the variable font
    expect(bits(font)).toEqual({ fsSelection: 192, macStyle: 0, weight: 600 })
  })

  test('Bold of the italic: a bold italic keeps its style, with the bold and the italic bits', async () => {
    const { font, postscript } = await staticFont(ITALIC, { wght: 700 })
    expect(postscript).toBe('InterVariableText-BoldItalic')
    expect(names(font)).toMatchObject({
      1: 'Inter Variable Text',
      2: 'Bold Italic',
      4: 'Inter Variable Text Bold Italic',
      6: 'InterVariableText-BoldItalic',
      16: 'Inter Variable Text',
      17: 'Bold Italic'
    })
    expect(bits(font)).toEqual({ fsSelection: 161, macStyle: 3, weight: 700 })
  })

  test('an optical size that STAT names is a part of the family', async () => {
    const { font, postscript } = await staticFont(UPRIGHT, { wght: 600, opsz: 32 })
    expect(postscript).toBe('InterVariableDisplay-SemiBold')
    expect(names(font)).toMatchObject({
      1: 'Inter Variable Display SemiBold',
      2: 'Regular',
      16: 'Inter Variable Display',
      17: 'SemiBold'
    })
  })

  test('the font keeps every glyph, the outline of the missing glyph, and the names of its features', async () => {
    const { font } = await staticFont(UPRIGHT, { wght: 600 })
    expect(readFont(font).glyphs).toBe(readFont(UPRIGHT).glyphs)
    expect(readFont(font).axes).toEqual({})
    const tables = fontTables(font, ['fvar', 'gvar', 'head', 'loca'])
    expect(tables.fvar).toBeUndefined()
    expect(tables.gvar).toBeUndefined()
    // The outline of glyph 0 has a length: its two entries of `loca` differ
    const long = tables.head.readInt16BE(50) === 1
    const entry = (/** @type {number} */ i) =>
      long ? tables.loca.readUInt32BE(i * 4) : tables.loca.readUInt16BE(i * 2)
    expect(entry(1)).toBeGreaterThan(entry(0))
    expect(names(font)[276]).toBe('Open digits')
  })

  test('the same font at the same values gives the same bytes, with valid checksums', async () => {
    const a = await staticFont(UPRIGHT, { wght: 500 })
    const b = await staticFont(UPRIGHT, { wght: 500 })
    expect(a.font.equals(b.font)).toBe(true)
    expect(fileSum(a.font)).toBe(0xb1b0afba)
  })

  test('an axis that is not given is fixed at its default', async () => {
    const { postscript } = await staticFont(UPRIGHT, { wght: 400 })
    expect(postscript).toBe('InterVariableText-Regular')
  })

  test('refuses a font that is not variable, an axis it has not, and a value out of range', async () => {
    const { font } = await staticFont(UPRIGHT, { wght: 400 })
    await expect(staticFont(font, { wght: 600 }, { name: 'ui.ttf' })).rejects.toThrow(
      'ui.ttf is not a variable font'
    )
    await expect(staticFont(UPRIGHT, { wdth: 100 }, { name: 'ui.ttf' })).rejects.toThrow(
      'ui.ttf has no axis wdth. It has: opsz, wght'
    )
    await expect(staticFont(UPRIGHT, { wght: 1000 }, { name: 'ui.ttf' })).rejects.toThrow(
      'wght=1000: the axis wght of ui.ttf is 100 to 900'
    )
  })

  test('refuses a value that STAT has no name for, before anything is written', async () => {
    await expect(staticFont(UPRIGHT, { wght: 550 })).rejects.toThrow(
      'the STAT table names no style at wght=550'
    )
  })
})

describe('parseArgs()', () => {
  test('tells the outputs from the settings, in any order', () => {
    expect(
      parseArgs(['ui.ttf', 'ui-strong.ttf', 'ui-strong.woff2', 'wght=600', 'opsz=18'])
    ).toEqual({
      source: 'ui.ttf',
      outputs: ['ui-strong.ttf', 'ui-strong.woff2'],
      settings: { wght: 600, opsz: 18 }
    })
    expect(parseArgs(['ui.ttf', 'wght=600', 'out/ui-strong.ttf'])).toMatchObject({
      outputs: ['out/ui-strong.ttf']
    })
    expect(parseArgs(['ui.ttf', 'wght=600'])).toBeNull()
    expect(parseArgs(['ui.ttf', 'ui-strong.ttf'])).toBeNull()
  })
})

describe('parseSettings()', () => {
  test('reads <axis>=<number>, and refuses a value that is not a number', () => {
    expect(parseSettings(['wght=600', 'opsz=14.5'])).toEqual({ wght: 600, opsz: 14.5 })
    expect(() => parseSettings(['wght=bold'])).toThrow(
      'wght=bold: the value of an axis is a number, such as wght=600'
    )
    expect(() => parseSettings(['wght='])).toThrow('the value of an axis is a number')
  })
})

describe('font-tables.js', () => {
  test('reads the axes of fvar, the values of STAT and the names of the features', async () => {
    const { fontverter } = await import('../build/static-font.js').then((m) => m.loadHarfBuzz())
    const sfnt = Buffer.from(await fontverter.convert(UPRIGHT, 'truetype'))
    const tables = fontTables(sfnt, ['fvar', 'STAT', 'GSUB'])
    expect(readAxes(tables.fvar)).toEqual([
      { tag: 'opsz', min: 14, default: 14, max: 32 },
      { tag: 'wght', min: 100, default: 400, max: 900 }
    ])
    const stat = readStat(tables.STAT)
    expect(stat.axes.map((axis) => axis.tag)).toEqual(['opsz', 'wght', 'ital'])
    const values = axisValuesAt(stat, { opsz: 14, wght: 600 })
    // Text and SemiBold; Roman, which a style leaves out, is not among them
    expect(values.map((value) => value.values.map(({ axis }) => stat.axes[axis].tag))).toEqual([
      ['opsz'],
      ['wght']
    ])
    expect(layoutNameIds(tables.GSUB)).toContain(276)
  })

  test('writes a name table that reads back the same, and drops a Macintosh name Mac Roman cannot hold', () => {
    const records = [
      { platform: 3, encoding: 1, language: 0x409, id: 1, text: 'Ünïcode Family' },
      { platform: 1, encoding: 0, language: 0, id: 1, text: 'Café' },
      { platform: 1, encoding: 0, language: 0, id: 2, text: 'Ελληνικά' }
    ]
    const back = readNames(writeNames({ records, languageTags: [] })).records
    expect(back.map(({ platform, id, text }) => ({ platform, id, text }))).toEqual([
      { platform: 1, id: 1, text: 'Café' },
      { platform: 3, id: 1, text: 'Ünïcode Family' }
    ])
  })

  test('replaceTables() writes a file whose tables and whole sum are valid', async () => {
    const { font } = await staticFont(UPRIGHT, { wght: 400 })
    const name = fontTables(font, ['name']).name
    const again = replaceTables(font, { name })
    expect(fileSum(again)).toBe(0xb1b0afba)
    expect(names(again)[6]).toBe('InterVariableText-Regular')
  })
})

describe('chassis-assets static-font', () => {
  const run = (/** @type {string[]} */ ...args) =>
    spawnSync(process.execPath, [CLI, 'static-font', ...args], { encoding: 'utf-8' })

  test('writes the font, and prints its names and weight', () => {
    const dir = tempDir()
    const source = path.join(dir, 'ui.woff2')
    fs.writeFileSync(source, ITALIC)
    const output = path.join(dir, 'ui-strong-italic.ttf')
    const { status, stdout } = run(source, output, 'wght=600')
    expect(status).toBe(0)
    expect(stdout).toBe(
      `${output}: Inter Variable Text SemiBold Italic, InterVariableText-SemiBoldItalic, weight 600\n`
    )
    expect(readFont(fs.readFileSync(output))).toMatchObject({
      family: 'Inter Variable Text',
      weight: 600,
      italic: true
    })
  })

  test('writes the font to every output, as WOFF2 when the output ends so', () => {
    const dir = tempDir()
    const source = path.join(dir, 'ui.woff2')
    fs.writeFileSync(source, UPRIGHT)
    const ttf = path.join(dir, 'ui-strong.ttf')
    const woff2 = path.join(dir, 'ui-strong.woff2')
    const { status, stdout } = run(source, ttf, woff2, 'wght=600')
    expect(status).toBe(0)
    expect(stdout.trim().split('\n')).toEqual([
      `${ttf}: Inter Variable Text SemiBold, InterVariableText-SemiBold, weight 600`,
      `${woff2}: Inter Variable Text SemiBold, InterVariableText-SemiBold, weight 600`
    ])
    expect(fs.readFileSync(ttf).toString('latin1', 0, 4)).toBe('\x00\x01\x00\x00')
    expect(fs.readFileSync(woff2).toString('latin1', 0, 4)).toBe('wOF2')
    // One font in two formats: what the source lint compares
    const { glyphs, ...info } = readFont(fs.readFileSync(ttf))
    expect(readFont(fs.readFileSync(woff2))).toEqual({ glyphs, ...info })
  })

  test('exits 2 without the arguments, 0 on --help, and 1 on a font it cannot read', () => {
    expect(run().status).toBe(2)
    expect(run('ui.ttf', 'out.ttf').stderr).toContain('Usage: chassis-assets static-font')
    expect(run('ui.ttf', 'out.ttf', 'wght=bold')).toMatchObject({ status: 2 })
    expect(run('--help')).toMatchObject({ status: 0 })
    const missing = run(
      path.join(tempDir(), 'none.ttf'),
      path.join(tempDir(), 'out.ttf'),
      'wght=600'
    )
    expect(missing.status).toBe(1)
  })

  test('names the package to install when subset-font is not installed', () => {
    // A copy of the build where no node_modules is reached
    const copy = fs.realpathSync(tempDir())
    fs.cpSync(path.join(ROOT, 'build'), path.join(copy, 'build'), { recursive: true })
    const source = path.join(copy, 'ui.woff2')
    fs.writeFileSync(source, UPRIGHT)
    const result = spawnSync(
      process.execPath,
      [path.join(copy, 'build/static-font.js'), source, path.join(copy, 'out.ttf'), 'wght=600'],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('static-font needs the package subset-font')
    expect(result.stderr).toContain('Install it beside @chassis-ui/assets')
  })
})
