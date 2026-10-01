/**
 * @file asset-catalog.test.js
 * @description The `assetCatalog` option of the build, `--asset-catalog`: the images of iOS
 *              move into an asset catalog, one image set per base name, and nothing else
 *              changes. The fixture has every case: an image with three variants and a
 *              variant no image set takes (`badge`), an image without variants, a vector
 *              beside a raster of its name in a subfolder (`logo/mark`), and a brand file
 *              over the default one. `test/native/ios/check.sh` compiles the catalogs of a
 *              real build with actool; these tests need no Xcode.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  catalogPath,
  folderContents,
  imageSetContents,
  planImageSets,
  writeCatalog
} from '../build/asset-catalog.js'
import { generateAssets } from '../build/build-assets.js'
import { androidProcessor, iosProcessor, webProcessor } from '../build/processors/index.js'
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

const INFO = { author: 'xcode', version: 1 }

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
 * A folder with files of the given names.
 * @param {string[]} files - Paths relative to the folder
 * @returns {string} The folder
 */
function folderWith(files) {
  const dir = tempDir()
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), file)
  }
  return dir
}

describe('the processors', () => {
  test('iOS writes the files of images/ to Assets.xcassets, the web and Android write none', () => {
    expect(iosProcessor.assetCatalog).toEqual({ type: 'images', name: 'Assets.xcassets' })
    expect(webProcessor.assetCatalog).toBeUndefined()
    expect(androidProcessor.assetCatalog).toBeUndefined()
  })
})

describe('planImageSets()', () => {
  test('the variants of a base name are one set, each in the slot of its indicator', () => {
    expect(planImageSets(['hero@3x.png', 'hero.png', 'hero@2x.png'])).toEqual({
      sets: [
        {
          name: 'hero',
          vector: false,
          images: [
            { file: 'hero.png', scale: '1x' },
            { file: 'hero@2x.png', scale: '2x' },
            { file: 'hero@3x.png', scale: '3x' }
          ]
        }
      ],
      left: []
    })
  })

  test('a set has the variants that exist, and the sets are in the order of their names', () => {
    const { sets, left } = planImageSets(['mark@2x.png', 'photo.jpg', 'banner.JPEG'])
    expect(sets.map((set) => [set.name, set.images])).toEqual([
      ['banner', [{ file: 'banner.JPEG', scale: '1x' }]],
      ['mark', [{ file: 'mark@2x.png', scale: '2x' }]],
      ['photo', [{ file: 'photo.jpg', scale: '1x' }]]
    ])
    expect(left).toEqual([])
  })

  test('a vector without a raster of its name is a set of one file', () => {
    expect(planImageSets(['logo.svg', 'chart.pdf']).sets).toEqual([
      { name: 'chart', vector: true, images: [{ file: 'chart.pdf' }] },
      { name: 'logo', vector: true, images: [{ file: 'logo.svg' }] }
    ])
  })

  test('the rasters take the set of a name, and the vector beside them is left', () => {
    const { sets, left } = planImageSets(['logo.svg', 'logo.png', 'logo@2x.png'])
    expect(sets).toHaveLength(1)
    expect(sets[0].vector).toBe(false)
    expect(sets[0].images.map((image) => image.file)).toEqual(['logo.png', 'logo@2x.png'])
    expect(left).toEqual(['logo.svg'])
  })

  test.each([
    ['an indicator without a slot', ['badge.png', 'badge@1.5x.png', 'badge@4x.png']],
    ['a format an image set does not take', ['badge.png', 'badge.gif', 'badge.webp']],
    ['a file without an extension', ['badge.png', 'badge']],
    ['a vector with an indicator', ['badge.png', 'badge@2x.svg']]
  ])('%s is left', (_, files) => {
    const { sets, left } = planImageSets(files)
    expect(sets.map((set) => set.images)).toEqual([[{ file: 'badge.png', scale: '1x' }]])
    expect(left).toEqual(files.slice(1).sort())
  })

  test('one file takes a slot: PNG before JPEG, no indicator before @1x, SVG before PDF', () => {
    const rasters = planImageSets(['photo.jpg', 'photo.png', 'photo@1x.png', 'photo@2x.jpg'])
    expect(rasters.sets[0].images).toEqual([
      { file: 'photo.png', scale: '1x' },
      { file: 'photo@2x.jpg', scale: '2x' }
    ])
    expect(rasters.left).toEqual(['photo.jpg', 'photo@1x.png'])

    const vectors = planImageSets(['logo.pdf', 'logo.svg'])
    expect(vectors.sets[0].images).toEqual([{ file: 'logo.svg' }])
    expect(vectors.left).toEqual(['logo.pdf'])
  })

  test('no file, no set', () => {
    expect(planImageSets([])).toEqual({ sets: [], left: [] })
  })
})

describe('imageSetContents() and folderContents()', () => {
  test('a raster set lists the three slots, an empty one without a file', () => {
    const [set] = planImageSets(['mark.png', 'mark@3x.png']).sets
    expect(JSON.parse(imageSetContents(set))).toEqual({
      images: [
        { filename: 'mark.png', idiom: 'universal', scale: '1x' },
        { idiom: 'universal', scale: '2x' },
        { filename: 'mark@3x.png', idiom: 'universal', scale: '3x' }
      ],
      info: INFO
    })
  })

  test('a vector set has one file and keeps its vector data', () => {
    const [set] = planImageSets(['logo.svg']).sets
    expect(JSON.parse(imageSetContents(set))).toEqual({
      images: [{ filename: 'logo.svg', idiom: 'universal' }],
      info: INFO,
      properties: { 'preserves-vector-representation': true }
    })
  })

  test('a folder of the catalog provides a namespace, the catalog does not', () => {
    expect(JSON.parse(folderContents(false))).toEqual({ info: INFO })
    expect(JSON.parse(folderContents(true))).toEqual({
      info: INFO,
      properties: { 'provides-namespace': true }
    })
  })

  test('the files are JSON with two spaces and a last line end', () => {
    expect(folderContents(false)).toBe(
      '{\n  "info": {\n    "author": "xcode",\n    "version": 1\n  }\n}\n'
    )
  })
})

describe('catalogPath()', () => {
  const catalog = { type: 'images', name: 'Assets.xcassets' }

  test.each([
    ['', 'hero_banner.png', 'Assets.xcassets/hero_banner.imageset/hero_banner.png'],
    ['logo', 'mark@2x.png', 'Assets.xcassets/logo/mark.imageset/mark@2x.png'],
    ['home/dark', 'chart.svg', 'Assets.xcassets/home/dark/chart.imageset/chart.svg']
  ])('%j, %s → %s', (subFolder, fileName, expected) => {
    expect(catalogPath(catalog, subFolder, fileName)).toBe(path.join(expected))
  })
})

describe('writeCatalog()', () => {
  test('moves the files into image sets and keeps the subfolders as folders', () => {
    const dir = folderWith(['hero.png', 'hero@2x.png', 'logo/mark.svg', 'logo/deep/chart.pdf'])
    const catalog = path.join(tempDir(), 'Assets.xcassets')

    expect(writeCatalog(dir, catalog)).toEqual({ sets: 3, left: [] })
    expect(listFiles(dir)).toEqual([])
    expect(listFiles(catalog)).toEqual([
      'Contents.json',
      'hero.imageset/Contents.json',
      'hero.imageset/hero.png',
      'hero.imageset/hero@2x.png',
      'logo/Contents.json',
      'logo/deep/Contents.json',
      'logo/deep/chart.imageset/Contents.json',
      'logo/deep/chart.imageset/chart.pdf',
      'logo/mark.imageset/Contents.json',
      'logo/mark.imageset/mark.svg'
    ])
    expect(read(catalog, 'hero.imageset/hero@2x.png')).toBe('hero@2x.png')
    expect(read(catalog, 'Contents.json')).toBe(folderContents(false))
    expect(read(catalog, 'logo/Contents.json')).toBe(folderContents(true))
    expect(read(catalog, 'logo/deep/Contents.json')).toBe(folderContents(true))
  })

  test('a file without a place in a set stays, and is returned by its path', () => {
    const dir = folderWith(['hero.png', 'hero@4x.png', 'logo/mark.gif'])
    const catalog = path.join(tempDir(), 'Assets.xcassets')

    const result = writeCatalog(dir, catalog)
    expect(result.sets).toBe(1)
    expect(result.left).toEqual([path.join(dir, 'hero@4x.png'), path.join(dir, 'logo/mark.gif')])
    expect(listFiles(dir)).toEqual(['hero@4x.png', 'logo/mark.gif'])
    // A folder without an image set is not a folder of the catalog
    expect(listFiles(catalog)).toEqual([
      'Contents.json',
      'hero.imageset/Contents.json',
      'hero.imageset/hero.png'
    ])
  })

  test('writes an image set of an earlier build again', () => {
    const catalog = path.join(tempDir(), 'Assets.xcassets')
    writeCatalog(folderWith(['logo.svg']), catalog)
    writeCatalog(folderWith(['logo.png']), catalog)
    expect(listFiles(catalog)).toEqual([
      'Contents.json',
      'logo.imageset/Contents.json',
      'logo.imageset/logo.png'
    ])
  })

  test('writes nothing for a folder without images, or a missing folder', () => {
    const catalog = path.join(tempDir(), 'Assets.xcassets')
    expect(writeCatalog(folderWith(['notes.txt']), catalog).sets).toBe(0)
    expect(writeCatalog(path.join(tempDir(), 'none'), catalog)).toEqual({ sets: 0, left: [] })
    expect(fs.existsSync(catalog)).toBe(false)
  })
})

describe('generateAssets() with assetCatalog', () => {
  test('moves the images of the iOS jobs into the catalog and changes nothing else', async () => {
    const plain = await build(FIXTURE)
    const catalog = await build(FIXTURE, { assetCatalog: true })

    const difference = compareDirs(plain.out, catalog.out)
    expect(difference.changed).toEqual([])
    expect(difference.missing).toEqual(
      ['alpha', 'beta'].flatMap((brand) => [
        `ios/mobile/${brand}/images/badge.png`,
        `ios/mobile/${brand}/images/badge@2x.png`,
        `ios/mobile/${brand}/images/badge@3x.png`,
        `ios/mobile/${brand}/images/hero_banner.png`,
        `ios/mobile/${brand}/images/logo/mark@2x.png`
      ])
    )
    expect(difference.extra).toEqual(
      ['alpha', 'beta'].flatMap((brand) => [
        `ios/mobile/${brand}/Assets.xcassets/Contents.json`,
        `ios/mobile/${brand}/Assets.xcassets/badge.imageset/Contents.json`,
        `ios/mobile/${brand}/Assets.xcassets/badge.imageset/badge.png`,
        `ios/mobile/${brand}/Assets.xcassets/badge.imageset/badge@2x.png`,
        `ios/mobile/${brand}/Assets.xcassets/badge.imageset/badge@3x.png`,
        `ios/mobile/${brand}/Assets.xcassets/hero_banner.imageset/Contents.json`,
        `ios/mobile/${brand}/Assets.xcassets/hero_banner.imageset/hero_banner.png`,
        `ios/mobile/${brand}/Assets.xcassets/logo/Contents.json`,
        `ios/mobile/${brand}/Assets.xcassets/logo/mark.imageset/Contents.json`,
        `ios/mobile/${brand}/Assets.xcassets/logo/mark.imageset/mark@2x.png`
      ])
    )
    // What stays in images/: a variant without a slot, and the vector beside a raster
    expect(listFiles(path.join(catalog.out, 'ios/mobile/beta/images'))).toEqual([
      'badge@1.5x.png',
      'logo/mark.svg'
    ])
  })

  test('a file of the catalog is the file of the default output, the brand file included', async () => {
    const plain = await build(FIXTURE)
    const { out } = await build(FIXTURE, { assetCatalog: true })
    for (const brand of ['alpha', 'beta']) {
      expect(read(out, `ios/mobile/${brand}/Assets.xcassets/logo/mark.imageset/mark@2x.png`)).toBe(
        read(plain.out, `ios/mobile/${brand}/images/logo/mark@2x.png`)
      )
    }
    expect(read(out, 'ios/mobile/alpha/Assets.xcassets/logo/mark.imageset/mark@2x.png')).not.toBe(
      read(out, 'ios/mobile/beta/Assets.xcassets/logo/mark.imageset/mark@2x.png')
    )
  })

  test('writes the Contents.json of a set with the slots of its files', async () => {
    const { out } = await build(FIXTURE, { assetCatalog: true })
    const contents = JSON.parse(
      read(out, 'ios/mobile/alpha/Assets.xcassets/logo/mark.imageset/Contents.json')
    )
    expect(contents.images).toEqual([
      { idiom: 'universal', scale: '1x' },
      { filename: 'mark@2x.png', idiom: 'universal', scale: '2x' },
      { idiom: 'universal', scale: '3x' }
    ])
  })

  test('counts the image sets and warns once per job about the files that stay', async () => {
    const plain = await build(FIXTURE)
    const { stats } = await build(FIXTURE, { assetCatalog: true })
    expect(plain.stats.imageSets).toBe(0)
    expect(stats.imageSets).toBe(6)
    expect(stats.filesProcessed).toBe(plain.stats.filesProcessed)
    expect(stats.jobs).toEqual(plain.stats.jobs)
    expect(stats.warnings).toHaveLength(2)
    expect(stats.warnings[0]).toContain('2 file(s) have no place in an image set')
    expect(stats.warnings[0]).toContain(path.join('ios/mobile/alpha/images'))
    expect(stats.warnings[0]).toContain(`badge@1.5x.png, ${path.join('logo/mark.svg')}`)
  })

  test('removes images/ when every image is in the catalog', async () => {
    const root = copyFixture()
    fs.rmSync(path.join(root, 'source/default/mobile/images/badge@1.5x.png'))
    fs.rmSync(path.join(root, 'source/default/mobile/images/logo/mark.svg'))

    const { out, stats } = await build(root, { assetCatalog: true })
    expect(stats.warnings).toEqual([])
    expect(fs.existsSync(path.join(out, 'ios/mobile/alpha/images'))).toBe(false)
    expect(fs.existsSync(path.join(out, 'android/mobile/alpha/images'))).toBe(true)

    vi.spyOn(console, 'log').mockImplementation(() => {})
    const ok = await new DistValidator({ cwd: root, out }).runValidation()
    vi.restoreAllMocks()
    expect(ok).toBe(true)
  })

  test('the validator passes on the output', async () => {
    const { out } = await build(FIXTURE, { assetCatalog: true })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const ok = await new DistValidator({ cwd: FIXTURE, out }).runValidation()
    vi.restoreAllMocks()
    expect(ok).toBe(true)
  })

  test('the validator misses an image that is in neither place', async () => {
    const { out } = await build(FIXTURE, { assetCatalog: true })
    fs.rmSync(path.join(out, 'ios/mobile/alpha/Assets.xcassets/badge.imageset/badge@2x.png'))
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const validator = new DistValidator({ cwd: FIXTURE, out })
    const ok = await validator.runValidation()
    vi.restoreAllMocks()
    expect(ok).toBe(false)
    expect(validator.errors).toEqual(['ios/mobile/alpha: images/badge@2x.png'])
  })

  test('a second build into the same output writes the same catalog', async () => {
    const out = tempDir()
    const options = { cwd: FIXTURE, quiet: true, assetCatalog: true, clean: false, out }
    await generateAssets(options)
    const first = listFiles(out)
    await generateAssets(options)
    expect(listFiles(out)).toEqual(first)
  })

  test('a build of jobs without a catalog warns and writes the default output', async () => {
    const plain = await build(FIXTURE, { platforms: ['web', 'android'] })
    const { out, stats } = await build(FIXTURE, {
      platforms: ['web', 'android'],
      assetCatalog: true
    })
    expect(compareDirs(plain.out, out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.warnings).toEqual([
      '--asset-catalog changes nothing: no selected job has a platform with an asset catalog'
    ])
  })

  test('a dry run writes nothing', async () => {
    const out = tempDir()
    const stats = await generateAssets({
      cwd: FIXTURE,
      quiet: true,
      dryRun: true,
      assetCatalog: true,
      out
    })
    expect(listFiles(out)).toEqual([])
    expect(stats.imageSets).toBe(0)
  })
})

describe('pnpm assets --asset-catalog', () => {
  beforeEach(() => vi.restoreAllMocks())

  test('builds the iOS images as an asset catalog and prints the count', () => {
    const out = tempDir()
    const result = spawnSync(
      process.execPath,
      [BUILD_CLI, '--cwd', FIXTURE, '--out', out, '--platform', 'ios', '--asset-catalog'],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('6 image sets written to asset catalogs')
    expect(listFiles(path.join(out, 'ios/mobile/beta/Assets.xcassets/badge.imageset'))).toEqual([
      'Contents.json',
      'badge.png',
      'badge@2x.png',
      'badge@3x.png'
    ])
  })
})
