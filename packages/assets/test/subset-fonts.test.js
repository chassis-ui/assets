/**
 * @file subset-fonts.test.js
 * @description The `subset` option of the build, `--subset`. The fonts of the fixture are
 *              lines of text, which no subsetter reads, so these tests build a root of their
 *              own with a real font, the one of the package `inter-ui`: it has Latin, Greek
 *              and Cyrillic letters, and layout features that put an arrow in the place of
 *              `->`. A font without a Latin letter is made of it in `beforeAll()`. The
 *              variable font of the package has two axes, the weight and the optical size.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import subsetFont from 'subset-font'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { generateAssets } from '../build/build-assets.js'
import { androidProcessor, iosProcessor, webProcessor } from '../build/processors/index.js'
import {
  NAMED_RANGES,
  SUBSET_DEFAULTS,
  fontAxes,
  glyphCount,
  loadSubsetter,
  rangeFileName,
  rangeSlug,
  resolveSubset,
  subsetJob
} from '../build/subset-fonts.js'
import DistValidator from '../build/validate-assets.js'
import { ROOT, compareDirs, copyFixture, listFiles, removeTempDirs, tempDir } from './helpers.js'

vi.setConfig({ testTimeout: 30_000 })

const PACKAGE = path.dirname(createRequire(import.meta.url).resolve('inter-ui/package.json'))
const FONT = path.join(PACKAGE, 'web/Inter-Regular.woff2')
const VARIABLE = path.join(PACKAGE, 'variable/InterVariable.woff2')

/**
 * The fonts of the tests, by name. The package has the two WOFF2 files; the same font as
 * WOFF and as TTF, `greek.woff2` and the variable font as TTF are written by `beforeAll()`.
 */
const fonts = /** @type {Record<string, Buffer>} */ ({
  'text.woff2': fs.readFileSync(FONT),
  'variable.woff2': fs.readFileSync(VARIABLE)
})

/** @type {import('../build/subset-fonts.js').Subsetter} */
let subsetter

beforeAll(async () => {
  const all = { keepAllGlyphs: true }
  fonts['text.woff'] = await subsetFont(fonts['text.woff2'], undefined, {
    ...all,
    targetFormat: 'woff'
  })
  fonts['text.ttf'] = await subsetFont(fonts['text.woff2'], undefined, {
    ...all,
    targetFormat: 'sfnt'
  })
  fonts['greek.woff2'] = await subsetFont(fonts['text.woff2'], 'αβγδ')
  fonts['variable.ttf'] = await subsetFont(fonts['variable.woff2'], 'abc', {
    targetFormat: 'sfnt'
  })
  subsetter = await loadSubsetter()
})

afterAll(removeTempDirs)

/**
 * A root with one brand and two apps, `site` for the web and `mobile` for iOS and Android.
 * The fonts of `site` are a WOFF2 and a WOFF with their stylesheet and their license, and a
 * WOFF2 without a Latin letter; `site` has the WOFF2 as an icon font too, and `mobile` has
 * the TTF.
 * @param {Record<string, unknown>} [subset] - The `chassis.subset` block
 * @param {{ variable?: boolean, sheet?: string }} [options] - With `variable`, `site` has the
 *   variable font too, as `fonts/variable.woff2`. `sheet` is the stylesheet, where a test
 *   reads its rules
 * @returns {string} The root
 */
function root(subset, { variable = false, sheet = '@font-face { font-family: "Text"; }\n' } = {}) {
  const dir = tempDir('chassis-assets-subset-')
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'subset-fixture',
      chassis: {
        build: { brands: ['alpha'], apps: { site: ['web'], mobile: ['ios', 'android'] } },
        ...(subset ? { subset } : {})
      }
    })
  )
  const site = path.join(dir, 'source/default/site')
  fs.mkdirSync(path.join(site, 'fonts'), { recursive: true })
  fs.mkdirSync(path.join(site, 'icons'))
  for (const name of ['text.woff2', 'text.woff', 'greek.woff2']) {
    fs.writeFileSync(path.join(site, 'fonts', name), fonts[name])
  }
  if (variable) fs.writeFileSync(path.join(site, 'fonts/variable.woff2'), fonts['variable.woff2'])
  fs.writeFileSync(path.join(site, 'fonts/text.css'), sheet)
  fs.writeFileSync(path.join(site, 'fonts/text-license.txt'), 'The license of the font\n')
  fs.writeFileSync(path.join(site, 'icons/icons.woff2'), fonts['text.woff2'])

  const mobile = path.join(dir, 'source/default/mobile/fonts')
  fs.mkdirSync(mobile, { recursive: true })
  fs.writeFileSync(path.join(mobile, 'text.ttf'), fonts['text.ttf'])
  return dir
}

/**
 * Build a root into a temporary folder.
 * @param {string} cwd
 * @param {import('../build/build-assets.js').BuildOptions} [options]
 */
async function build(cwd, options = {}) {
  const out = tempDir()
  const stats = await generateAssets({ cwd, quiet: true, ...options, out })
  return { out, stats }
}

/** A stylesheet that declares the fonts of `root()`: one font in two formats, and another. */
const SHEET = `@font-face {
  font-family: "Text";
  font-weight: 400;
  src:
    url("text.woff2") format("woff2"),
    url("text.woff") format("woff");
}

@font-face {
  font-family: "Greek";
  src: url("greek.woff2") format("woff2");
}
`

/** The first four bytes of a font file, which name its format. */
const signature = (/** @type {Buffer} */ font) => font.toString('latin1', 0, 4)

describe('the processors', () => {
  test('the web subsets its WOFF and WOFF2 fonts, the apps keep theirs', () => {
    expect(webProcessor.subset).toEqual({
      type: 'fonts',
      formats: ['.woff', '.woff2'],
      stylesheets: ['.css', '.scss']
    })
    expect(iosProcessor.subset).toBeUndefined()
    expect(androidProcessor.subset).toBeUndefined()
  })
})

describe('resolveSubset()', () => {
  test('the defaults are the Latin ranges', () => {
    const settings = resolveSubset()
    expect(settings.ranges).toEqual(['latin', 'latin-ext'])
    expect(settings.ranges).toEqual(SUBSET_DEFAULTS.ranges)
    for (const character of ['A', 'z', '0', ' ', 'é', 'ğ', 'İ', 'ş', '€']) {
      expect(settings.text).toContain(character)
    }
    for (const character of ['Ж', 'α', '→', '∑', '中']) {
      expect(settings.text).not.toContain(character)
    }
  })

  test('a block names the ranges, by name or as U+ ranges', () => {
    const settings = resolveSubset({ ranges: ['greek', 'U+0041-0043', 'u+2192'] })
    expect(settings.ranges).toEqual(['greek', 'U+0041-0043', 'u+2192'])
    expect(settings.text).toContain('α')
    expect(settings.text).toContain('ABC')
    expect(settings.text).toContain('→')
    expect(settings.text).not.toContain('D')
  })

  test('the values of the option win over the block', () => {
    const settings = resolveSubset({ ranges: ['greek'] }, ['cyrillic'])
    expect(settings.ranges).toEqual(['cyrillic'])
    expect(settings.text).toContain('Ж')
    expect(settings.text).not.toContain('α')
  })

  test('a character of two ranges is in the text once, and the text is sorted', () => {
    const { text } = resolveSubset(undefined, ['U+0042-0043', 'U+0041-0042'])
    expect(text).toBe('ABC')
  })

  test('math and symbols are ranges of their own', () => {
    expect(resolveSubset(undefined, ['math']).text).toContain('∑')
    expect(resolveSubset(undefined, ['symbols']).text).toContain('★')
    expect(resolveSubset(undefined, ['symbols']).text).toContain(String.fromCodePoint(0x1f512))
  })

  test('every name stands for ranges that are written as U+ ranges', () => {
    for (const name of Object.keys(NAMED_RANGES)) {
      expect(resolveSubset(undefined, [name]).text.length).toBeGreaterThan(0)
    }
  })

  test('names every problem of a block', () => {
    expect(() => resolveSubset([])).toThrow('chassis.subset is an object')
    expect(() => resolveSubset({ range: ['latin'], ranges: 'latin' })).toThrow(
      /chassis\.subset is not valid:\n {2}- "range" is not a setting\. Known: ranges, axes, split\n {2}- "ranges" is a list/
    )
    expect(() => resolveSubset({ ranges: [] })).toThrow('"ranges" is a list')
    expect(() => resolveSubset({ ranges: ['latin', 'klingon'] })).toThrow(
      'chassis.subset is not valid:\n  - "klingon" is not a range. Known: latin, latin-ext, cyrillic'
    )
  })

  test('no axis is fixed without the setting', () => {
    expect(resolveSubset().axes).toEqual({})
    expect(resolveSubset({ ranges: ['greek'] }).axes).toEqual({})
    expect(SUBSET_DEFAULTS.axes).toEqual({})
  })

  test('a block names the axes that are fixed, by brand', () => {
    const axes = { alpha: { opsz: 14 }, beta: { opsz: 20, wdth: 87.5 } }
    expect(resolveSubset({ axes }).axes).toEqual(axes)
    expect(resolveSubset({ axes }, ['greek'], ['alpha', 'beta', 'gamma']).axes).toEqual(axes)
    expect(resolveSubset({ axes: {} }).axes).toEqual({})
  })

  test('names every problem of the axes', () => {
    expect(() => resolveSubset({ axes: ['opsz'] })).toThrow(
      'chassis.subset is not valid:\n  - "axes" is an object of axes by brand, such as { "<brand>": { "opsz": 14 } }'
    )
    expect(() => resolveSubset({ axes: { opsz: 14 } })).toThrow(
      '"axes" of the brand "opsz" is an object of values by axis'
    )
    expect(() =>
      resolveSubset({ axes: { alpha: { optical: 14, opsz: '14', wght: Infinity } } })
    ).toThrow(
      /- "optical" of the brand "alpha" is not the tag of an axis, such as opsz\n {2}- "opsz" of the brand "alpha" is fixed at a number, such as 14\n {2}- "wght" of the brand "alpha" is fixed at a number/
    )
  })

  test('the axes name a brand of the configuration, when the brands are given', () => {
    const block = { axes: { gamma: { opsz: 14 } } }
    expect(resolveSubset(block).axes).toEqual(block.axes)
    expect(() => resolveSubset(block, [], ['alpha', 'beta'])).toThrow(
      'chassis.subset is not valid:\n  - "axes" names "gamma", which is not a brand. Configured: alpha, beta'
    )
    // The ranges of the option are right: the problem is one of the block
    expect(() => resolveSubset(block, ['greek'], ['alpha'])).toThrow('chassis.subset is not valid')
  })

  test('a font is one file without the setting, and split is true or false', () => {
    expect(resolveSubset().split).toBe(false)
    expect(SUBSET_DEFAULTS.split).toBe(false)
    expect(resolveSubset({ split: true }).split).toBe(true)
    expect(resolveSubset({ split: false }, ['greek']).split).toBe(false)
    expect(() => resolveSubset({ split: 'latin' })).toThrow(
      'chassis.subset is not valid:\n  - "split" is true or false'
    )
  })

  test('the ranges are there one by one, with their characters and their unicode-range', () => {
    const { parts } = resolveSubset(undefined, ['latin', 'u+2192', 'U+0041-005a', 'latin'])
    expect(parts.map((part) => part.range)).toEqual(['latin', 'u+2192', 'U+0041-005a'])
    expect(parts.map((part) => part.slug)).toEqual(['latin', 'u2192', 'u0041-005a'])
    expect(parts[0].unicodeRange).toBe(NAMED_RANGES.latin)
    expect(parts[1].unicodeRange).toBe('U+2192')
    expect(parts[2].unicodeRange).toBe('U+0041-005A')
    expect(parts[0].text).toContain('é')
    expect(parts[0].text).not.toContain('→')
    expect(parts[1].text).toBe('→')
    expect(parts[2].text).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(resolveSubset().parts.map((part) => part.slug)).toEqual(['latin', 'latin-ext'])
  })

  test('names a value of the option that is no range', () => {
    expect(() => resolveSubset(undefined, ['U+00FF-0041'])).toThrow(
      '--subset is not valid:\n  - "U+00FF-0041" is not a range'
    )
    expect(() => resolveSubset(undefined, ['U+110000'])).toThrow('"U+110000" is not a range')
    expect(() => resolveSubset({ ranges: ['greek'] }, ['0041'])).toThrow('"0041" is not a range')
  })
})

describe('rangeSlug() and rangeFileName()', () => {
  test('a range has a name of lowercase letters, digits and hyphens', () => {
    expect(rangeSlug('latin-ext')).toBe('latin-ext')
    expect(rangeSlug('U+2500-257F')).toBe('u2500-257f')
    expect(rangeSlug('u+41')).toBe('u41')
    expect(rangeSlug('U+0041, U+0061-007A')).toBe('u0041-u0061-007a')
  })

  test('the file of a range has the name of the range before its extension', () => {
    expect(rangeFileName('text.woff2', 'latin')).toBe('text-latin.woff2')
    expect(rangeFileName('fonts/text-italic.woff', 'u2500-257f')).toBe(
      'fonts/text-italic-u2500-257f.woff'
    )
    // A build renames the files it finds in an output, and leaves these names
    for (const range of ['latin-ext', 'U+2500-257F']) {
      const name = rangeFileName('text-italic.woff2', rangeSlug(range))
      expect(webProcessor.renameFile(name, { currentDir: 'fonts', parentDir: 'alpha' })).toBe(name)
    }
    expect(rangeFileName(path.join('a', 'TEXT.WOFF'), 'latin')).toBe(
      path.join('a', 'TEXT-latin.WOFF')
    )
  })
})

describe('glyphCount()', () => {
  test('reads the count of a TrueType font', () => {
    expect(glyphCount(fonts['text.ttf'])).toBeGreaterThan(1000)
  })

  test('fails on a file without the table', () => {
    expect(() => glyphCount(Buffer.alloc(12))).toThrow('The font has no maxp table')
  })
})

describe('fontAxes()', () => {
  test('reads the axes of a variable font, with the values they span', () => {
    expect(fontAxes(fonts['variable.ttf'])).toEqual({
      opsz: { min: 14, max: 32 },
      wght: { min: 100, max: 900 }
    })
  })

  test('a font that is not variable has none', () => {
    expect(fontAxes(fonts['text.ttf'])).toEqual({})
  })
})

describe('loadSubsetter()', () => {
  const { text } = resolveSubset()

  test('a font is smaller, keeps the characters of the ranges and loses the others', async () => {
    const subset = /** @type {Buffer} */ (await subsetter.subset(fonts['text.woff2'], text))
    expect(subset.length).toBeLessThan(fonts['text.woff2'].length * 0.75)
    expect(await subsetter.glyphs(subset, 'A')).toBeGreaterThan(0)
    expect(await subsetter.glyphs(subset, 'ğ')).toBe(
      await subsetter.glyphs(fonts['text.woff2'], 'ğ')
    )
    expect(await subsetter.glyphs(fonts['text.woff2'], 'Ж')).toBe(1)
    expect(await subsetter.glyphs(subset, 'Ж')).toBe(0)
  })

  test('a font keeps its layout features: the arrow of -> is still there', async () => {
    const subset = /** @type {Buffer} */ (await subsetter.subset(fonts['text.woff2'], text))
    const before = await subsetter.glyphs(fonts['text.woff2'], '->')
    expect(before).toBeGreaterThan(2)
    expect(await subsetter.glyphs(subset, '->')).toBe(before)
  })

  test('a font keeps its format', async () => {
    const woff2 = /** @type {Buffer} */ (await subsetter.subset(fonts['text.woff2'], text))
    const woff = /** @type {Buffer} */ (await subsetter.subset(fonts['text.woff'], text))
    expect(signature(woff2)).toBe('wOF2')
    expect(signature(woff)).toBe('wOFF')
  })

  test('a font without a character of the ranges gives null', async () => {
    expect(await subsetter.subset(fonts['greek.woff2'], text)).toBeNull()
    expect(await subsetter.subset(fonts['greek.woff2'], 'α')).not.toBeNull()
  })

  test('one content is subsetted once', async () => {
    const first = subsetter.subset(fonts['text.woff'], 'abc')
    expect(subsetter.subset(Buffer.from(fonts['text.woff']), 'abc')).toBe(first)
    expect(subsetter.subset(fonts['text.woff'], 'abd')).not.toBe(first)
    await first
  })

  test('a file that is no font fails', async () => {
    await expect(subsetter.subset(Buffer.from('a line of text'), 'abc')).rejects.toThrow()
  })

  test('reads the axes of a font in its format', async () => {
    expect(Object.keys(await subsetter.axes(fonts['variable.woff2'])).sort()).toEqual([
      'opsz',
      'wght'
    ])
    expect(await subsetter.axes(fonts['text.woff'])).toEqual({})
  })

  test('a variable font keeps its axes', async () => {
    const subset = /** @type {Buffer} */ (await subsetter.subset(fonts['variable.woff2'], text))
    expect(await subsetter.axes(subset)).toEqual(await subsetter.axes(fonts['variable.woff2']))
  })

  test('an axis is fixed at a value: the font loses it, keeps the others and is smaller', async () => {
    const whole = /** @type {Buffer} */ (await subsetter.subset(fonts['variable.woff2'], text))
    const fixed = /** @type {Buffer} */ (
      await subsetter.subset(fonts['variable.woff2'], text, { opsz: 14 })
    )
    expect(await subsetter.axes(fixed)).toEqual({ wght: { min: 100, max: 900 } })
    expect(fixed.length).toBeLessThan(whole.length * 0.8)
    expect(signature(fixed)).toBe('wOF2')
    expect(await subsetter.glyphs(fixed, 'ğ->')).toBe(await subsetter.glyphs(whole, 'ğ->'))
  })

  test('a font without the axis is subsetted as it is', async () => {
    const plain = /** @type {Buffer} */ (await subsetter.subset(fonts['text.woff2'], text))
    const asked = /** @type {Buffer} */ (
      await subsetter.subset(fonts['text.woff2'], text, { opsz: 14 })
    )
    expect(asked.equals(plain)).toBe(true)
    // An axis the font has not, beside one it has
    const fixed = /** @type {Buffer} */ (
      await subsetter.subset(fonts['variable.woff2'], text, { opsz: 14, slnt: 0 })
    )
    expect(await subsetter.axes(fixed)).toEqual({ wght: { min: 100, max: 900 } })
  })

  test('a value outside the axis fails, and names the axis', async () => {
    await expect(subsetter.subset(fonts['variable.woff2'], text, { opsz: 40 })).rejects.toThrow(
      'the axis opsz of the font is 14 to 32, and chassis.subset fixes it at 40'
    )
  })

  test('one content is subsetted once per value of an axis', async () => {
    const first = subsetter.subset(fonts['variable.woff2'], 'abc', { opsz: 14 })
    expect(subsetter.subset(fonts['variable.woff2'], 'abc', { opsz: 14 })).toBe(first)
    expect(subsetter.subset(fonts['variable.woff2'], 'abc', { opsz: 20 })).not.toBe(first)
    expect(subsetter.subset(fonts['variable.woff2'], 'abc')).not.toBe(first)
    await first
  })
})

describe('subsetJob()', () => {
  const settings = resolveSubset()
  const web = /** @type {import('../build/types.js').FontSubset} */ (webProcessor.subset)

  /** A job folder with the fonts of the tests under `fonts/`. */
  function job() {
    const dir = tempDir()
    fs.mkdirSync(path.join(dir, 'fonts/nested'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'fonts/text.woff2'), fonts['text.woff2'])
    fs.writeFileSync(path.join(dir, 'fonts/nested/TEXT.WOFF'), fonts['text.woff'])
    fs.writeFileSync(path.join(dir, 'fonts/text.ttf'), fonts['text.ttf'])
    fs.writeFileSync(path.join(dir, 'fonts/text.css'), 'a stylesheet')
    return dir
  }

  test('writes a font again when the result is smaller, and counts what that saves', async () => {
    const dir = job()
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    const woff2 = fs.statSync(path.join(dir, 'fonts/text.woff2')).size
    const woff = fs.statSync(path.join(dir, 'fonts/nested/TEXT.WOFF')).size
    expect(result.subsetted).toBe(2)
    expect(result.saved).toBe(fonts['text.woff2'].length - woff2 + fonts['text.woff'].length - woff)
    expect(result.kept).toEqual([])
    expect(result.failed).toEqual([])
    expect(result.fixed).toEqual({})
  })

  test('fixes the axes of the brand, in the fonts that have them', async () => {
    const withAxes = { ...settings, axes: { alpha: { opsz: 14, slnt: 0 } } }
    const dir = job()
    fs.writeFileSync(path.join(dir, 'fonts/variable.woff2'), fonts['variable.woff2'])
    const result = await subsetJob(dir, {
      fonts: web,
      settings: withAxes,
      subsetter,
      brand: 'alpha'
    })
    expect(result.subsetted).toBe(3)
    expect(result.fixed).toEqual({ opsz: 1 })
    expect(result.failed).toEqual([])
    const written = fs.readFileSync(path.join(dir, 'fonts/variable.woff2'))
    expect(Object.keys(await subsetter.axes(written))).toEqual(['wght'])
  })

  test('fixes no axis for another brand, and none without a brand', async () => {
    const withAxes = { ...settings, axes: { alpha: { opsz: 14 } } }
    for (const brand of ['beta', undefined]) {
      const dir = job()
      fs.writeFileSync(path.join(dir, 'fonts/variable.woff2'), fonts['variable.woff2'])
      const result = await subsetJob(dir, { fonts: web, settings: withAxes, subsetter, brand })
      expect(result.fixed).toEqual({})
      const written = fs.readFileSync(path.join(dir, 'fonts/variable.woff2'))
      expect(Object.keys(await subsetter.axes(written)).sort()).toEqual(['opsz', 'wght'])
    }
  })

  test('reports a font whose axis does not reach the value', async () => {
    const withAxes = { ...settings, axes: { alpha: { opsz: 40 } } }
    const dir = job()
    fs.writeFileSync(path.join(dir, 'fonts/variable.woff2'), fonts['variable.woff2'])
    const result = await subsetJob(dir, {
      fonts: web,
      settings: withAxes,
      subsetter,
      brand: 'alpha'
    })
    expect(result.failed).toEqual([
      {
        file: path.join(dir, 'fonts/variable.woff2'),
        message: 'the axis opsz of the font is 14 to 32, and chassis.subset fixes it at 40'
      }
    ])
    expect(
      fs.readFileSync(path.join(dir, 'fonts/variable.woff2')).equals(fonts['variable.woff2'])
    ).toBe(true)
  })

  test('reads the formats of the processor only', async () => {
    const dir = job()
    await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(fs.readFileSync(path.join(dir, 'fonts/text.ttf')).equals(fonts['text.ttf'])).toBe(true)
    expect(fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')).toBe('a stylesheet')
  })

  test('keeps a font that the subset does not make smaller', async () => {
    const dir = job()
    const same = { ...subsetter, subset: async (/** @type {Buffer} */ font) => font }
    const result = await subsetJob(dir, { fonts: web, settings, subsetter: same })
    expect(result.subsetted).toBe(0)
    expect(result.saved).toBe(0)
  })

  test('keeps a font without a character of the ranges, and names it', async () => {
    const dir = job()
    fs.writeFileSync(path.join(dir, 'fonts/greek.woff2'), fonts['greek.woff2'])
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(result.kept).toEqual([path.join(dir, 'fonts/greek.woff2')])
    expect(fs.readFileSync(path.join(dir, 'fonts/greek.woff2')).equals(fonts['greek.woff2'])).toBe(
      true
    )
  })

  test('reports a file the subsetter cannot read, and goes on', async () => {
    const dir = job()
    fs.writeFileSync(path.join(dir, 'fonts/broken.woff2'), 'a line of text')
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].file).toBe(path.join(dir, 'fonts/broken.woff2'))
    expect(result.subsetted).toBe(2)
  })

  test('does nothing for a job without the folder', async () => {
    const result = await subsetJob(tempDir(), { fonts: web, settings, subsetter })
    expect(result).toEqual({
      subsetted: 0,
      saved: 0,
      kept: [],
      failed: [],
      fixed: {},
      ranged: 0,
      sheets: 0,
      unsplit: []
    })
  })
})

describe('subsetJob() with split', () => {
  const web = /** @type {import('../build/types.js').FontSubset} */ (webProcessor.subset)
  // A range of each kind: two that the font has, by name, and one that it has not
  const settings = resolveSubset({ split: true }, ['latin', 'greek', 'U+4E00-4E10'])

  /**
   * A job folder with the font in two formats, one in a folder, and a stylesheet.
   * @param {string} sheet - The stylesheet, `fonts/text.css`
   */
  function job(sheet) {
    const dir = tempDir()
    fs.mkdirSync(path.join(dir, 'fonts/nested'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'fonts/text.woff2'), fonts['text.woff2'])
    fs.writeFileSync(path.join(dir, 'fonts/nested/text.woff'), fonts['text.woff'])
    fs.writeFileSync(path.join(dir, 'fonts/other.woff2'), fonts['text.woff2'])
    fs.writeFileSync(path.join(dir, 'fonts/text.css'), sheet)
    return dir
  }
  const sheet = `@font-face {
  font-family: "Text";
  src: url("text.woff2") format("woff2"), url("nested/text.woff") format("woff");
}
`
  const fontFiles = (/** @type {string} */ dir) =>
    listFiles(dir).filter((file) => /\.woff2?$/.test(file))

  test('writes a declared font once per range, beside itself, and keeps the font', async () => {
    const dir = job(sheet)
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(fontFiles(dir)).toEqual([
      'fonts/nested/text-greek.woff',
      'fonts/nested/text-latin.woff',
      'fonts/nested/text.woff',
      'fonts/other.woff2',
      'fonts/text-greek.woff2',
      'fonts/text-latin.woff2',
      'fonts/text.woff2'
    ])
    expect(result.ranged).toBe(4)
    expect(result.sheets).toBe(1)
    expect(result.subsetted).toBe(3)
    expect(result.unsplit).toEqual([])
    expect(result.failed).toEqual([])

    const read = (/** @type {string} */ name) => fs.readFileSync(path.join(dir, 'fonts', name))
    expect(await subsetter.glyphs(read('text-latin.woff2'), 'A')).toBeGreaterThan(0)
    expect(await subsetter.glyphs(read('text-latin.woff2'), 'α')).toBe(0)
    expect(await subsetter.glyphs(read('text-greek.woff2'), 'α')).toBeGreaterThan(0)
    expect(await subsetter.glyphs(read('text-greek.woff2'), 'A')).toBe(0)
    expect(signature(read('nested/text-latin.woff'))).toBe('wOFF')
    // The font itself has the characters of every range, as without the setting
    expect(await subsetter.glyphs(read('text.woff2'), 'A')).toBeGreaterThan(0)
    expect(await subsetter.glyphs(read('text.woff2'), 'α')).toBeGreaterThan(0)
    expect(read('text-latin.woff2').length).toBeLessThan(read('text.woff2').length)
  })

  test('writes the rule once per range, the first range last', async () => {
    const dir = job(sheet)
    await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')).toBe(`@font-face {
  font-family: "Text";
  src: url("text-greek.woff2") format("woff2"), url("nested/text-greek.woff") format("woff");
  unicode-range: ${NAMED_RANGES.greek};
}

@font-face {
  font-family: "Text";
  src: url("text-latin.woff2") format("woff2"), url("nested/text-latin.woff") format("woff");
  unicode-range: ${NAMED_RANGES.latin};
}
`)
  })

  test('a range by its code points has them in the name of its file', async () => {
    const dir = job(sheet)
    const byCode = resolveSubset({ split: true }, ['U+0041-005A', 'u+3b1'])
    await subsetJob(dir, { fonts: web, settings: byCode, subsetter })
    expect(fontFiles(dir)).toContain('fonts/text-u0041-005a.woff2')
    expect(fontFiles(dir)).toContain('fonts/text-u3b1.woff2')
    const css = fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')
    expect(css).toContain('url("text-u0041-005a.woff2")')
    expect(css).toContain('unicode-range: U+0041-005A;')
    expect(css).toContain('unicode-range: U+3B1;')
  })

  test('leaves a font that no stylesheet declares in one file', async () => {
    const dir = job(sheet)
    await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(fontFiles(dir).filter((file) => file.startsWith('fonts/other'))).toEqual([
      'fonts/other.woff2'
    ])
  })

  test('leaves a rule with a unicode-range of its own, and what it declares', async () => {
    const own = sheet.replace('}', '  unicode-range: U+0041;\n}')
    const dir = job(own)
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(result.ranged).toBe(0)
    expect(result.sheets).toBe(0)
    expect(result.unsplit).toEqual([])
    expect(fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')).toBe(own)
    expect(fontFiles(dir)).toHaveLength(3)
  })

  test('leaves a rule that declares something else than a font of the folder, and names it', async () => {
    for (const url of [
      'missing.woff2',
      'text.ttf',
      'https://example.com/text.woff2',
      '/text.woff2',
      'text.woff2?v=2',
      '../text.woff2'
    ]) {
      const other = `${sheet}@font-face { font-family: "Other"; src: url("text.woff2"), url("${url}"); }\n`
      const dir = job(other)
      fs.writeFileSync(path.join(dir, 'fonts/text.ttf'), fonts['text.ttf'])
      const result = await subsetJob(dir, { fonts: web, settings, subsetter })
      expect(result.unsplit).toEqual([
        {
          sheet: path.join(dir, 'fonts/text.css'),
          reason: `declares ${url}, which is not a font of its folder`
        }
      ])
      const css = fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')
      expect(css).toContain(
        `@font-face { font-family: "Other"; src: url("text.woff2"), url("${url}"); }`
      )
      // The first rule is split all the same
      expect(result.ranged).toBe(4)
      expect(css).toContain('url("text-latin.woff2")')
    }
  })

  test('leaves a rule whose file of a range would be a font that a rule declares', async () => {
    const taken = `${sheet}@font-face { font-family: "Latin"; src: url("text-latin.woff2"); unicode-range: U+0041; }\n`
    const dir = job(taken)
    fs.writeFileSync(path.join(dir, 'fonts/text-latin.woff2'), fonts['greek.woff2'])
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(result.ranged).toBe(0)
    expect(result.unsplit).toEqual([
      {
        sheet: path.join(dir, 'fonts/text.css'),
        reason:
          'the file of a range would be text-latin.woff2, which is a font that a stylesheet declares'
      }
    ])
    expect(fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')).toBe(taken)
    expect(
      fs.readFileSync(path.join(dir, 'fonts/text-latin.woff2')).equals(fonts['greek.woff2'])
    ).toBe(true)
  })

  test('a rule of a font without a character of the ranges stays', async () => {
    const greek = `@font-face { font-family: "Greek"; src: url("greek.woff2"); }\n`
    const dir = job(greek)
    fs.writeFileSync(path.join(dir, 'fonts/greek.woff2'), fonts['greek.woff2'])
    const latin = resolveSubset({ split: true }, ['latin'])
    const result = await subsetJob(dir, { fonts: web, settings: latin, subsetter })
    expect(result.kept).toEqual([path.join(dir, 'fonts/greek.woff2')])
    expect(result.ranged).toBe(0)
    expect(fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')).toBe(greek)
  })

  test('the file of a range from an earlier build is written again, not subsetted', async () => {
    const dir = job(sheet)
    fs.writeFileSync(path.join(dir, 'fonts/text-latin.woff2'), fonts['text.woff2'])
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(result.subsetted).toBe(3)
    const latin = fs.readFileSync(path.join(dir, 'fonts/text-latin.woff2'))
    expect(await subsetter.glyphs(latin, 'α')).toBe(0)
  })

  test('fixes the axes of the brand in the files of the ranges too', async () => {
    const variable = `@font-face { font-family: "Variable"; src: url("variable.woff2"); }\n`
    const dir = job(variable)
    fs.writeFileSync(path.join(dir, 'fonts/variable.woff2'), fonts['variable.woff2'])
    const withAxes = { ...settings, axes: { alpha: { opsz: 14 } } }
    const result = await subsetJob(dir, {
      fonts: web,
      settings: withAxes,
      subsetter,
      brand: 'alpha'
    })
    expect(result.ranged).toBe(2)
    expect(result.fixed).toEqual({ opsz: 1 })
    for (const name of ['variable.woff2', 'variable-latin.woff2', 'variable-greek.woff2']) {
      const font = fs.readFileSync(path.join(dir, 'fonts', name))
      expect(Object.keys(await subsetter.axes(font))).toEqual(['wght'])
    }
  })

  test('reads the stylesheets of the processor, SCSS among them', async () => {
    const dir = job('')
    fs.writeFileSync(
      path.join(dir, 'fonts/text.scss'),
      `// The text font\n@font-face {\n  src: url("text.woff2"); // one file\n}\n`
    )
    fs.writeFileSync(path.join(dir, 'fonts/text.txt'), sheet)
    const result = await subsetJob(dir, { fonts: web, settings, subsetter })
    expect(result.sheets).toBe(1)
    expect(fs.readFileSync(path.join(dir, 'fonts/text.txt'), 'utf-8')).toBe(sheet)
    expect(fs.readFileSync(path.join(dir, 'fonts/text.scss'), 'utf-8')).toContain(
      `  src: url("text-latin.woff2"); // one file\n  unicode-range: ${NAMED_RANGES.latin};\n`
    )
    const none = await subsetJob(job(sheet), {
      fonts: { type: 'fonts', formats: ['.woff2'] },
      settings,
      subsetter
    })
    expect(none.ranged).toBe(0)
  })

  test('writes one file without the setting', async () => {
    const dir = job(sheet)
    const whole = resolveSubset(undefined, ['latin', 'greek'])
    const result = await subsetJob(dir, { fonts: web, settings: whole, subsetter })
    expect(result.ranged).toBe(0)
    expect(result.sheets).toBe(0)
    expect(fontFiles(dir)).toHaveLength(3)
    expect(fs.readFileSync(path.join(dir, 'fonts/text.css'), 'utf-8')).toBe(sheet)
  })
})

describe('generateAssets() with subset', () => {
  test('writes the web fonts again, smaller, and changes nothing else', async () => {
    const cwd = root()
    const plain = await build(cwd)
    const { out, stats } = await build(cwd, { subset: true })

    expect(compareDirs(plain.out, out)).toEqual({
      missing: [],
      extra: [],
      changed: ['web/site/alpha/fonts/text.woff', 'web/site/alpha/fonts/text.woff2']
    })
    expect(plain.stats.fontsSubsetted).toBe(0)
    expect(stats.fontsSubsetted).toBe(2)
    expect(stats.filesProcessed).toBe(plain.stats.filesProcessed)
    const sizes = ['text.woff', 'text.woff2'].map(
      (name) => fs.statSync(path.join(out, 'web/site/alpha/fonts', name)).size
    )
    expect(stats.fontBytesSaved).toBe(
      fonts['text.woff'].length + fonts['text.woff2'].length - sizes[0] - sizes[1]
    )
  })

  test('warns about the font it keeps, which has no character of the ranges', async () => {
    const { stats } = await build(root(), { subset: true })
    expect(stats.warnings).toHaveLength(1)
    expect(stats.warnings[0]).toContain('Not subsetted, the font has no character of the ranges')
    expect(stats.warnings[0]).toContain(path.join('web/site/alpha/fonts/greek.woff2'))
  })

  test('chassis.subset names the ranges, and the values of the option win', async () => {
    const cwd = root({ ranges: ['greek'] })
    const greek = await build(cwd, { subset: true })
    const font = fs.readFileSync(path.join(greek.out, 'web/site/alpha/fonts/text.woff2'))
    expect(await subsetter.glyphs(font, 'α')).toBeGreaterThan(0)
    expect(await subsetter.glyphs(font, 'A')).toBe(0)
    expect(greek.stats.warnings).toEqual([])

    const latin = await build(cwd, { subset: ['latin'] })
    const other = fs.readFileSync(path.join(latin.out, 'web/site/alpha/fonts/text.woff2'))
    expect(await subsetter.glyphs(other, 'α')).toBe(0)
    expect(await subsetter.glyphs(other, 'A')).toBeGreaterThan(0)
  })

  test('chassis.subset fixes the axes of a brand, and the build says in how many fonts', async () => {
    const cwd = root({ axes: { alpha: { opsz: 14 } } }, { variable: true })
    const { out, stats } = await build(cwd, { subset: true })
    const font = fs.readFileSync(path.join(out, 'web/site/alpha/fonts/variable.woff2'))
    expect(await subsetter.axes(font)).toEqual({ wght: { min: 100, max: 900 } })
    expect(stats.fontsSubsetted).toBe(3)
    expect(stats.fontAxesFixed).toBe(1)
    expect(stats.warnings).toHaveLength(1)
    expect(stats.warnings[0]).toContain('greek.woff2')

    const whole = await build(root(undefined, { variable: true }), { subset: true })
    const other = fs.readFileSync(path.join(whole.out, 'web/site/alpha/fonts/variable.woff2'))
    expect(Object.keys(await subsetter.axes(other)).sort()).toEqual(['opsz', 'wght'])
    expect(whole.stats.fontAxesFixed).toBe(0)
    expect(font.length).toBeLessThan(other.length)
  })

  test('the axes change nothing without the option', async () => {
    const plain = await build(root(undefined, { variable: true }))
    const { out, stats } = await build(root({ axes: { alpha: { opsz: 14 } } }, { variable: true }))
    expect(compareDirs(plain.out, out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.fontAxesFixed).toBe(0)
  })

  test('warns about an axis that no font of the brand has', async () => {
    const cwd = root({ axes: { alpha: { opsz: 14, slnt: 0 } } }, { variable: true })
    const { stats } = await build(cwd, { subset: true })
    expect(stats.fontAxesFixed).toBe(1)
    expect(stats.warnings).toContain(
      'chassis.subset fixes the axis slnt for the brand alpha, and no font of its output has it'
    )
    expect(stats.warnings.some((warning) => warning.includes('the axis opsz'))).toBe(false)
  })

  test('a value outside the axis of a font fails the build, naming the file', async () => {
    const cwd = root({ axes: { alpha: { opsz: 40 } } }, { variable: true })
    const error = await build(cwd, { subset: true }).catch((error) => error)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('Failed to subset the font')
    expect(error.message).toContain(path.join('web/site/alpha/fonts/variable.woff2'))
    expect(error.message).toContain('the axis opsz of the font is 14 to 32')
  })

  test('axes that are not valid fail before the output is removed', async () => {
    const out = tempDir()
    fs.writeFileSync(path.join(out, 'kept.txt'), 'from an earlier build')
    for (const [axes, message] of /** @type {Array<[unknown, string]>} */ ([
      [{ beta: { opsz: 14 } }, '"axes" names "beta", which is not a brand. Configured: alpha'],
      [{ alpha: { opsz: 'small' } }, '"opsz" of the brand "alpha" is fixed at a number']
    ])) {
      await expect(
        generateAssets({ cwd: root({ axes }), quiet: true, subset: true, out })
      ).rejects.toThrow(message)
    }
    expect(listFiles(out)).toEqual(['kept.txt'])
    const { stats } = await build(root({ axes: { beta: { opsz: 14 } } }))
    expect(stats.errors).toEqual([])
  })

  test('chassis.subset splits the declared fonts by range, and adds to the output only', async () => {
    const cwd = root({ split: true }, { sheet: SHEET })
    const whole = await build(root(undefined, { sheet: SHEET }), { subset: true })
    const { out, stats } = await build(cwd, { subset: true })

    expect(compareDirs(whole.out, out)).toEqual({
      missing: [],
      extra: [
        'web/site/alpha/fonts/text-latin-ext.woff',
        'web/site/alpha/fonts/text-latin-ext.woff2',
        'web/site/alpha/fonts/text-latin.woff',
        'web/site/alpha/fonts/text-latin.woff2'
      ],
      changed: ['web/site/alpha/fonts/text.css']
    })
    expect(stats.fontRangeFiles).toBe(4)
    expect(whole.stats.fontRangeFiles).toBe(0)
    expect(stats.fontsSubsetted).toBe(2)

    const css = fs.readFileSync(path.join(out, 'web/site/alpha/fonts/text.css'), 'utf-8')
    expect(css).toBe(`@font-face {
  font-family: "Text";
  font-weight: 400;
  src:
    url("text-latin-ext.woff2") format("woff2"),
    url("text-latin-ext.woff") format("woff");
  unicode-range: ${NAMED_RANGES['latin-ext']};
}

@font-face {
  font-family: "Text";
  font-weight: 400;
  src:
    url("text-latin.woff2") format("woff2"),
    url("text-latin.woff") format("woff");
  unicode-range: ${NAMED_RANGES.latin};
}

@font-face {
  font-family: "Greek";
  src: url("greek.woff2") format("woff2");
}
`)
    // The icon font and the app fonts are not read
    expect(listFiles(out).filter((file) => /-(latin|latin-ext)\.woff2?$/.test(file))).toHaveLength(
      4
    )
  })

  test('the split changes nothing without the option', async () => {
    const plain = await build(root(undefined, { sheet: SHEET }))
    const { out, stats } = await build(root({ split: true }, { sheet: SHEET }))
    expect(compareDirs(plain.out, out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.fontRangeFiles).toBe(0)
  })

  test('warns about a rule that declares something else than a font of the folder', async () => {
    const sheet = `${SHEET}@font-face { font-family: "Far"; src: url("https://example.com/far.woff2"); }\n`
    const { stats } = await build(root({ split: true }, { sheet }), { subset: true })
    expect(stats.fontRangeFiles).toBe(4)
    expect(
      stats.warnings.some((warning) =>
        /^Not split by range, a rule of .*text\.css: declares https:\/\/example\.com\/far\.woff2, which is not a font of its folder$/.test(
          warning
        )
      )
    ).toBe(true)
  })

  test('the validator passes on an output with the files of the ranges', async () => {
    const cwd = root({ split: true }, { sheet: SHEET })
    const { out } = await build(cwd, { subset: true })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const ok = await new DistValidator({ cwd, out }).runValidation()
    vi.restoreAllMocks()
    expect(ok).toBe(true)
  })

  test('a second build with the split into the same output writes the same files', async () => {
    const cwd = root({ split: true }, { sheet: SHEET })
    const first = await build(cwd, { subset: true })
    const copy = tempDir()
    fs.cpSync(first.out, copy, { recursive: true })
    const stats = await generateAssets({
      cwd,
      quiet: true,
      subset: true,
      clean: false,
      out: first.out
    })
    expect(compareDirs(copy, first.out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.fontsSubsetted).toBe(2)
    expect(stats.fontRangeFiles).toBe(4)
  })

  test('the split option wins over the setting, both ways', async () => {
    const on = await build(root(undefined, { sheet: SHEET }), { subset: true, split: true })
    expect(on.stats.fontRangeFiles).toBe(4)
    const off = await build(root({ split: true }, { sheet: SHEET }), { subset: true, split: false })
    expect(off.stats.fontRangeFiles).toBe(0)
    const whole = await build(root(undefined, { sheet: SHEET }), { subset: true })
    expect(compareDirs(whole.out, off.out)).toEqual({ missing: [], extra: [], changed: [] })
    // Without a value the setting decides
    const asSet = await build(root({ split: true }, { sheet: SHEET }), {
      subset: true,
      split: null
    })
    expect(asSet.stats.fontRangeFiles).toBe(4)
  })

  test('the split option without the subset fails before the output is removed', async () => {
    const out = tempDir()
    fs.writeFileSync(path.join(out, 'kept.txt'), 'from an earlier build')
    await expect(generateAssets({ cwd: root(), quiet: true, split: true, out })).rejects.toThrow(
      '--split needs --subset'
    )
    expect(listFiles(out)).toEqual(['kept.txt'])
    // Without the split there is nothing to ask for
    const { stats } = await build(root({ split: true }, { sheet: SHEET }), { split: false })
    expect(stats.fontRangeFiles).toBe(0)
  })

  test('a split that is not true or false fails before the output is removed', async () => {
    const out = tempDir()
    fs.writeFileSync(path.join(out, 'kept.txt'), 'from an earlier build')
    await expect(
      generateAssets({ cwd: root({ split: 'latin' }), quiet: true, subset: true, out })
    ).rejects.toThrow('"split" is true or false')
    expect(listFiles(out)).toEqual(['kept.txt'])
  })

  test('ranges that are not valid fail before the output is removed', async () => {
    const out = tempDir()
    fs.writeFileSync(path.join(out, 'kept.txt'), 'from an earlier build')
    for (const [cwd, subset] of /** @type {Array<[string, boolean|string[]]>} */ ([
      [root({ ranges: ['klingon'] }), true],
      [root(), ['klingon']]
    ])) {
      await expect(generateAssets({ cwd, quiet: true, subset, out })).rejects.toThrow(
        '"klingon" is not a range'
      )
    }
    expect(listFiles(out)).toEqual(['kept.txt'])
  })

  test('a chassis.subset that is not valid is not read without the option', async () => {
    const { stats } = await build(root({ ranges: ['klingon'] }))
    expect(stats.errors).toEqual([])
  })

  test('a file that is no font fails the build, naming the file', async () => {
    const error = await build(copyFixture(), { subset: true }).catch((error) => error)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('Failed to subset the font')
    expect(error.message).toContain(path.join('web/site/alpha/fonts/text.woff2'))
  })

  test('the validator passes on the output', async () => {
    const cwd = root()
    const { out } = await build(cwd, { subset: true })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const ok = await new DistValidator({ cwd, out }).runValidation()
    vi.restoreAllMocks()
    expect(ok).toBe(true)
  })

  test('a second build into the same output writes the same files', async () => {
    const cwd = root()
    const first = await build(cwd, { subset: true })
    const copy = tempDir()
    fs.cpSync(first.out, copy, { recursive: true })
    await generateAssets({ cwd, quiet: true, subset: true, clean: false, out: first.out })
    expect(compareDirs(copy, first.out)).toEqual({ missing: [], extra: [], changed: [] })
  })

  test('a build of jobs without fonts to subset warns and writes the default output', async () => {
    const cwd = root()
    const plain = await build(cwd, { platforms: ['ios', 'android'] })
    const { out, stats } = await build(cwd, { platforms: ['ios', 'android'], subset: true })
    expect(compareDirs(plain.out, out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.warnings).toEqual([
      '--subset changes nothing: no selected job has a platform whose fonts are subsetted'
    ])
  })

  test('a dry run writes nothing', async () => {
    const out = tempDir()
    const stats = await generateAssets({
      cwd: root(),
      quiet: true,
      dryRun: true,
      subset: true,
      out
    })
    expect(listFiles(out)).toEqual([])
    expect(stats.fontsSubsetted).toBe(0)
  })
})

describe('pnpm assets --subset', () => {
  const entry = path.join(ROOT, 'build/build-assets.js')

  test('prints the counts', () => {
    const result = spawnSync(
      process.execPath,
      [entry, '--cwd', root(), '--out', tempDir(), '--subset'],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/2 fonts subsetted, \d+ KB saved\n/)
  })

  test('prints the axis it fixed, and in how many fonts', () => {
    const cwd = root({ axes: { alpha: { opsz: 14 } } }, { variable: true })
    const result = spawnSync(
      process.execPath,
      [entry, '--cwd', cwd, '--out', tempDir(), '--subset'],
      {
        encoding: 'utf-8'
      }
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Fixed the axis opsz at 14 in 1 fonts')
    expect(result.stdout).toMatch(/3 fonts subsetted, \d+ KB saved, an axis fixed in 1\n/)
  })

  test('prints the files it wrote per range, and for how many stylesheets', () => {
    const cwd = root({ split: true }, { sheet: SHEET })
    const result = spawnSync(
      process.execPath,
      [entry, '--cwd', cwd, '--out', tempDir(), '--subset', 'latin', 'greek'],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(0)
    // The Greek font has no Latin letter, and one file
    expect(result.stdout).toContain('Wrote 5 font files per range, for 1 stylesheets')
    expect(result.stdout).toMatch(/2 fonts subsetted, \d+ KB saved, 5 files per range\n/)
  })

  test('--split and --no-split decide for the run, whatever the setting', () => {
    const run = (/** @type {string} */ cwd, /** @type {string[]} */ args) =>
      spawnSync(process.execPath, [entry, '--cwd', cwd, '--out', tempDir(), ...args], {
        encoding: 'utf-8'
      })
    const plain = root(undefined, { sheet: SHEET })
    const set = root({ split: true }, { sheet: SHEET })

    const on = run(plain, ['--subset', 'latin', 'latin-ext', '--split'])
    expect(on.status).toBe(0)
    expect(on.stdout).toMatch(/2 fonts subsetted, \d+ KB saved, 4 files per range\n/)
    const off = run(set, ['--no-split', '--subset'])
    expect(off.status).toBe(0)
    expect(off.stdout).toMatch(/2 fonts subsetted, \d+ KB saved\n/)
    expect(run(set, ['--subset']).stdout).toContain('4 files per range')

    const alone = run(plain, ['--split'])
    expect(alone.status).toBe(1)
    expect(alone.stderr).toContain('--split needs --subset')
  })

  test('takes the ranges as values, before another option', async () => {
    const out = tempDir()
    const result = spawnSync(
      process.execPath,
      [entry, '--cwd', root(), '--out', out, '--subset', 'greek', 'U+0041', '--platform', 'web'],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(0)
    const font = fs.readFileSync(path.join(out, 'web/site/alpha/fonts/text.woff2'))
    expect(await subsetter.glyphs(font, 'α')).toBeGreaterThan(0)
    expect(await subsetter.glyphs(font, 'A')).toBeGreaterThan(0)
    expect(await subsetter.glyphs(font, 'B')).toBe(0)
    expect(listFiles(out).every((file) => file.startsWith('web/'))).toBe(true)
  })

  test('without the package fails before it writes, and says how to install it', () => {
    // A copy of the build outside the repository finds no package
    const copy = fs.realpathSync(tempDir())
    fs.cpSync(path.join(ROOT, 'build'), path.join(copy, 'build'), { recursive: true })
    const cwd = root()
    const out = tempDir()
    const run = (/** @type {string[]} */ args) =>
      spawnSync(
        process.execPath,
        [path.join(copy, 'build/build-assets.js'), '--cwd', cwd, '--out', out, ...args],
        { encoding: 'utf-8' }
      )

    expect(run([]).status).toBe(0)
    const before = listFiles(out)
    const result = run(['--subset'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('--subset needs the package subset-font')
    expect(result.stderr).toContain('Run `pnpm install` in the repository root')
    expect(listFiles(out)).toEqual(before)
  })
})
