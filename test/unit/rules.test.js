/**
 * @file rules.test.js
 * @description Tests for the rules of the platforms. Until sessions 2.2 and 2.5 of the
 *              roadmap, they give the names and the folders of 0.1.8.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { parseFileName } from '../../build/names.js'
import { planJobs } from '../../build/plan.js'
import { rules } from '../../build/rules/index.js'
import { legacyCase, legacyParts } from '../../build/rules/legacy.js'

/** @import { Asset, AssetType, Platform } from '../../build/types.js' */

const config = { brands: ['chassis'], apps: { demo: ['web', 'ios', 'android'] }, options: {} }

/**
 * An asset of the demo app, from the paths of its files below the app.
 * @param {...string} paths - `images/logo/brand@2x.png`
 * @returns {Asset}
 */
function asset(...paths) {
  const files = paths.map((path) => {
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
  })
  const [{ type, folder, name }] = files
  return { type, id: [type, folder, name].filter(Boolean).join('/'), folder, name, files }
}

/**
 * The paths that a platform writes for an asset.
 * @param {Platform} platform
 * @param {Asset} asset
 * @returns {string[]}
 */
function paths(platform, asset) {
  const [job] = planJobs(config, { platforms: [platform] })
  if (!rules[platform].include(asset, job)) return []
  return rules[platform].files(asset, job).map((file) => file.path)
}

describe('legacy names', () => {
  test.each([
    ['Alert Window@2x.png', { base: 'Alert Window', resolution: '@2x', extension: '.png' }],
    ['card-top@2x-1.png', { base: 'card-top@2x-1', resolution: '', extension: '.png' }],
    ['default.tokens.json', { base: 'default.tokens', resolution: '', extension: '.json' }],
    ['LICENSE', { base: 'LICENSE', resolution: '', extension: '' }]
  ])('takes %s apart as 0.1.8 did', (file, parts) => {
    expect(legacyParts(file)).toEqual(parts)
  })

  test.each([
    ['Alert Window', 'alert-window', 'alert_window'],
    ['Meta 1@2x-3', 'meta-1-2x-3', 'meta_1_2x_3'],
    ['default.tokens', 'default-tokens', 'default_tokens'],
    ['myIcon_name', 'my-icon-name', 'my_icon_name'],
    ['chassis-logo--brand', 'chassis-logo-brand', 'chassis_logo_brand']
  ])('writes %s with one separator', (base, kebab, snake) => {
    expect(legacyCase(base, '-')).toBe(kebab)
    expect(legacyCase(base, '_')).toBe(snake)
  })
})

describe('web', () => {
  test('keeps the folders, and writes the names in lowercase with hyphens', () => {
    expect(paths('web', asset('images/figma/alert/Alert Window@2x.png'))).toEqual([
      'images/figma/alert/alert-window@2x.png'
    ])
    expect(paths('web', asset('images/card/card-top@2x-1.png'))).toEqual([
      'images/card/card-top-2x-1.png'
    ])
    expect(paths('web', asset('other/default.tokens.json'))).toEqual(['other/default-tokens.json'])
  })

  test('takes every file of an image, with its size', () => {
    const [job] = planJobs(config, { platforms: ['web'] })
    const image = asset('images/home/lego.png', 'images/home/lego@2x.png', 'images/home/lego.webp')
    expect(rules.web.files(image, job)).toEqual([
      {
        path: 'images/home/lego.png',
        type: 'images',
        source: 'source/default/demo/images/home/lego.png',
        width: 20,
        height: 10,
        density: 1
      },
      {
        path: 'images/home/lego@2x.png',
        type: 'images',
        source: 'source/default/demo/images/home/lego@2x.png',
        width: 20,
        height: 10,
        density: 2
      },
      {
        path: 'images/home/lego.webp',
        type: 'images',
        source: 'source/default/demo/images/home/lego.webp',
        width: 20,
        height: 10,
        density: 1
      }
    ])
  })

  test('takes the web fonts and the stylesheets of fonts/', () => {
    const font = asset('fonts/text-strong.otf', 'fonts/text-strong.woff2')
    expect(paths('web', font)).toEqual(['fonts/text-strong.woff2'])
    expect(paths('web', asset('fonts/text.css'))).toEqual(['fonts/text.css'])
    expect(paths('web', asset('fonts/text-strong.ttf'))).toEqual([])
  })

  test('takes every file of icons/', () => {
    expect(paths('web', asset('icons/icons/chassis-icons.woff2'))).toEqual([
      'icons/icons/chassis-icons.woff2'
    ])
  })

  test('writes no file of its own', () => {
    const [job] = planJobs(config, { platforms: ['web'] })
    expect(rules.web.extras([asset('images/a.png')], job)).toEqual([])
  })
})

describe('ios', () => {
  test('writes the names in lowercase with underscores, and keeps the indicator', () => {
    expect(paths('ios', asset('images/logo/chassis-logo@2x.png'))).toEqual([
      'images/logo/chassis_logo@2x.png'
    ])
    expect(paths('ios', asset('icons/svgs/arrow-right.svg'))).toEqual([
      'icons/svgs/arrow_right.svg'
    ])
  })

  test('takes OTF and TTF fonts, SVG and PDF icons, and no WebP image', () => {
    const font = asset('fonts/text-strong.otf', 'fonts/text-strong.woff2')
    expect(paths('ios', font)).toEqual(['fonts/text_strong.otf'])
    expect(paths('ios', asset('icons/icons/chassis-icons.css'))).toEqual([])
    expect(paths('ios', asset('icons/arrow.pdf'))).toEqual(['icons/arrow.pdf'])
    expect(paths('ios', asset('images/lego.png', 'images/lego.webp'))).toEqual(['images/lego.png'])
    expect(paths('ios', asset('other/notes.json'))).toEqual([])
  })
})

describe('android', () => {
  test('writes an image into the folder of its density, below its own folder', () => {
    const logo = asset(
      'images/logo/chassis-logo.png',
      'images/logo/chassis-logo@1x.png',
      'images/logo/chassis-logo@1.5x.png',
      'images/logo/chassis-logo@2x.png',
      'images/logo/chassis-logo@3x.png',
      'images/logo/chassis-logo@4x.png',
      'images/logo/chassis-logo.svg'
    )
    expect(paths('android', logo)).toEqual([
      'images/logo/drawable/chassis_logo.png',
      'images/logo/drawable-mdpi/chassis_logo.png',
      'images/logo/drawable-hdpi/chassis_logo.png',
      'images/logo/drawable-xhdpi/chassis_logo.png',
      'images/logo/drawable-xxhdpi/chassis_logo.png',
      'images/logo/drawable-xxxhdpi/chassis_logo.png',
      'images/logo/drawable/chassis_logo.svg'
    ])
    expect(paths('android', asset('images/hero@5x.png'))).toEqual(['images/drawable-mdpi/hero.png'])
  })

  test('gives an icon its prefix, in icons/ and one folder below', () => {
    expect(paths('android', asset('icons/arrow-right.svg'))).toEqual(['icons/ic_arrow_right.svg'])
    expect(paths('android', asset('icons/svgs/arrow-right.svg'))).toEqual([
      'icons/svgs/ic_arrow_right.svg'
    ])
    expect(paths('android', asset('icons/svgs/ic-arrow.svg'))).toEqual(['icons/svgs/ic_arrow.svg'])
    expect(paths('android', asset('icons/svgs/solid/arrow.svg'))).toEqual([
      'icons/svgs/solid/arrow.svg'
    ])
  })

  test('takes OTF and TTF fonts, SVG icons, and no WebP image', () => {
    expect(paths('android', asset('fonts/code-normal.ttf'))).toEqual(['fonts/code_normal.ttf'])
    expect(paths('android', asset('fonts/code-normal.woff2'))).toEqual([])
    expect(paths('android', asset('icons/arrow.pdf'))).toEqual([])
    expect(paths('android', asset('images/lego.webp'))).toEqual([])
    expect(paths('android', asset('other/notes.json'))).toEqual([])
  })
})
