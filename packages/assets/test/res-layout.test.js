/**
 * @file res-layout.test.js
 * @description The `res` option of the build, `--res`: the fonts, the images and the icons
 *              of Android move into a `res/` folder, and nothing else changes. The fixture
 *              has the cases: a font in two formats, which are one resource (`text`), a
 *              license, images in four density folders and in a subfolder, a WebP, an SVG
 *              image and SVG icons, which `res/` does not take. The icons are in `res/` only
 *              after `--vector-drawables`, so one test writes real SVG icons into a copy.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { generateAssets } from '../build/build-assets.js'
import { androidProcessor, iosProcessor, webProcessor } from '../build/processors/index.js'
import { isResourceName, planResources, resourcePath, writeRes } from '../build/res-layout.js'
import DistValidator from '../build/validate-assets.js'
import {
  BUILD_CLI,
  FIXTURE,
  compareDirs,
  copyFixture,
  listFiles,
  read,
  removeTempDirs,
  tempDir
} from './helpers.js'

const res = /** @type {import('../build/types.js').ResLayout} */ (androidProcessor.res)

const ARROW = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M4 11H16L11 6L12.5 4.5L20 12L12.5 19.5L11 18L16 13H4Z"/>
</svg>
`

afterAll(removeTempDirs)

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

/**
 * Plan with paths written with forward slashes.
 * @param {string[]} files
 */
function plan(files) {
  const { moves, left } = planResources(
    files.map((file) => path.join(file)),
    res
  )
  const posix = (file) => file.split(path.sep).join('/')
  return { moves: moves.map(({ from, to }) => [posix(from), posix(to)]), left: left.map(posix) }
}

/**
 * Whether the validator passes on an output.
 * @param {string} cwd
 * @param {string} out
 */
async function validates(cwd, out) {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const validator = new DistValidator({ cwd, out })
  const ok = await validator.runValidation()
  vi.restoreAllMocks()
  return { ok, errors: validator.errors }
}

describe('the processors', () => {
  test('Android names the folders and the formats of res/, the web and iOS have none', () => {
    expect(androidProcessor.res).toEqual({
      name: 'res',
      font: { type: 'fonts', folder: 'font', formats: ['.ttf', '.otf'] },
      drawable: {
        types: ['images', 'icons'],
        folder: 'drawable',
        formats: ['.png', '.webp', '.jpg', '.jpeg', '.gif', '.xml']
      }
    })
    expect(webProcessor.res).toBeUndefined()
    expect(iosProcessor.res).toBeUndefined()
  })
})

describe('isResourceName()', () => {
  test.each([
    ['ic_arrow_right', true],
    ['logo2', true],
    ['favicon_16x16', true],
    ['404', false],
    ['_hidden', false],
    ['Logo', false],
    ['my-logo', false],
    ['mark.9', false],
    ['default', false],
    ['new', false],
    ['', false]
  ])('%j → %s', (base, expected) => {
    expect(isResourceName(base)).toBe(expected)
  })
})

describe('planResources()', () => {
  test('a font goes to res/font/, and its license stays', () => {
    expect(
      plan(['fonts/text_normal.otf', 'fonts/code_normal.ttf', 'fonts/text_license.txt'])
    ).toEqual({
      moves: [
        ['fonts/code_normal.ttf', 'res/font/code_normal.ttf'],
        ['fonts/text_normal.otf', 'res/font/text_normal.otf']
      ],
      left: ['fonts/text_license.txt']
    })
  })

  test('a font in two formats is one resource: TTF before OTF', () => {
    expect(plan(['fonts/text.otf', 'fonts/text.ttf'])).toEqual({
      moves: [['fonts/text.ttf', 'res/font/text.ttf']],
      left: ['fonts/text.otf']
    })
  })

  test('an image goes to its density folder, without the subfolder it had', () => {
    expect(
      plan([
        'images/drawable/hero.png',
        'images/drawable-xhdpi/hero.png',
        'images/logo/drawable/mark.png',
        'images/logo/drawable-xxhdpi/mark.png'
      ]).moves
    ).toEqual([
      ['images/drawable-xhdpi/hero.png', 'res/drawable-xhdpi/hero.png'],
      ['images/drawable/hero.png', 'res/drawable/hero.png'],
      ['images/logo/drawable-xxhdpi/mark.png', 'res/drawable-xxhdpi/mark.png'],
      ['images/logo/drawable/mark.png', 'res/drawable/mark.png']
    ])
  })

  test('an icon goes to res/drawable/ when it is a vector drawable, and stays as SVG', () => {
    expect(
      plan(['icons/svgs/ic_check.xml', 'icons/ic_arrow.xml', 'icons/icons/ic_font.svg'])
    ).toEqual({
      moves: [
        ['icons/ic_arrow.xml', 'res/drawable/ic_arrow.xml'],
        ['icons/svgs/ic_check.xml', 'res/drawable/ic_check.xml']
      ],
      left: ['icons/icons/ic_font.svg']
    })
  })

  test('an SVG image stays, and the raster of its name moves', () => {
    expect(plan(['images/logo/drawable/mark.svg', 'images/logo/drawable/mark.png'])).toEqual({
      moves: [['images/logo/drawable/mark.png', 'res/drawable/mark.png']],
      left: ['images/logo/drawable/mark.svg']
    })
  })

  test('one name in two folders: the folder nearest to the type folder gets the resource', () => {
    expect(
      plan([
        'images/logo/drawable/mark.png',
        'images/logo/drawable-xhdpi/mark.png',
        'images/drawable/mark.png',
        'images/home/drawable-xxhdpi/mark.png'
      ])
    ).toEqual({
      moves: [['images/drawable/mark.png', 'res/drawable/mark.png']],
      left: [
        'images/home/drawable-xxhdpi/mark.png',
        'images/logo/drawable-xhdpi/mark.png',
        'images/logo/drawable/mark.png'
      ]
    })
  })

  test('one name in two formats in one folder: PNG before WebP', () => {
    expect(plan(['images/drawable/photo.webp', 'images/drawable/photo.png'])).toEqual({
      moves: [['images/drawable/photo.png', 'res/drawable/photo.png']],
      left: ['images/drawable/photo.webp']
    })
  })

  test('an image and an icon of one name are one drawable: the first folder by name gets it', () => {
    expect(plan(['images/drawable/ic_star.png', 'icons/ic_star.xml'])).toEqual({
      moves: [['icons/ic_star.xml', 'res/drawable/ic_star.xml']],
      left: ['images/drawable/ic_star.png']
    })
  })

  test('a font and a drawable of one name are two resources', () => {
    expect(plan(['fonts/text.ttf', 'images/drawable/text.png']).left).toEqual([])
  })

  test('a name that cannot be a resource stays', () => {
    expect(
      plan(['images/drawable/404.png', 'images/drawable/default.png', 'fonts/new.ttf'])
    ).toEqual({
      moves: [],
      left: ['fonts/new.ttf', 'images/drawable/404.png', 'images/drawable/default.png']
    })
  })

  test('a file of another folder is not part of the plan', () => {
    expect(plan(['data/brand_tokens.json', 'res/drawable/old.png'])).toEqual({
      moves: [],
      left: []
    })
  })
})

describe('resourcePath()', () => {
  test.each([
    ['fonts', 'text_normal.otf', undefined, 'res/font/text_normal.otf'],
    ['images', 'mark.png', 'drawable-xhdpi', 'res/drawable-xhdpi/mark.png'],
    ['images', 'mark.png', undefined, 'res/drawable/mark.png'],
    ['icons', 'ic_arrow.xml', undefined, 'res/drawable/ic_arrow.xml']
  ])('%s, %s, %s → %s', (type, fileName, folder, expected) => {
    expect(resourcePath(res, type, fileName, folder)).toBe(path.join(expected))
  })

  test('null for a type res/ does not take', () => {
    expect(resourcePath(res, 'data', 'brand_tokens.json')).toBeNull()
  })
})

describe('writeRes()', () => {
  /** @param {string[]} files */
  const jobWith = (files) => {
    const dir = tempDir()
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      fs.writeFileSync(path.join(dir, file), file)
    }
    return dir
  }

  test('moves the files and returns the ones that stay', () => {
    const dir = jobWith([
      'fonts/text.ttf',
      'fonts/text_license.txt',
      'images/logo/drawable-xhdpi/mark.png',
      'icons/ic_arrow.svg',
      'data/notes.json'
    ])
    const result = writeRes(dir, res)
    expect(result.moved).toBe(2)
    expect(result.left).toEqual([
      path.join('fonts/text_license.txt'),
      path.join('icons/ic_arrow.svg')
    ])
    expect(listFiles(dir)).toEqual([
      'data/notes.json',
      'fonts/text_license.txt',
      'icons/ic_arrow.svg',
      'res/drawable-xhdpi/mark.png',
      'res/font/text.ttf'
    ])
    expect(read(dir, 'res/drawable-xhdpi/mark.png')).toBe('images/logo/drawable-xhdpi/mark.png')
  })

  test('writes res/ anew: a file of an earlier build is gone', () => {
    const dir = jobWith(['res/drawable/old.png', 'images/drawable/hero.png'])
    writeRes(dir, res)
    expect(listFiles(dir)).toEqual(['res/drawable/hero.png'])
  })
})

describe('generateAssets() with res', () => {
  test('moves the files of the Android jobs into res/ and changes nothing else', async () => {
    const plain = await build(FIXTURE)
    const moved = await build(FIXTURE, { res: true })

    const difference = compareDirs(plain.out, moved.out)
    expect(difference.changed).toEqual([])
    expect(difference.missing).toEqual([
      'android/mobile/alpha/fonts/display.ttf',
      'android/mobile/alpha/fonts/text.ttf',
      'android/mobile/alpha/images/drawable-hdpi/badge.png',
      'android/mobile/alpha/images/drawable-xhdpi/badge.png',
      'android/mobile/alpha/images/drawable-xxhdpi/badge.png',
      'android/mobile/alpha/images/drawable/badge.png',
      'android/mobile/alpha/images/drawable/hero_banner.png',
      'android/mobile/alpha/images/drawable/photo.webp',
      'android/mobile/alpha/images/logo/drawable-xhdpi/mark.png',
      'android/mobile/beta/fonts/text.ttf',
      'android/mobile/beta/images/drawable-hdpi/badge.png',
      'android/mobile/beta/images/drawable-xhdpi/badge.png',
      'android/mobile/beta/images/drawable-xxhdpi/badge.png',
      'android/mobile/beta/images/drawable/badge.png',
      'android/mobile/beta/images/drawable/hero_banner.png',
      'android/mobile/beta/images/drawable/photo.webp',
      'android/mobile/beta/images/logo/drawable-xhdpi/mark.png'
    ])
    expect(listFiles(path.join(moved.out, 'android/mobile/alpha'))).toEqual([
      'data/brand_tokens.json',
      'fonts/text.otf',
      'fonts/text_license.txt',
      'icons/ic_arrow_right.svg',
      'icons/ic_close.svg',
      'icons/svgs/ic_check_mark.svg',
      'images/logo/drawable/mark.svg',
      'res/drawable-hdpi/badge.png',
      'res/drawable-xhdpi/badge.png',
      'res/drawable-xhdpi/mark.png',
      'res/drawable-xxhdpi/badge.png',
      'res/drawable/badge.png',
      'res/drawable/hero_banner.png',
      'res/drawable/photo.webp',
      'res/font/display.ttf',
      'res/font/text.ttf'
    ])
  })

  test('a file of res/ is the file of the default output, the brand file included', async () => {
    const plain = await build(FIXTURE)
    const { out } = await build(FIXTURE, { res: true })
    for (const brand of ['alpha', 'beta']) {
      expect(read(out, `android/mobile/${brand}/res/drawable-xhdpi/mark.png`)).toBe(
        read(plain.out, `android/mobile/${brand}/images/logo/drawable-xhdpi/mark.png`)
      )
    }
    expect(read(out, 'android/mobile/alpha/res/drawable-xhdpi/mark.png')).not.toBe(
      read(out, 'android/mobile/beta/res/drawable-xhdpi/mark.png')
    )
  })

  test('counts the files and warns once per job about the files that stay', async () => {
    const plain = await build(FIXTURE)
    const { stats } = await build(FIXTURE, { res: true })
    expect(plain.stats.resourceFiles).toBe(0)
    expect(stats.resourceFiles).toBe(17)
    expect(stats.filesProcessed).toBe(plain.stats.filesProcessed)
    expect(stats.jobs).toEqual(plain.stats.jobs)
    expect(stats.warnings).toHaveLength(2)
    expect(stats.warnings[0]).toContain('6 file(s) have no place in res/')
    expect(stats.warnings[0]).toContain(path.join('android/mobile/alpha'))
    expect(stats.warnings[0]).toContain(path.join('fonts/text.otf'))
  })

  test('with vectorDrawables, the icons are in res/drawable/', async () => {
    const root = copyFixture()
    const icons = path.join(root, 'source/default/mobile/icons')
    for (const file of ['arrow-right.svg', 'ic_close.svg', 'svgs/check_mark.svg']) {
      fs.writeFileSync(path.join(icons, file), ARROW)
    }

    const { out, stats } = await build(root, { res: true, vectorDrawables: true })
    expect(stats.filesConverted).toBe(6)
    expect(listFiles(path.join(out, 'android/mobile/beta/res/drawable'))).toEqual([
      'badge.png',
      'hero_banner.png',
      'ic_arrow_right.xml',
      'ic_check_mark.xml',
      'ic_close.xml',
      'photo.webp'
    ])
    expect(fs.existsSync(path.join(out, 'android/mobile/beta/icons'))).toBe(false)
    expect(await validates(root, out)).toEqual({ ok: true, errors: [] })
  })

  test('the validator passes on the output', async () => {
    const { out } = await build(FIXTURE, { res: true })
    expect(await validates(FIXTURE, out)).toEqual({ ok: true, errors: [] })
  })

  test('the validator misses a file that is in neither place', async () => {
    const { out } = await build(FIXTURE, { res: true })
    fs.rmSync(path.join(out, 'android/mobile/alpha/res/drawable-xhdpi/badge.png'))
    fs.rmSync(path.join(out, 'android/mobile/alpha/res/font/display.ttf'))
    const { ok, errors } = await validates(FIXTURE, out)
    expect(ok).toBe(false)
    expect(errors.sort()).toEqual([
      'android/mobile/alpha: fonts/display.ttf',
      'android/mobile/alpha: images/drawable-xhdpi/badge.png'
    ])
  })

  test('a second build into the same output writes the same files', async () => {
    const out = tempDir()
    const options = { cwd: FIXTURE, quiet: true, res: true, clean: false, out }
    await generateAssets(options)
    const first = listFiles(out)
    await generateAssets(options)
    expect(listFiles(out)).toEqual(first)
  })

  test('with assetCatalog, each platform gets its layout', async () => {
    const { out, stats } = await build(FIXTURE, { res: true, assetCatalog: true })
    expect(stats.resourceFiles).toBe(17)
    expect(stats.imageSets).toBe(6)
    expect(fs.existsSync(path.join(out, 'ios/mobile/alpha/Assets.xcassets'))).toBe(true)
    expect(fs.existsSync(path.join(out, 'ios/mobile/alpha/res'))).toBe(false)
    expect(fs.existsSync(path.join(out, 'android/mobile/alpha/Assets.xcassets'))).toBe(false)
  })

  test('a build of jobs without res/ warns and writes the default output', async () => {
    const plain = await build(FIXTURE, { platforms: ['web', 'ios'] })
    const { out, stats } = await build(FIXTURE, { platforms: ['web', 'ios'], res: true })
    expect(compareDirs(plain.out, out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.warnings).toEqual([
      '--res changes nothing: no selected job has a platform with a res/ folder'
    ])
  })

  test('a dry run writes nothing', async () => {
    const out = tempDir()
    const stats = await generateAssets({ cwd: FIXTURE, quiet: true, dryRun: true, res: true, out })
    expect(listFiles(out)).toEqual([])
    expect(stats.resourceFiles).toBe(0)
  })
})

describe('pnpm assets --res', () => {
  beforeEach(() => vi.restoreAllMocks())

  test('builds the Android jobs with a res/ folder and prints the count', () => {
    const out = tempDir()
    const result = spawnSync(
      process.execPath,
      [BUILD_CLI, '--cwd', FIXTURE, '--out', out, '--platform', 'android', '--res'],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('17 files moved to res/ folders')
    expect(listFiles(path.join(out, 'android/mobile/beta/res/font'))).toEqual(['text.ttf'])
  })
})
