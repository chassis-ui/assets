/**
 * @file subset-fonts.test.js
 * @description The `subset` option of the build, `--subset`. The fonts of the fixture are
 *              lines of text, which no subsetter reads, so these tests build a root of their
 *              own with a real font, the one of the package `inter-ui`: it has Latin, Greek
 *              and Cyrillic letters, and layout features that put an arrow in the place of
 *              `->`. A font without a Latin letter is made of it in `beforeAll()`.
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
  glyphCount,
  loadSubsetter,
  resolveSubset,
  subsetJob
} from '../build/subset-fonts.js'
import DistValidator from '../build/validate-assets.js'
import { ROOT, compareDirs, copyFixture, listFiles, removeTempDirs, tempDir } from './helpers.js'

vi.setConfig({ testTimeout: 30_000 })

const FONT = path.join(
  path.dirname(createRequire(import.meta.url).resolve('inter-ui/package.json')),
  'web/Inter-Regular.woff2'
)

/**
 * The fonts of the tests, by name. The package has the WOFF2 file; the same font as WOFF
 * and as TTF, and `greek.woff2`, are written by `beforeAll()`.
 */
const fonts = /** @type {Record<string, Buffer>} */ ({ 'text.woff2': fs.readFileSync(FONT) })

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
  subsetter = await loadSubsetter()
})

afterAll(removeTempDirs)

/**
 * A root with one brand and two apps, `site` for the web and `mobile` for iOS and Android.
 * The fonts of `site` are a WOFF2 and a WOFF with their stylesheet and their license, and a
 * WOFF2 without a Latin letter; `site` has the WOFF2 as an icon font too, and `mobile` has
 * the TTF.
 * @param {Record<string, unknown>} [subset] - The `chassis.subset` block
 * @returns {string} The root
 */
function root(subset) {
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
  fs.writeFileSync(path.join(site, 'fonts/text.css'), '@font-face { font-family: "Text"; }\n')
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

/** The first four bytes of a font file, which name its format. */
const signature = (/** @type {Buffer} */ font) => font.toString('latin1', 0, 4)

describe('the processors', () => {
  test('the web subsets its WOFF and WOFF2 fonts, the apps keep theirs', () => {
    expect(webProcessor.subset).toEqual({ type: 'fonts', formats: ['.woff', '.woff2'] })
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
      /chassis\.subset is not valid:\n {2}- "range" is not a setting\. Known: ranges\n {2}- "ranges" is a list/
    )
    expect(() => resolveSubset({ ranges: [] })).toThrow('"ranges" is a list')
    expect(() => resolveSubset({ ranges: ['latin', 'klingon'] })).toThrow(
      'chassis.subset is not valid:\n  - "klingon" is not a range. Known: latin, latin-ext, cyrillic'
    )
  })

  test('names a value of the option that is no range', () => {
    expect(() => resolveSubset(undefined, ['U+00FF-0041'])).toThrow(
      '--subset is not valid:\n  - "U+00FF-0041" is not a range'
    )
    expect(() => resolveSubset(undefined, ['U+110000'])).toThrow('"U+110000" is not a range')
    expect(() => resolveSubset({ ranges: ['greek'] }, ['0041'])).toThrow('"0041" is not a range')
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
    expect(result).toEqual({ subsetted: 0, saved: 0, kept: [], failed: [] })
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
    expect(result.stdout).toMatch(/2 fonts subsetted, \d+ KB saved/)
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
