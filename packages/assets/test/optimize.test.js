/**
 * @file optimize.test.js
 * @description The `optimize`, `webp` and `avif` options of the build, `--optimize`, `--webp`
 *              and `--avif`. The files of the fixture are lines of text, which no encoder
 *              reads, so these tests build a root of their own with real images, written
 *              with `sharp`: a PNG with two variants, a JPEG, an SVG, and a PNG that has a
 *              WebP of the designer beside it.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { generateAssets } from '../build/build-assets.js'
import {
  OPTIMIZE_DEFAULTS,
  formatName,
  loadEncoders,
  optimizeJob,
  resolveSettings
} from '../build/optimize.js'
import { androidProcessor, iosProcessor, webProcessor } from '../build/processors/index.js'
import DistValidator from '../build/validate-assets.js'
import { FIXTURE, ROOT, compareDirs, listFiles, read, removeTempDirs, tempDir } from './helpers.js'

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- An export of a design tool -->
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <g id="Layer_1">
        <path fill="#ff0000" d="M 4.000 11.000 L 16.000 11.000 L 11.000 6.000 L 20.000 12.000 Z"/>
    </g>
</svg>
`

/** The files of the images of an app, by name. Written by `beforeAll()`. */
const images = /** @type {Record<string, Buffer>} */ ({})

/**
 * A picture with an edge of transparency, as an uncompressed PNG: a compressed one is
 * smaller, whatever the encoder.
 * @param {number} width
 * @param {number} height
 */
function picture(width, height) {
  const data = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = (x * 255) / width
      data[i + 1] = (y * 255) / height
      data[i + 2] = (x ^ y) & 0xff
      data[i + 3] = x < 4 ? 0 : 255
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } })
}

beforeAll(async () => {
  images['hero.png'] = await picture(64, 48).png({ compressionLevel: 0 }).toBuffer()
  images['hero@2x.png'] = await picture(128, 96).png({ compressionLevel: 0 }).toBuffer()
  images['photo.jpg'] = await picture(64, 48).flatten().jpeg({ quality: 100 }).toBuffer()
  images['kept.png'] = await picture(32, 32).png({ compressionLevel: 0 }).toBuffer()
  images['kept.webp'] = Buffer.from('the WebP the designer exported')
  images['logo.svg'] = Buffer.from(SVG)
})

afterAll(removeTempDirs)

/**
 * A root with one brand and two apps, `site` for the web and `mobile` for iOS and Android,
 * each with the images above under `images/` and a PNG icon.
 * @param {Record<string, unknown>} [optimize] - The `chassis.optimize` block
 * @returns {string} The root
 */
function root(optimize) {
  const dir = tempDir('chassis-assets-optimize-')
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'optimize-fixture',
      chassis: {
        build: { brands: ['alpha'], apps: { site: ['web'], mobile: ['ios', 'android'] } },
        ...(optimize ? { optimize } : {})
      }
    })
  )
  for (const app of ['site', 'mobile']) {
    const folder = path.join(dir, 'source/default', app)
    fs.mkdirSync(path.join(folder, 'images/logo'), { recursive: true })
    for (const [name, content] of Object.entries(images)) {
      fs.writeFileSync(path.join(folder, 'images', name), content)
    }
    fs.writeFileSync(path.join(folder, 'images/logo/mark.png'), images['kept.png'])
  }
  fs.mkdirSync(path.join(dir, 'source/default/site/icons'))
  fs.writeFileSync(path.join(dir, 'source/default/site/icons/star.png'), images['kept.png'])
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

/**
 * The pixels of an image, with the color of a transparent pixel left out: an encoder is
 * free to change what nobody sees.
 * @param {Buffer|string} file
 */
async function pixels(file) {
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) data.fill(0, i, i + 3)
  }
  return data
}

/** @param {string} file */
const size = (file) => fs.statSync(file).size

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
  test('the web writes WebP and AVIF beside, Android WebP in place, iOS neither', () => {
    expect(webProcessor.imageFormats).toEqual({ webp: 'beside', avif: 'beside' })
    expect(androidProcessor.imageFormats).toEqual({ webp: 'replace' })
    expect(iosProcessor.imageFormats).toBeUndefined()
  })
})

describe('resolveSettings()', () => {
  test('the defaults change no visible pixel', () => {
    expect(resolveSettings()).toEqual(OPTIMIZE_DEFAULTS)
    expect(OPTIMIZE_DEFAULTS).toEqual({
      types: ['images'],
      png: { quality: null },
      jpeg: { quality: null },
      svg: { precision: null },
      webp: { quality: 80, lossless: true },
      avif: { quality: 60, lossless: false }
    })
  })

  test('a block changes the settings it names', () => {
    expect(
      resolveSettings({
        types: ['images', 'icons'],
        jpeg: { quality: 82 },
        webp: { lossless: false }
      })
    ).toEqual({
      ...OPTIMIZE_DEFAULTS,
      types: ['images', 'icons'],
      jpeg: { quality: 82 },
      webp: { quality: 80, lossless: false }
    })
  })

  test.each([
    [[], 'chassis.optimize is an object'],
    ['high', 'chassis.optimize is an object'],
    [{ gif: {} }, '"gif" is not a setting. Known: types, png, jpeg, svg, webp, avif'],
    [{ types: 'images' }, '"types" is a list of type folders'],
    [{ types: [] }, '"types" is a list of type folders'],
    [{ svg: true }, '"svg" is false, or an object with "precision"'],
    [{ svg: { precision: 9 } }, '"svg.precision" is a whole number from 0 to 8, or null'],
    [{ svg: { plugins: [] } }, '"svg.plugins" is not a setting'],
    [{ png: 80 }, '"png" is an object with "quality"'],
    [{ png: { quality: 0 } }, '"png.quality" is a whole number from 1 to 100, or null'],
    [{ jpeg: { quality: 80.5 } }, '"jpeg.quality" is a whole number from 1 to 100, or null'],
    [{ jpeg: { lossless: true } }, '"jpeg.lossless" is not a setting'],
    [{ webp: { quality: null } }, '"webp.quality" is a whole number from 1 to 100'],
    [{ avif: { lossless: 1 } }, '"avif.lossless" is true or false']
  ])('%j → %s', (block, message) => {
    expect(() => resolveSettings(block)).toThrow(message)
  })

  test('"svg": false turns the minifier off, a precision sets it', () => {
    expect(resolveSettings({ svg: false }).svg).toBe(false)
    expect(resolveSettings({ svg: { precision: 2 } }).svg).toEqual({ precision: 2 })
    expect(resolveSettings({ svg: {} }).svg).toEqual({ precision: null })
  })

  test('names every problem of a block', () => {
    expect(() => resolveSettings({ svg: 1, gif: {} })).toThrow(
      /chassis\.optimize is not valid:\n {2}- "gif" is not a setting.*\n {2}- "svg" is false, or an object/
    )
  })
})

describe('formatName()', () => {
  test.each([
    ['hero.png', 'webp', 'hero.webp'],
    ['hero@2x.PNG', 'webp', 'hero@2x.webp'],
    ['photo.jpeg', 'avif', 'photo.avif'],
    ['logo.svg', 'webp', null],
    ['anim.gif', 'webp', null],
    ['photo.webp', 'avif', null]
  ])('%s as %s → %s', (fileName, format, expected) => {
    expect(formatName(fileName, format)).toBe(expected)
  })
})

describe('loadEncoders()', () => {
  test('a PNG is smaller and has the same pixels', async () => {
    const { optimize } = await loadEncoders(OPTIMIZE_DEFAULTS, { optimize: true })
    const result = /** @type {Buffer} */ (await optimize(images['hero.png'], '.png'))
    expect(result.length).toBeLessThan(images['hero.png'].length)
    expect((await pixels(result)).equals(await pixels(images['hero.png']))).toBe(true)
    expect((await sharp(result).metadata()).isPalette).toBeFalsy()
  })

  test('a PNG with a quality gets a palette', async () => {
    const settings = resolveSettings({ png: { quality: 60 } })
    const { optimize } = await loadEncoders(settings, { optimize: true })
    const result = /** @type {Buffer} */ (await optimize(images['hero.png'], '.png'))
    expect((await sharp(result).metadata()).isPalette).toBe(true)
  })

  test('a JPEG is left as it is without a quality, and encoded again with one', async () => {
    const plain = await loadEncoders(OPTIMIZE_DEFAULTS, { optimize: true })
    expect(await plain.optimize(images['photo.jpg'], '.jpg')).toBeNull()

    const lossy = await loadEncoders(resolveSettings({ jpeg: { quality: 60 } }), { optimize: true })
    const result = /** @type {Buffer} */ (await lossy.optimize(images['photo.jpg'], '.jpg'))
    expect(result.length).toBeLessThan(images['photo.jpg'].length)
    expect((await sharp(result).metadata()).format).toBe('jpeg')
  })

  test('an SVG is minified, and keeps its viewBox', async () => {
    const { optimize } = await loadEncoders(OPTIMIZE_DEFAULTS, { optimize: true })
    const result = /** @type {Buffer} */ (await optimize(images['logo.svg'], '.svg')).toString()
    expect(result.length).toBeLessThan(SVG.length)
    expect(result).toContain('viewBox="0 0 24 24"')
    expect(result).not.toContain('<!--')
  })

  test('an SVG keeps its ids: a page refers to a symbol of a sprite by its id', async () => {
    const { optimize } = await loadEncoders(OPTIMIZE_DEFAULTS, { optimize: true })
    const sprite = `<svg xmlns="http://www.w3.org/2000/svg">
    <symbol id="arrow-right" viewBox="0 0 24 24"><path d="M 4.000 11.000 L 16.000 11.000 Z"/></symbol>
</svg>
`
    const result = /** @type {Buffer} */ (await optimize(Buffer.from(sprite), '.svg')).toString()
    expect(result).toContain('<symbol id="arrow-right"')
  })

  test('an SVG keeps its shapes, and is drawn as before', async () => {
    const { optimize } = await loadEncoders(OPTIMIZE_DEFAULTS, { optimize: true })
    const result = /** @type {Buffer} */ (await optimize(images['logo.svg'], '.svg'))
    expect(result.toString()).toContain(
      'd="M 4.000 11.000 L 16.000 11.000 L 11.000 6.000 L 20.000 12.000 Z"'
    )
    expect((await pixels(result)).equals(await pixels(images['logo.svg']))).toBe(true)
  })

  test('an SVG with a precision gets its paths rewritten, and is smaller still', async () => {
    const plain = await loadEncoders(OPTIMIZE_DEFAULTS, { optimize: true })
    const rounded = await loadEncoders(resolveSettings({ svg: { precision: 2 } }), {
      optimize: true
    })
    const kept = /** @type {Buffer} */ (await plain.optimize(images['logo.svg'], '.svg'))
    const result = /** @type {Buffer} */ (await rounded.optimize(images['logo.svg'], '.svg'))
    expect(result.toString()).toContain('d="M4 11h12l-5-5 9 6Z"')
    expect(result.length).toBeLessThan(kept.length)
  })

  test('an SVG is left as it is with "svg": false, and any other format always', async () => {
    const { optimize } = await loadEncoders(resolveSettings({ svg: false }), { optimize: true })
    expect(await optimize(images['logo.svg'], '.svg')).toBeNull()
    expect(await optimize(images['kept.webp'], '.webp')).toBeNull()
    expect(await optimize(Buffer.from('GIF89a'), '.gif')).toBeNull()
  })

  test('a WebP of a PNG has the same pixels, a WebP of a JPEG is encoded with a quality', async () => {
    const { convert } = await loadEncoders(OPTIMIZE_DEFAULTS, { formats: ['webp'] })
    const fromPng = await convert(images['hero.png'], '.png', 'webp')
    expect((await sharp(fromPng).metadata()).format).toBe('webp')
    expect((await pixels(fromPng)).equals(await pixels(images['hero.png']))).toBe(true)

    const fromJpeg = await convert(images['photo.jpg'], '.jpg', 'webp')
    expect((await sharp(fromJpeg).metadata()).format).toBe('webp')
    expect(fromJpeg.length).toBeLessThan(images['photo.jpg'].length)
  })

  test('a WebP of a PNG without "lossless" is smaller and not the same pixels', async () => {
    const lossless = await loadEncoders(OPTIMIZE_DEFAULTS, { formats: ['webp'] })
    const lossy = await loadEncoders(resolveSettings({ webp: { lossless: false, quality: 40 } }), {
      formats: ['webp']
    })
    const exact = await lossless.convert(images['hero@2x.png'], '.png', 'webp')
    const result = await lossy.convert(images['hero@2x.png'], '.png', 'webp')
    expect(result.length).toBeLessThan(exact.length)
    expect((await pixels(result)).equals(await pixels(images['hero@2x.png']))).toBe(false)
  })

  test('an AVIF is an AVIF', async () => {
    const { convert } = await loadEncoders(OPTIMIZE_DEFAULTS, { formats: ['avif'] })
    const result = await convert(images['hero.png'], '.png', 'avif')
    expect((await sharp(result).metadata()).format).toBe('heif')
  })

  test('one content is encoded once', async () => {
    const { convert } = await loadEncoders(OPTIMIZE_DEFAULTS, { formats: ['webp'] })
    const first = await convert(images['hero.png'], '.png', 'webp')
    expect(await convert(Buffer.from(images['hero.png']), '.png', 'webp')).toBe(first)
  })
})

describe('optimizeJob()', () => {
  const settings = OPTIMIZE_DEFAULTS

  /**
   * Encoders that write a text: `optimize` half of the file, `convert` a text of a length.
   * @param {number} converted - The length of a converted file
   * @returns {import('../build/optimize.js').Encoders}
   */
  const encoders = (converted) => ({
    optimize: async (buffer, ext) =>
      ext === '.png' ? buffer.subarray(0, Math.ceil(buffer.length / 2)) : null,
    convert: async () => Buffer.alloc(converted, 'w')
  })

  /** @param {Record<string, string>} files */
  const jobWith = (files) => {
    const dir = tempDir()
    for (const [file, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      fs.writeFileSync(path.join(dir, file), content)
    }
    return dir
  }

  test('writes a file again when the result is smaller, and counts what that saves', async () => {
    const dir = jobWith({
      'images/a.png': '12345678',
      'images/sub/b.png': '1234',
      'images/c.jpg': '12'
    })
    const result = await optimizeJob(dir, { settings, encoders: encoders(1), optimize: true })
    expect(result).toEqual({ optimized: 2, saved: 6, generated: 0, failed: [] })
    expect(read(dir, 'images/a.png')).toBe('1234')
    expect(read(dir, 'images/c.jpg')).toBe('12')
  })

  test('keeps a file that the encoder does not make smaller', async () => {
    const dir = jobWith({ 'images/a.png': '1' })
    const result = await optimizeJob(dir, { settings, encoders: encoders(1), optimize: true })
    expect(result.optimized).toBe(0)
    expect(read(dir, 'images/a.png')).toBe('1')
  })

  test('reads the type folders of the settings only', async () => {
    const dir = jobWith({ 'icons/a.png': '12345678', 'data/b.png': '12345678' })
    expect(
      (await optimizeJob(dir, { settings, encoders: encoders(1), optimize: true })).optimized
    ).toBe(0)

    const withIcons = { ...settings, types: ['images', 'icons'] }
    const result = await optimizeJob(dir, {
      settings: withIcons,
      encoders: encoders(1),
      optimize: true
    })
    expect(result.optimized).toBe(1)
    expect(read(dir, 'data/b.png')).toBe('12345678')
  })

  test('beside: writes the format next to the file, whatever its size', async () => {
    const dir = jobWith({ 'images/a.png': '12', 'images/b@2x.jpg': '12', 'images/c.svg': '<svg/>' })
    const result = await optimizeJob(dir, {
      settings,
      encoders: encoders(9),
      formats: { webp: 'beside', avif: 'beside' }
    })
    expect(result.generated).toBe(4)
    expect(listFiles(dir)).toEqual([
      'images/a.avif',
      'images/a.png',
      'images/a.webp',
      'images/b@2x.avif',
      'images/b@2x.jpg',
      'images/b@2x.webp',
      'images/c.svg'
    ])
    expect(read(dir, 'images/a.png')).toBe('12')
  })

  test('replace: writes the format in place of the file when it is smaller', async () => {
    const dir = jobWith({ 'images/small.png': '12', 'images/large.png': '123456789' })
    const result = await optimizeJob(dir, {
      settings,
      encoders: encoders(4),
      formats: { webp: 'replace' }
    })
    expect(result.generated).toBe(1)
    expect(listFiles(dir)).toEqual(['images/large.webp', 'images/small.png'])
  })

  test('replace: compares with the optimized file', async () => {
    const dir = jobWith({ 'images/a.png': '1234567' })
    const result = await optimizeJob(dir, {
      settings,
      encoders: encoders(4),
      optimize: true,
      formats: { webp: 'replace' }
    })
    expect(result).toEqual({ optimized: 1, saved: 3, generated: 0, failed: [] })
    expect(listFiles(dir)).toEqual(['images/a.png'])
  })

  test('a file of the source under the name of a format is kept', async () => {
    const dir = jobWith({ 'images/a.png': '123456789', 'images/a.webp': 'designer' })
    const result = await optimizeJob(dir, {
      settings,
      encoders: encoders(4),
      formats: { webp: 'replace' }
    })
    expect(result.generated).toBe(0)
    expect(read(dir, 'images/a.webp')).toBe('designer')
    expect(read(dir, 'images/a.png')).toBe('123456789')
  })

  test('a file of an earlier build under the name of a format is written again', async () => {
    const dir = jobWith({
      'images/a.png': '123456789',
      'images/a.webp': 'stale',
      'images/b.png': '1',
      'images/b.webp': 'stale'
    })
    await optimizeJob(dir, {
      settings,
      encoders: encoders(4),
      formats: { webp: 'replace' },
      fromSource: () => false
    })
    expect(listFiles(dir)).toEqual(['images/a.webp', 'images/b.png'])
    expect(read(dir, 'images/a.webp')).toBe('wwww')
  })

  test('a PNG and a JPEG of one name: the PNG gets the name of the format', async () => {
    const dir = jobWith({ 'images/a.jpg': 'jpeg', 'images/a.png': 'png' })
    const written = []
    await optimizeJob(dir, {
      settings,
      encoders: {
        ...encoders(1),
        convert: async (buffer) => (written.push(buffer.toString()), buffer)
      },
      formats: { webp: 'beside' }
    })
    expect(written).toEqual(['png'])
    expect(read(dir, 'images/a.webp')).toBe('png')
  })

  test('reports a file the encoder cannot read, and goes on', async () => {
    const dir = jobWith({ 'images/a.png': 'bad', 'images/b.png': '12345678' })
    const result = await optimizeJob(dir, {
      settings,
      encoders: {
        ...encoders(1),
        optimize: async (buffer) => {
          if (buffer.toString() === 'bad') throw new Error('not an image')
          return buffer.subarray(0, 1)
        }
      },
      optimize: true
    })
    expect(result.optimized).toBe(1)
    expect(result.failed).toEqual([
      { file: path.join(dir, 'images/a.png'), message: 'not an image' }
    ])
  })
})

describe('generateAssets() with optimize', () => {
  test('writes the PNG and SVG images again, smaller, and changes nothing else', async () => {
    const cwd = root()
    const plain = await build(cwd)
    const { out, stats } = await build(cwd, { optimize: true })

    const difference = compareDirs(plain.out, out)
    expect(difference.missing).toEqual([])
    expect(difference.extra).toEqual([])
    expect(difference.changed).toEqual(
      [
        'android/mobile/alpha/images/',
        'ios/mobile/alpha/images/',
        'web/site/alpha/images/'
      ].flatMap((folder) =>
        folder.startsWith('android')
          ? [
              `${folder}drawable-xhdpi/hero.png`,
              `${folder}drawable/hero.png`,
              `${folder}drawable/kept.png`,
              `${folder}drawable/logo.svg`,
              `${folder}logo/drawable/mark.png`
            ]
          : [
              `${folder}hero.png`,
              `${folder}hero@2x.png`,
              `${folder}kept.png`,
              `${folder}logo.svg`,
              `${folder}logo/mark.png`
            ]
      )
    )
    for (const file of difference.changed) {
      expect(size(path.join(out, file))).toBeLessThan(size(path.join(plain.out, file)))
    }
    expect(stats.filesOptimized).toBe(15)
    expect(stats.bytesSaved).toBe(
      difference.changed.reduce(
        (sum, file) => sum + size(path.join(plain.out, file)) - size(path.join(out, file)),
        0
      )
    )
    expect(stats.filesProcessed).toBe(plain.stats.filesProcessed)
  })

  test('an optimized PNG has the pixels of the source', async () => {
    const { out } = await build(root(), { optimize: true })
    const file = path.join(out, 'web/site/alpha/images/hero@2x.png')
    expect((await pixels(file)).equals(await pixels(images['hero@2x.png']))).toBe(true)
  })

  test('chassis.optimize sets the quality of a JPEG and the type folders', async () => {
    const cwd = root({ jpeg: { quality: 60 }, types: ['images', 'icons'] })
    const plain = await build(cwd)
    const { out } = await build(cwd, { optimize: true, platforms: ['web'] })
    for (const file of ['web/site/alpha/images/photo.jpg', 'web/site/alpha/icons/star.png']) {
      expect(size(path.join(out, file))).toBeLessThan(size(path.join(plain.out, file)))
    }
  })

  test('a chassis.optimize that is not valid fails before the output is removed', async () => {
    const cwd = root({ jpeg: { quality: 'high' } })
    const { out } = await build(cwd)
    const before = listFiles(out)
    await expect(generateAssets({ cwd, quiet: true, optimize: true, out })).rejects.toThrow(
      'chassis.optimize is not valid'
    )
    expect(listFiles(out)).toEqual(before)
    // The default build does not read the block
    await expect(generateAssets({ cwd, quiet: true, out })).resolves.toBeDefined()
  })

  test('a file that is no image fails the build, naming the file', async () => {
    const error = await build(FIXTURE, { optimize: true, platforms: ['web'] }).catch(
      (error) => error
    )
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('Failed to read the image')
    expect(error.message).toContain(path.join('web/site/alpha/images/hero-banner.png'))
  })

  test('a dry run writes nothing', async () => {
    const out = tempDir()
    const stats = await generateAssets({
      cwd: root(),
      quiet: true,
      dryRun: true,
      optimize: true,
      webp: true,
      out
    })
    expect(listFiles(out)).toEqual([])
    expect(stats.filesOptimized).toBe(0)
    expect(stats.filesGenerated).toBe(0)
  })
})

describe('generateAssets() with webp and avif', () => {
  test('the web gets a WebP beside each PNG and JPEG, and keeps the one of the designer', async () => {
    const cwd = root()
    const plain = await build(cwd, { platforms: ['web'] })
    const { out, stats } = await build(cwd, { webp: true, platforms: ['web'] })

    expect(compareDirs(plain.out, out)).toEqual({
      missing: [],
      extra: [
        'web/site/alpha/images/hero.webp',
        'web/site/alpha/images/hero@2x.webp',
        'web/site/alpha/images/logo/mark.webp',
        'web/site/alpha/images/photo.webp'
      ],
      changed: []
    })
    expect(stats.filesGenerated).toBe(4)
    expect(read(out, 'web/site/alpha/images/kept.webp')).toBe('the WebP the designer exported')
    const webp = path.join(out, 'web/site/alpha/images/hero.webp')
    expect((await pixels(webp)).equals(await pixels(images['hero.png']))).toBe(true)
  })

  test('the web gets an AVIF too, the apps do not', async () => {
    const { out, stats } = await build(root(), { avif: true })
    expect(listFiles(out).filter((file) => file.endsWith('.avif'))).toEqual([
      'web/site/alpha/images/hero.avif',
      'web/site/alpha/images/hero@2x.avif',
      'web/site/alpha/images/kept.avif',
      'web/site/alpha/images/logo/mark.avif',
      'web/site/alpha/images/photo.avif'
    ])
    expect(stats.filesGenerated).toBe(5)
    expect(stats.warnings).toEqual([])
  })

  test('Android gets the WebP in place of the image, iOS stays as it is', async () => {
    const cwd = root()
    const plain = await build(cwd)
    const { out } = await build(cwd, { webp: true })

    expect(compareDirs(path.join(plain.out, 'ios'), path.join(out, 'ios'))).toEqual({
      missing: [],
      extra: [],
      changed: []
    })
    expect(listFiles(path.join(out, 'android/mobile/alpha/images'))).toEqual([
      'drawable-xhdpi/hero.webp',
      'drawable/hero.webp',
      'drawable/kept.png',
      'drawable/kept.webp',
      'drawable/logo.svg',
      'drawable/photo.webp',
      'logo/drawable/mark.webp'
    ])
    expect(await validates(cwd, out)).toEqual({ ok: true, errors: [] })
  })

  test('the validator misses an image that is there in no format', async () => {
    const cwd = root()
    const { out } = await build(cwd, { webp: true })
    fs.rmSync(path.join(out, 'android/mobile/alpha/images/drawable/hero.webp'))
    const { ok, errors } = await validates(cwd, out)
    expect(ok).toBe(false)
    expect(errors).toEqual(['android/mobile/alpha: images/drawable/hero.png'])
  })

  test('with res, the WebP files are in res/', async () => {
    const cwd = root()
    const { out } = await build(cwd, { webp: true, res: true })
    expect(listFiles(path.join(out, 'android/mobile/alpha/res'))).toEqual([
      'drawable-xhdpi/hero.webp',
      'drawable/hero.webp',
      'drawable/kept.png',
      'drawable/mark.webp',
      'drawable/photo.webp'
    ])
    expect(await validates(cwd, out)).toEqual({ ok: true, errors: [] })
  })

  test('with optimize, the three options work on the source image', async () => {
    const cwd = root()
    const { out, stats } = await build(cwd, {
      optimize: true,
      webp: true,
      avif: true,
      platforms: ['web']
    })
    expect(stats.filesOptimized).toBe(5)
    expect(stats.filesGenerated).toBe(9)
    const webp = path.join(out, 'web/site/alpha/images/hero@2x.webp')
    expect((await pixels(webp)).equals(await pixels(images['hero@2x.png']))).toBe(true)
  })

  test('a second build into the same output writes the same files', async () => {
    const out = tempDir()
    const options = { cwd: root(), quiet: true, webp: true, clean: false, out }
    await generateAssets(options)
    const first = listFiles(out)
    await generateAssets(options)
    expect(listFiles(out)).toEqual(first)
  })

  test('a build of jobs that take no format warns and writes the default output', async () => {
    const cwd = root()
    const plain = await build(cwd, { platforms: ['ios'] })
    const { out, stats } = await build(cwd, { platforms: ['ios'], webp: true, avif: true })
    expect(compareDirs(plain.out, out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.warnings).toEqual([
      '--webp changes nothing: no selected job has a platform that takes the format',
      '--avif changes nothing: no selected job has a platform that takes the format'
    ])
  })
})

describe('pnpm assets --optimize, --webp and --avif', () => {
  test('prints the counts', () => {
    const out = tempDir()
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'build/build-assets.js'),
        '--cwd',
        root(),
        '--out',
        out,
        '--optimize',
        '--webp',
        '--platform',
        'web'
      ],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toMatch(/5 files optimized, \d+ KB saved/)
    expect(result.stdout).toContain('4 files written in webp')
  })

  test.each([
    [['--optimize'], '--optimize needs the package sharp'],
    [['--webp', '--avif'], '--webp, --avif needs the package sharp']
  ])(
    '%j without the packages fails before it writes, and says how to install them',
    (flags, message) => {
      // A copy of the build outside the repository finds no package
      const copy = fs.realpathSync(tempDir())
      fs.cpSync(path.join(ROOT, 'build'), path.join(copy, 'build'), { recursive: true })
      const out = tempDir()
      const run = (/** @type {string[]} */ args) =>
        spawnSync(
          process.execPath,
          [path.join(copy, 'build/build-assets.js'), '--cwd', root(), '--out', out, ...args],
          {
            encoding: 'utf-8'
          }
        )

      expect(run([]).status).toBe(0)
      const before = listFiles(out)
      const result = run(flags)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain(message)
      expect(result.stderr).toContain('Run `pnpm install` in the repository root')
      expect(listFiles(out)).toEqual(before)
    }
  )
})
