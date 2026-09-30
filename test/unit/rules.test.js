/**
 * @file rules.test.js
 * @description Tests for the rules of the platforms. The web keeps the paths and the
 *              names of the source. Until session 2.5 of the roadmap, iOS and Android
 *              give the names and the folders of 0.1.8.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { parseFileName } from '../../build/names.js'
import { planJobs } from '../../build/plan.js'
import { rules } from '../../build/rules/index.js'
import { legacyCase, legacyParts } from '../../build/rules/legacy.js'

/** @import { Asset, AssetType, ImageRule, Platform } from '../../build/types.js' */

const config = { brands: ['chassis'], apps: { demo: ['web', 'ios', 'android'] }, options: {} }

/**
 * A source file of the demo app, from its path below the app.
 * @param {string} path - `images/logo/brand@2x.png`
 */
function source(path) {
  const [type, ...rest] = path.split('/')
  const file = rest.pop()
  return {
    path: `source/default/demo/${path}`,
    layer: 'source/default/demo',
    type: /** @type {AssetType} */ (type),
    folder: rest.join('/'),
    ...parseFileName(file),
    bytes: 1,
    ...(type === 'images' ? { width: 20, height: 10 } : {})
  }
}

/**
 * An asset of the demo app, from the paths of its files below the app.
 * @param {string[]} paths
 * @param {ImageRule} [rule]
 * @returns {Asset}
 */
function asset(paths, rule) {
  const files = paths.map(source)
  const [{ type, folder, name }] = files
  const id = [type, folder, name].filter(Boolean).join('/')
  return { type, id, folder, name, files, ...(rule ? { rule } : {}) }
}

/** A font family of the demo app, with two faces and its license. */
const family = {
  type: /** @type {const} */ ('fonts'),
  id: 'fonts/text',
  folder: '',
  name: 'text',
  files: ['fonts/text-normal.otf', 'fonts/text-strong-italic.otf', 'fonts/licenses/inter.txt'].map(
    source
  ),
  family: {
    id: 'text',
    family: 'Inter',
    license: 'licenses/inter.txt',
    faces: [
      { file: 'text-normal.otf', weight: 400, style: /** @type {const} */ ('normal') },
      { file: 'text-strong-italic.otf', weight: 600, style: /** @type {const} */ ('italic') }
    ],
    manifest: 'source/default/demo/fonts/fonts.json'
  }
}

/**
 * The paths that a platform writes for assets, with those that come from all of them.
 * @param {Platform} platform
 * @param {...Asset} assets
 * @returns {string[]}
 */
function paths(platform, ...assets) {
  const [job] = planJobs(config, { platforms: [platform] })
  const taken = assets.filter((asset) => rules[platform].include(asset, job))
  return [
    ...taken.flatMap((asset) => rules[platform].files(asset, job)),
    ...rules[platform].extras(taken, job)
  ].map((file) => file.path)
}

describe('web', () => {
  test('keeps the folders and the names of the source', () => {
    expect(paths('web', asset(['images/figma/alert/dark/alert-window@2x.png']))).toEqual([
      'images/figma/alert/dark/alert-window@2x.png'
    ])
    expect(paths('web', asset(['icons/cx-sprite.svg']))).toEqual(['icons/cx-sprite.svg'])
    expect(paths('web', asset(['other/notes/read-me.json']))).toEqual(['other/notes/read-me.json'])
  })

  test('does not rename a file whose name breaks the rules: the lint reports it', () => {
    expect(paths('web', asset(['images/Alert Window.png']))).toEqual(['images/Alert Window.png'])
  })

  test('writes the variants of an image next to each other', () => {
    const lego = asset(['images/home/lego@2x.png'], { densities: [1, 2], formats: ['png', 'webp'] })
    expect(paths('web', lego)).toEqual([
      'images/home/lego.png',
      'images/home/lego@2x.png',
      'images/home/lego.webp',
      'images/home/lego@2x.webp'
    ])
  })

  test('leaves out an image that its rule gives to other platforms', () => {
    expect(paths('web', asset(['images/hero.png'], { platforms: ['ios', 'android'] }))).toEqual([])
    expect(paths('web', asset(['images/hero.png'], { platforms: ['web'] }))).toEqual([
      'images/hero.png'
    ])
  })

  test('takes no font until the build writes the WOFF2 files', () => {
    expect(paths('web', family)).toEqual([])
  })
})

describe('legacy names', () => {
  test.each([
    ['chassis-logo@2x.png', { base: 'chassis-logo', resolution: '@2x', extension: '.png' }],
    ['card-top@2x-1.png', { base: 'card-top@2x-1', resolution: '', extension: '.png' }],
    ['LICENSE', { base: 'LICENSE', resolution: '', extension: '' }]
  ])('takes %s apart as 0.1.8 did', (file, parts) => {
    expect(legacyParts(file)).toEqual(parts)
  })

  test.each([
    ['chassis-logo--brand', 'chassis_logo_brand'],
    ['myIcon name', 'my_icon_name'],
    ['default.tokens', 'default_tokens']
  ])('writes %s with underscores', (base, snake) => {
    expect(legacyCase(base)).toBe(snake)
  })
})

describe('ios', () => {
  test('writes the names in lowercase with underscores, and keeps the indicator', () => {
    expect(paths('ios', asset(['images/logo/chassis-logo@2x.png']))).toEqual([
      'images/logo/chassis_logo@2x.png'
    ])
    expect(paths('ios', asset(['icons/svgs/arrow-right.svg']))).toEqual([
      'icons/svgs/arrow_right.svg'
    ])
  })

  test('takes SVG and PDF icons, no WebP image, and no file of other/', () => {
    expect(paths('ios', asset(['icons/icons/chassis-icons.css']))).toEqual([])
    expect(paths('ios', asset(['icons/arrow.pdf']))).toEqual(['icons/arrow.pdf'])
    expect(paths('ios', asset(['images/lego.png', 'images/lego.webp']))).toEqual([
      'images/lego.png'
    ])
    expect(paths('ios', asset(['other/notes.json']))).toEqual([])
  })

  test('takes the faces of a family, and writes its license into licenses/', () => {
    expect(paths('ios', family)).toEqual([
      'fonts/text_normal.otf',
      'fonts/text_strong_italic.otf',
      'licenses/inter.txt'
    ])
  })

  test('writes a license once that two families have', () => {
    const display = { ...family, id: 'fonts/display', name: 'display' }
    expect(paths('ios', family, display).filter((path) => path.startsWith('licenses/'))).toEqual([
      'licenses/inter.txt'
    ])
  })

  test('leaves out an image that its rule gives to other platforms', () => {
    expect(paths('ios', asset(['images/hero.png'], { platforms: ['web'] }))).toEqual([])
  })
})

describe('android', () => {
  test('writes an image into the folder of its density, below its own folder', () => {
    const logo = asset([
      'images/logo/chassis-logo.png',
      'images/logo/chassis-logo@1x.png',
      'images/logo/chassis-logo@1.5x.png',
      'images/logo/chassis-logo@2x.png',
      'images/logo/chassis-logo@3x.png',
      'images/logo/chassis-logo@4x.png',
      'images/logo/chassis-logo.svg'
    ])
    expect(paths('android', logo)).toEqual([
      'images/logo/drawable/chassis_logo.png',
      'images/logo/drawable-mdpi/chassis_logo.png',
      'images/logo/drawable-hdpi/chassis_logo.png',
      'images/logo/drawable-xhdpi/chassis_logo.png',
      'images/logo/drawable-xxhdpi/chassis_logo.png',
      'images/logo/drawable-xxxhdpi/chassis_logo.png',
      'images/logo/drawable/chassis_logo.svg'
    ])
    expect(paths('android', asset(['images/hero@5x.png']))).toEqual([
      'images/drawable-mdpi/hero.png'
    ])
  })

  test('gives an icon its prefix, in icons/ and one folder below', () => {
    expect(paths('android', asset(['icons/arrow-right.svg']))).toEqual(['icons/ic_arrow_right.svg'])
    expect(paths('android', asset(['icons/svgs/arrow-right.svg']))).toEqual([
      'icons/svgs/ic_arrow_right.svg'
    ])
    expect(paths('android', asset(['icons/svgs/ic-arrow.svg']))).toEqual([
      'icons/svgs/ic_arrow.svg'
    ])
    expect(paths('android', asset(['icons/svgs/solid/arrow.svg']))).toEqual([
      'icons/svgs/solid/arrow.svg'
    ])
  })

  test('takes SVG icons, no WebP image, and no file of other/', () => {
    expect(paths('android', asset(['icons/arrow.pdf']))).toEqual([])
    expect(paths('android', asset(['images/lego.webp']))).toEqual([])
    expect(paths('android', asset(['other/notes.json']))).toEqual([])
  })

  test('takes the faces of a family, and writes its license into licenses/', () => {
    expect(paths('android', family)).toEqual([
      'fonts/text_normal.otf',
      'fonts/text_strong_italic.otf',
      'licenses/inter.txt'
    ])
  })
})
