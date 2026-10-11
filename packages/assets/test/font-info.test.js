/**
 * @file font-info.test.js
 * @description What a font file says of itself, `readFont()` of `build/font-info.js`: the
 *              family, the weight, the italic, the axes, the version and the number of
 *              glyphs, read from the fonts of the dev dependency `inter-ui` as WOFF2, and as
 *              WOFF and TrueType, which `beforeAll()` writes of them.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import subsetFont from 'subset-font'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { READABLE_FORMATS, axesOf, fontTables, readFont } from '../build/font-info.js'

vi.setConfig({ testTimeout: 30_000 })

const PACKAGE = path.dirname(createRequire(import.meta.url).resolve('inter-ui/package.json'))
const font = (/** @type {string} */ file) => fs.readFileSync(path.join(PACKAGE, file))

/** The version string of every font of the package. */
const VERSION = 'Version 4.001;git-9221beed3'

const regular = font('web/Inter-Regular.woff2')
const variable = font('variable/InterVariable.woff2')

/** The regular font in the two other formats, written by `beforeAll()`. */
const formats = /** @type {Record<string, Buffer>} */ ({})

beforeAll(async () => {
  formats.woff = await subsetFont(regular, 'abc', { targetFormat: 'woff' })
  formats.ttf = await subsetFont(regular, 'abc', { targetFormat: 'sfnt' })
  formats.variable = await subsetFont(variable, 'abc', { targetFormat: 'sfnt' })
})

describe('readFont()', () => {
  test.each([
    ['web/Inter-Regular.woff2', 'Inter', 400, false, 2937],
    ['web/Inter-Italic.woff2', 'Inter', 400, true, 2901],
    ['web/Inter-Bold.woff2', 'Inter', 700, false, 2937],
    ['web/Inter-SemiBoldItalic.woff2', 'Inter', 600, true, 2901],
    ['web/Inter-Thin.woff2', 'Inter', 100, false, 2937],
    ['display/InterDisplay-Regular.woff2', 'Inter Display', 400, false, 2937]
  ])('%s is of %s, with the weight %i', (file, family, weight, italic, glyphs) => {
    expect(readFont(font(file))).toEqual({
      family,
      weight,
      italic,
      axes: {},
      version: VERSION,
      glyphs
    })
  })

  test('a variable font has its axes, with the values they span', () => {
    expect(readFont(variable)).toEqual({
      family: 'Inter Variable',
      weight: 400,
      italic: false,
      axes: { opsz: { min: 14, max: 32 }, wght: { min: 100, max: 900 } },
      version: VERSION,
      glyphs: 2937
    })
    expect(readFont(font('variable/InterVariable-Italic.woff2')).italic).toBe(true)
  })

  test('reads the same of a font as WOFF and as TrueType', () => {
    // The three letters, with the glyphs a font has beside its letters
    const expected = {
      family: 'Inter',
      weight: 400,
      italic: false,
      axes: {},
      version: VERSION,
      glyphs: 12
    }
    expect(formats.woff.toString('latin1', 0, 4)).toBe('wOFF')
    expect(readFont(formats.woff)).toEqual(expected)
    expect(readFont(formats.ttf)).toEqual(expected)
    expect(readFont(formats.variable).axes).toEqual(readFont(variable).axes)
  })

  test('a font with fewer characters has fewer glyphs, and the version it had', () => {
    const latin = readFont(font('web-latin/Inter-Regular-subset.woff2'))
    expect(latin.glyphs).toBeLessThan(2937)
    expect(latin.glyphs).toBeGreaterThan(12)
    expect(latin.version).toBe(VERSION)
  })

  test('a file that is no font fails', () => {
    expect(() => readFont(Buffer.from('a line of text'))).toThrow(
      'the file is not a TrueType, OpenType, WOFF or WOFF2 font'
    )
    expect(() => readFont(Buffer.alloc(0))).toThrow('is not a TrueType')
    expect(() => readFont(regular.subarray(0, 40))).toThrow()
    expect(() => readFont(Buffer.from('wOF2ttcf'))).toThrow('a font collection is not read')
  })

  test('the formats it reads are the four of a font file', () => {
    expect(READABLE_FORMATS).toEqual(['.ttf', '.otf', '.woff', '.woff2'])
  })
})

describe('fontTables() and axesOf()', () => {
  test('gives the tables that are asked for, in every format', () => {
    for (const file of [regular, formats.woff, formats.ttf]) {
      const tables = fontTables(file, ['name', 'OS/2', 'fvar', 'none'])
      expect(Object.keys(tables).sort()).toEqual(['OS/2', 'name'])
      expect(tables['OS/2'].readUInt16BE(4)).toBe(400)
    }
    expect(Object.keys(fontTables(variable, ['fvar']))).toEqual(['fvar'])
  })

  test('a font without the table has no axis', () => {
    expect(axesOf(undefined)).toEqual({})
    expect(axesOf(fontTables(formats.variable, ['fvar']).fvar)).toEqual({
      opsz: { min: 14, max: 32 },
      wght: { min: 100, max: 900 }
    })
  })
})
