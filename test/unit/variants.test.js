/**
 * @file variants.test.js
 * @description Tests for the variants of an image: their names, their sizes, and the
 *              step that makes each.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { BuildError } from '../../build/errors.js'
import { parseFileName } from '../../build/names.js'
import { imageFiles, isLeftOut, variantName, variantsOf } from '../../build/rules/variants.js'

/** @import { Asset, ImageRule, Job } from '../../build/types.js' */

/**
 * An image of the docs app.
 * @param {string[]} files - The files below `images/`, each with its size:
 *   `home/lego@2x.png 200x100`.
 * @param {ImageRule} [rule]
 * @returns {Asset}
 */
function image(files, rule) {
  const sources = files.map((entry) => {
    const [path, size] = entry.split(' ')
    const [width, height] = (size ?? '').split('x').map(Number)
    const folders = path.split('/')
    const file = folders.pop()
    return {
      path: `source/default/docs/images/${path}`,
      layer: 'source/default/docs',
      type: /** @type {const} */ ('images'),
      folder: folders.join('/'),
      ...parseFileName(file),
      bytes: 1,
      ...(size ? { width, height } : {})
    }
  })
  const [{ folder, name }] = sources
  const id = ['images', folder, name].filter(Boolean).join('/')
  return { type: 'images', id, folder, name, files: sources, ...(rule ? { rule } : {}) }
}

describe('variantName', () => {
  test.each([
    [{ density: 1, format: 'png' }, 'comp-gallery-light.png'],
    [{ density: 2, format: 'png' }, 'comp-gallery-light@2x.png'],
    [{ density: 1.5, format: 'webp' }, 'comp-gallery-light@1.5x.webp'],
    [{ size: 'small', density: 1, format: 'webp' }, 'comp-gallery-light-small.webp'],
    [{ size: 'small', density: 2, format: 'webp' }, 'comp-gallery-light-small@2x.webp'],
    [{ density: 3, format: 'jpeg' }, 'comp-gallery-light@3x.jpg'],
    [{ density: 1, format: 'avif' }, 'comp-gallery-light.avif']
  ])('%o', (variant, name) => {
    expect(variantName('comp-gallery-light', variant)).toBe(name)
  })
})

describe('variantsOf', () => {
  test('gives the sizes of the contract: rounded half up', () => {
    const gallery = image(['home/comp-gallery-light@2x.png 2480x2175'], {
      densities: [1, 2],
      sizes: { small: 480 },
      formats: ['png', 'webp']
    })
    const variants = variantsOf(gallery).map(({ name, width, height }) => [name, width, height])
    expect(variants).toEqual([
      ['comp-gallery-light.png', 1240, 1088],
      ['comp-gallery-light@2x.png', 2480, 2175],
      ['comp-gallery-light-small.png', 480, 421],
      ['comp-gallery-light-small@2x.png', 960, 842],
      ['comp-gallery-light.webp', 1240, 1088],
      ['comp-gallery-light@2x.webp', 2480, 2175],
      ['comp-gallery-light-small.webp', 480, 421],
      ['comp-gallery-light-small@2x.webp', 960, 842]
    ])
  })

  test('says which variant is the master itself', () => {
    const lego = image(['home/lego@2x.png 200x100'], {
      densities: [1, 2],
      formats: ['png', 'webp']
    })
    expect(variantsOf(lego).filter((variant) => variant.master)).toEqual([
      {
        name: 'lego@2x.png',
        density: 2,
        format: 'png',
        width: 200,
        height: 100,
        master: true
      }
    ])
  })

  test('takes the density and the format of the master without a key for them', () => {
    const webp = image(['hero@3x.png 300x150'], { formats: ['webp'] })
    expect(variantsOf(webp).map((variant) => variant.name)).toEqual(['hero@3x.webp'])

    const small = image(['hero@3x.jpg 300x150'], { sizes: { small: 50 } })
    expect(variantsOf(small).map(({ name, width }) => [name, width])).toEqual([
      ['hero@3x.jpg', 300],
      ['hero-small@3x.jpg', 150]
    ])
  })

  test('takes the size of an SVG master as its size at 1x, and renders it at any density', () => {
    const logo = image(['logo/brand.svg 120x40'], { densities: [1, 2, 3], formats: ['svg', 'png'] })
    expect(
      variantsOf(logo).map(({ name, width, height, master }) => [name, width, height, master])
    ).toEqual([
      ['brand.svg', 120, 40, true],
      ['brand.png', 120, 40, false],
      ['brand@2x.png', 240, 80, false],
      ['brand@3x.png', 360, 120, false]
    ])
  })

  test('writes the densities 1.5 and 4', () => {
    const hero = image(['hero@4x.png 401x203'], { densities: [1, 1.5, 4] })
    expect(variantsOf(hero).map(({ name, width, height }) => [name, width, height])).toEqual([
      ['hero.png', 100, 51],
      ['hero@1.5x.png', 150, 76],
      ['hero@4x.png', 401, 203]
    ])
  })

  test.each([
    [
      'a density above the one of the master',
      image(['hero@2x.png 200x100'], { densities: [1, 2, 3] }),
      'source/default/docs/images/hero@2x.png: the density 3 is 300 pixels wide, and the master ' +
        'is 200 at 2x. The build never scales up',
      'no-scaling-up'
    ],
    [
      'a size wider than the master',
      image(['hero@2x.png 200x100'], { sizes: { small: 120 }, densities: [1, 2] }),
      'the size "small" at 2x is 240 pixels wide, and the master is 200 at 2x',
      'no-scaling-up'
    ],
    [
      'an image with two files',
      image(['hero.png 100x50', 'hero@2x.png 200x100'], { densities: [1, 2] }),
      'images/hero: has 2 files, and its rule derives the variants from one master',
      'one-master'
    ],
    [
      'a raster master with a rule for svg',
      image(['hero@2x.png 200x100'], { formats: ['svg', 'png'] }),
      'is not an SVG file, and its rule asks for "svg"',
      'manifest'
    ],
    [
      'a GIF master',
      image(['hero.gif 200x100'], { formats: ['webp'] }),
      'is not a file that the build derives variants from',
      'manifest'
    ],
    [
      'a master without a size',
      image(['sprite.svg'], { formats: ['png'] }),
      'does not say its size, which the variants are computed from',
      'real-files'
    ]
  ])('fails on %s', (_, asset, message, rule) => {
    expect(() => variantsOf(asset)).toThrow(BuildError)
    expect(() => variantsOf(asset)).toThrow(message)
    expect(() => variantsOf(asset)).toThrowError(expect.objectContaining({ rule }))
  })
})

describe('imageFiles', () => {
  test('copies an image without a rule as it is', () => {
    expect(imageFiles(image(['home/alert-window@2x.png 200x100']))).toEqual([
      {
        path: 'images/home/alert-window@2x.png',
        type: 'images',
        source: 'source/default/docs/images/home/alert-window@2x.png',
        width: 200,
        height: 100,
        density: 2
      }
    ])
    expect(imageFiles(image(['sprite.svg']))).toEqual([
      { path: 'images/sprite.svg', type: 'images', source: 'source/default/docs/images/sprite.svg' }
    ])
  })

  test('copies every file of an image whose rule says committed', () => {
    const shot = image(
      ['figma/alert/dark/window.png 100x50', 'figma/alert/dark/window@2x.png 200x100'],
      {
        committed: true
      }
    )
    expect(imageFiles(shot).map((file) => [file.path, file.step])).toEqual([
      ['images/figma/alert/dark/window.png', undefined],
      ['images/figma/alert/dark/window@2x.png', undefined]
    ])
  })

  test('copies the files of an image whose rule derives nothing', () => {
    const hero = image(['hero.png 100x50', 'hero@2x.png 200x100'], { budget: 1000 })
    expect(imageFiles(hero)).toHaveLength(2)
  })

  test('copies the master, and plans a step for every other variant', () => {
    const lego = image(['home/lego@2x.png 200x100'], {
      densities: [1, 2],
      formats: ['png', 'webp'],
      quality: { webp: 70 }
    })
    const source = 'source/default/docs/images/home/lego@2x.png'
    expect(imageFiles(lego)).toEqual([
      {
        path: 'images/home/lego.png',
        type: 'images',
        source,
        step: { name: 'raster', params: { width: 100, height: 50, format: 'png' } },
        width: 100,
        height: 50,
        density: 1
      },
      {
        path: 'images/home/lego@2x.png',
        type: 'images',
        source,
        width: 200,
        height: 100,
        density: 2
      },
      {
        path: 'images/home/lego.webp',
        type: 'images',
        source,
        step: { name: 'raster', params: { width: 100, height: 50, format: 'webp', quality: 70 } },
        width: 100,
        height: 50,
        density: 1
      },
      {
        path: 'images/home/lego@2x.webp',
        type: 'images',
        source,
        step: { name: 'raster', params: { width: 200, height: 100, format: 'webp', quality: 70 } },
        width: 200,
        height: 100,
        density: 2
      }
    ])
  })

  test('gives a format the quality of the contract without one in the rule', () => {
    const hero = image(['hero@2x.png 200x100'], { formats: ['jpeg', 'webp', 'avif'] })
    expect(imageFiles(hero).map((file) => file.step.params.quality)).toEqual([82, 80, 50])
  })
})

describe('isLeftOut', () => {
  const job = /** @type {Job} */ ({ platform: 'ios' })

  test('says whether the rule of an image leaves the platform out', () => {
    expect(isLeftOut(image(['hero.png 1x1'], { platforms: ['web'] }), job)).toBe(true)
    expect(isLeftOut(image(['hero.png 1x1'], { platforms: ['web', 'ios'] }), job)).toBe(false)
    expect(isLeftOut(image(['hero.png 1x1'], { budget: 1 }), job)).toBe(false)
    expect(isLeftOut(image(['hero.png 1x1']), job)).toBe(false)
  })
})
