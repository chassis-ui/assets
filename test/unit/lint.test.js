/**
 * @file lint.test.js
 * @description Tests for the rules of the source lint, on trees in memory. Every rule is
 *              tested with a tree that breaks it and with one that does not.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { readSource } from '../../build/inventory.js'
import { lintSource } from '../../build/lint.js'
import { LFS_POINTER, memoryReader } from './helpers/tree.js'

const config = {
  brands: ['chassis', 'example'],
  apps: { docs: ['web'], demo: ['ios', 'android'] },
  options: {}
}

const image = (width, height, content) => ({ width, height, ...(content ? { content } : {}) })

/** A source that follows the contract. */
const clean = {
  'source/default/shared/images/logo/chassis-logo-brand.svg': image(120, 40),
  'source/default/docs/images/images.json': {
    version: 1,
    rules: [
      { match: 'home/*', densities: [1, 2] },
      { match: 'home/comp-gallery-*', sizes: { small: 48 }, formats: ['png', 'webp'] },
      { match: 'figma/**', committed: true }
    ]
  },
  'source/default/docs/images/favicon-16x16.png': image(16, 16),
  'source/default/docs/images/home/comp-gallery-light@2x.png': image(200, 100),
  'source/default/docs/images/home/tokens-scheme.svg': image(200, 100),
  'source/default/docs/images/figma/components/alert/light/alert-window.png': image(10, 10, 'a'),
  'source/default/docs/images/figma/components/alert/light/alert-window@2x.png': image(20, 20),
  'source/default/docs/images/figma/components/alert/light/alert-size.png': image(10, 10, 'a'),
  'source/default/docs/icons/cx-sprite.svg': '<svg/>',
  'source/default/docs/other/notes.txt': 'anything',
  'source/default/demo/images/hero@3x.jpg': image(300, 150),
  'source/default/demo/fonts/fonts.json': {
    version: 1,
    families: [
      {
        id: 'text',
        family: 'Inter',
        license: 'licenses/inter.txt',
        faces: [{ file: 'text-normal.otf', weight: 400, style: 'normal' }]
      }
    ]
  },
  'source/default/demo/fonts/text-normal.otf': 'otf',
  'source/default/demo/fonts/licenses/inter.txt': 'OFL',
  'source/example/shared/images/logo/chassis-logo-brand.svg': image(120, 40)
}

/**
 * Lints a tree: the clean source, with files added and removed.
 * @param {Record<string, any>} [added] - The files to add. `null` removes a file.
 * @param {object} [withConfig]
 * @returns {Promise<string[]>} The problems, each as `rule file: message`.
 */
async function lint(added = {}, withConfig = config) {
  const tree = Object.fromEntries(
    Object.entries({ ...clean, ...added }).filter(([, value]) => value !== null)
  )
  const source = await readSource(withConfig, memoryReader(tree))
  return lintSource(source).map(({ rule, file, message }) => `${rule} ${file}: ${message}`)
}

/**
 * The problems of a rule, as `file: message`, with the message cut at 60 characters.
 * @param {string[]} problems
 * @param {string} rule
 */
const of = (problems, rule) =>
  problems
    .filter((problem) => problem.startsWith(`${rule} `))
    .map((problem) => problem.slice(rule.length + 1))

describe('lintSource', () => {
  test('finds nothing in a source that follows the contract', async () => {
    expect(await lint()).toEqual([])
  })

  test('returns every problem once, sorted by file', async () => {
    // The shared layer is read by the jobs of two apps and two brands
    const problems = await lint({
      'source/default/shared/images/logo/Logo.svg': image(1, 1),
      'source/default/docs/images/Banner.png': image(1, 1)
    })
    expect(problems.map((problem) => problem.split(': ')[0])).toEqual([
      'names source/default/docs/images/Banner.png',
      'names source/default/shared/images/logo/Logo.svg'
    ])
  })
})

describe('names', () => {
  test.each([
    [
      'capitals and a space',
      'images/Alert Window.png',
      'has the name "Alert Window"',
      'alert-window'
    ],
    ['an underscore', 'images/chassis_logo.png', 'has the name "chassis_logo"', 'chassis-logo'],
    ['a digit first', 'images/2fa-input.png', 'has the name "2fa-input"', 'fa-input'],
    ['a dot in the name', 'icons/arrow.min.svg', 'has the name "arrow.min"', 'arrow-min'],
    [
      'an indicator inside the name',
      'images/card@2x-1.png',
      'has the name "card@2x-1"',
      'card-2x-1'
    ]
  ])('reports a file name with %s, and says how to write it', async (_, file, message, name) => {
    const [problem, ...others] = of(
      await lint({ [`source/default/docs/${file}`]: image(1, 1) }),
      'names'
    )
    expect(others).toEqual([])
    expect(problem).toContain(`source/default/docs/${file}: ${message}`)
    expect(problem).toContain(`with a letter first, as ${name}`)
  })

  test.each([
    [
      'an extension in capitals',
      'images/logo.PNG',
      'has the extension .PNG, which is not in lowercase'
    ],
    ['the extension .jpeg', 'images/photo.jpeg', 'is a JPEG file, which has the extension .jpg'],
    [
      'an indicator on a vector image',
      'images/logo@2x.svg',
      'has the resolution indicator @2x, which only a raster image has'
    ],
    [
      'an indicator that the source does not have',
      'images/logo@1x.png',
      'has the resolution indicator @1x, which is not @2x, @3x, @4x. A file at 1x has none'
    ],
    [
      'the indicator of a density between',
      'images/logo@1.5x.png',
      'has the resolution indicator @1.5x, which is not @2x, @3x, @4x'
    ]
  ])('reports %s', async (_, file, message) => {
    const problems = of(await lint({ [`source/default/docs/${file}`]: image(1, 1) }), 'names')
    expect(problems).toEqual([expect.stringContaining(`source/default/docs/${file}: ${message}`)])
  })

  test('reports a folder once, whatever it holds', async () => {
    const problems = await lint({
      'source/default/docs/images/Home Page/a.svg': image(1, 1),
      'source/default/docs/images/Home Page/b.svg': image(1, 1, 'b')
    })
    expect(of(problems, 'names')).toEqual([
      'source/default/docs/images/Home Page/: is not a name of lowercase letters, digits and ' +
        'hyphens that starts with a letter'
    ])
  })

  test('takes the three indicators, digits and hyphens', async () => {
    const problems = await lint({
      'source/default/demo/images/android-chrome-192x192.png': image(1, 1),
      'source/default/demo/images/a@2x.webp': image(2, 2),
      'source/default/demo/images/b@4x.gif': image(4, 4)
    })
    expect(of(problems, 'names')).toEqual([])
  })

  test('checks the names of other/ too, which takes every kind of file', async () => {
    const problems = await lint({ 'source/default/docs/other/default.tokens.json': '{}' })
    expect(of(problems, 'names')).toEqual([
      expect.stringContaining('source/default/docs/other/default.tokens.json: has the name')
    ])
  })
})

describe('known types', () => {
  test.each([
    [
      'a stylesheet in images/',
      'images/style.css',
      'is a .css in images/, which takes .png, .jpg, .webp, .svg, .gif'
    ],
    ['a manifest below the root of images/', 'images/home/images.json', 'is a .json in images/'],
    ['a raster icon', 'icons/arrow.png', 'is a .png in icons/, which takes .svg'],
    [
      'a text file in fonts/',
      'fonts/notes.txt',
      'is a .txt in fonts/, which takes .otf, .ttf, and licenses/*.txt'
    ],
    ['a file without extension', 'images/LICENSE', 'is a file without extension in images/']
  ])('reports %s', async (_, file, message) => {
    const problems = of(await lint({ [`source/default/docs/${file}`]: 'content' }), 'known-types')
    expect(problems).toEqual([expect.stringContaining(`source/default/docs/${file}: ${message}`)])
  })

  test('reports what is outside a type folder', async () => {
    const problems = await lint({
      'source/default/docs/README.md': 'content',
      'source/default/docs/pictures/logo.svg': 'content'
    })
    expect(of(problems, 'known-types')).toEqual([
      expect.stringContaining('source/default/docs/README.md: is outside a type folder'),
      expect.stringContaining('source/default/docs/pictures: is outside a type folder')
    ])
  })

  test('takes every file in other/', async () => {
    const problems = await lint({ 'source/default/docs/other/archive.zip': 'content' })
    expect(of(problems, 'known-types')).toEqual([])
  })
})

describe('real files', () => {
  test('reports a Git LFS pointer, of every type', async () => {
    const problems = await lint({
      'source/default/docs/images/photo.png': LFS_POINTER,
      'source/default/demo/fonts/text-normal.otf': LFS_POINTER
    })
    expect(of(problems, 'real-files')).toEqual([
      'source/default/demo/fonts/text-normal.otf: is a Git LFS pointer, not the file. ' +
        'Install Git LFS and run `git lfs pull`',
      expect.stringContaining('source/default/docs/images/photo.png: is a Git LFS pointer')
    ])
  })

  test('reports a raster image whose size cannot be read', async () => {
    const problems = await lint({ 'source/default/docs/images/photo.png': 'not an image' })
    expect(of(problems, 'real-files')).toEqual([
      'source/default/docs/images/photo.png: is not an image whose size can be read'
    ])
  })

  test('reports the layer of an app that is missing in default', async () => {
    const problems = await lint({}, { ...config, apps: { ...config.apps, site: ['web'] } })
    expect(of(problems, 'layers')).toEqual([
      'source/default/site/: is missing. Every app has a folder in the first layer'
    ])
  })
})

describe('one master', () => {
  test('reports an image with two files and no rule that says committed', async () => {
    const problems = await lint({
      'source/default/demo/images/hero.jpg': image(100, 50),
      'source/default/demo/images/hero.webp': image(100, 50)
    })
    expect(of(problems, 'one-master')).toEqual([
      'source/default/demo/images/hero.jpg: is one of 3 files of the image images/hero ' +
        '(hero.jpg, hero.webp, hero@3x.jpg). Keep the master, the file at the highest ' +
        'density, or give the image a rule that says "committed"'
    ])
  })

  test('takes the files of an image in two layers: the later one overrides', async () => {
    const problems = await lint({ 'source/example/demo/images/hero@2x.png': image(200, 100) })
    expect(of(problems, 'one-master')).toEqual([])
  })

  test('takes the committed variants of a rule that says so', async () => {
    const problems = await lint({
      'source/default/docs/images/figma/components/alert/dark/alert-window.png': image(10, 10),
      'source/default/docs/images/figma/components/alert/dark/alert-window@2x.png': image(20, 20)
    })
    expect(of(problems, 'one-master')).toEqual([])
  })
})

describe('no derived variant', () => {
  test('reports a committed file with the name of a variant that the build derives', async () => {
    const problems = await lint({
      'source/default/docs/images/home/comp-gallery-light-small.png': image(48, 24),
      'source/default/docs/images/home/lego@2x.png': image(200, 100),
      'source/default/docs/images/home/lego-small.png': image(48, 24)
    })
    // lego has no size: lego-small is an image of its own
    expect(of(problems, 'no-derived-variant')).toEqual([
      'source/default/docs/images/home/comp-gallery-light-small.png: has the name of a ' +
        'variant that the build derives from ' +
        'source/default/docs/images/home/comp-gallery-light@2x.png'
    ])
  })

  test('reports a variant that a brand commits over the one of default', async () => {
    const problems = await lint({
      'source/example/docs/images/home/comp-gallery-light-small@2x.webp': image(96, 48)
    })
    expect(of(problems, 'no-derived-variant')).toEqual([
      expect.stringContaining('source/example/docs/images/home/comp-gallery-light-small@2x.webp')
    ])
  })
})

describe('no scaling up', () => {
  test('reports a density above the one of the master, and a size wider than it', async () => {
    const problems = await lint({
      'source/default/docs/images/home/lego.png': image(100, 50),
      'source/default/docs/images/home/comp-gallery-dark@2x.png': image(80, 40)
    })
    expect(of(problems, 'no-scaling-up')).toEqual([
      'source/default/docs/images/home/comp-gallery-dark@2x.png: the size "small" at 2x is 96 ' +
        'pixels wide, and the master is 80 at 2x. The build never scales up',
      'source/default/docs/images/home/lego.png: the density 2 is 200 pixels wide, and the ' +
        'master is 100 at 1x. The build never scales up'
    ])
  })
})

describe('manifest', () => {
  test('reports a manifest that does not parse, and one with a wrong key', async () => {
    const problems = await lint({
      'source/default/docs/images/images.json': '{ "rules": [',
      'source/default/demo/fonts/fonts.json': { version: 1, families: [{ id: 'text' }] }
    })
    expect(of(problems, 'manifest')).toEqual([
      expect.stringContaining('source/default/demo/fonts/fonts.json: the family "text": "family"'),
      expect.stringContaining('source/default/docs/images/images.json: is not JSON')
    ])
  })

  test('reports a rule that matches no image', async () => {
    const problems = await lint({
      'source/default/docs/images/images.json': {
        version: 1,
        rules: [
          { match: 'home/*', densities: [1, 2] },
          { match: 'home/hero-*', formats: ['webp'] },
          { match: 'figma/**', committed: true }
        ]
      }
    })
    expect(of(problems, 'manifest')).toEqual([
      'source/default/docs/images/images.json: the rule "home/hero-*" matches no image'
    ])
  })

  test('takes a rule of a shared layer that matches an image of one app only', async () => {
    const problems = await lint({
      'source/default/shared/images/images.json': {
        version: 1,
        rules: [{ match: 'hero', budget: 100000 }]
      }
    })
    expect(of(problems, 'manifest')).toEqual([])
  })

  test('reports a rule that asks an image for what it cannot give', async () => {
    const problems = await lint({
      'source/default/demo/images/images.json': {
        version: 1,
        rules: [{ match: 'hero', formats: ['svg'] }]
      }
    })
    expect(of(problems, 'manifest')).toEqual([
      'source/default/demo/images/hero@3x.jpg: is not an SVG file, and its rule asks for "svg"'
    ])
  })
})

describe('fonts', () => {
  test('reports a font file and a license that no family names', async () => {
    const problems = await lint({
      'source/default/demo/fonts/text-strong.otf': 'otf',
      'source/default/demo/fonts/licenses/ofl.txt': 'OFL'
    })
    expect(of(problems, 'fonts')).toEqual([
      'source/default/demo/fonts/licenses/ofl.txt: is the license of no family of fonts/fonts.json',
      'source/default/demo/fonts/text-strong.otf: is in no family of fonts/fonts.json'
    ])
  })

  test('reports a face and a license that are missing', async () => {
    const problems = await lint({
      'source/default/demo/fonts/text-normal.otf': null,
      'source/default/demo/fonts/licenses/inter.txt': null
    })
    expect(of(problems, 'fonts')).toEqual([
      'source/default/demo/fonts/fonts.json: the family "text" names the file ' +
        'text-normal.otf, which does not exist',
      'source/default/demo/fonts/fonts.json: the family "text" names the license ' +
        'licenses/inter.txt, which does not exist'
    ])
  })

  test('reports the fonts of a layer without a manifest', async () => {
    const problems = await lint({ 'source/example/demo/fonts/text-normal.ttf': 'ttf' })
    expect(of(problems, 'fonts')).toEqual([
      'source/example/demo/fonts/text-normal.ttf: is in no family of fonts/fonts.json'
    ])
  })
})

describe('no generated file', () => {
  test('reports a web font and a stylesheet in fonts/', async () => {
    const problems = await lint({
      'source/default/demo/fonts/text-normal.woff2': 'woff2',
      'source/default/demo/fonts/text.css': '@font-face {}',
      'source/default/demo/fonts/fonts.scss': '@font-face {}'
    })
    expect(of(problems, 'no-generated-file').map((problem) => problem.split(': ')[0])).toEqual([
      'source/default/demo/fonts/fonts.scss',
      'source/default/demo/fonts/text-normal.woff2',
      'source/default/demo/fonts/text.css'
    ])
    expect(of(problems, 'known-types')).toEqual([])
    expect(of(problems, 'fonts')).toEqual([])
  })
})

describe('no duplicate', () => {
  test('reports the files of one folder that have the same content', async () => {
    const problems = await lint({
      'source/default/docs/icons/arrow.svg': '<svg/>',
      'source/default/docs/images/home/tokens-visual.svg': image(200, 100, 'same'),
      'source/default/docs/images/home/tokens-copy.svg': image(200, 100, 'same'),
      'source/default/docs/images/home/tokens-third.svg': image(200, 100, 'same')
    })
    expect(of(problems, 'no-duplicate')).toEqual([
      'source/default/docs/icons/arrow.svg: has the same content as cx-sprite.svg of its folder',
      'source/default/docs/images/home/tokens-copy.svg: has the same content as ' +
        'tokens-third.svg, tokens-visual.svg of its folder'
    ])
  })

  test('takes the same content in two folders, and in two layers', async () => {
    const problems = await lint({
      'source/default/docs/images/logo.svg': image(1, 1, 'logo'),
      'source/default/docs/images/home/logo.svg': image(1, 1, 'logo'),
      'source/default/demo/images/logo.svg': image(1, 1, 'logo'),
      'source/example/docs/images/logo.svg': image(1, 1, 'logo')
    })
    expect(of(problems, 'no-duplicate')).toEqual([])
  })

  test('takes the exports of a rule that says committed', async () => {
    // alert-window.png and alert-size.png of the clean source are one picture
    expect(of(await lint(), 'no-duplicate')).toEqual([])
  })
})

describe('reserved names', () => {
  test('reports a folder of source/ that is not default or a brand', async () => {
    const problems = await lint({
      'source/acme/docs/images/logo.svg': image(1, 1),
      'source/README.md': 'content'
    })
    expect(of(problems, 'reserved-names')).toEqual([
      'source/README.md: is a file. The folder holds folders only: default or a brand of the ' +
        'configuration (chassis, example)',
      'source/acme/: is not default or a brand of the configuration (chassis, example)'
    ])
  })

  test('reports a folder of a brand that is not shared or an app', async () => {
    const problems = await lint({
      'source/example/site/images/logo.svg': image(1, 1),
      'source/default/notes.txt': 'content'
    })
    expect(of(problems, 'reserved-names')).toEqual([
      'source/default/notes.txt: is a file. The folder holds folders only: shared or an app ' +
        'of the configuration (docs, demo)',
      'source/example/site/: is not shared or an app of the configuration (docs, demo)'
    ])
  })

  test('takes a brand without a folder', async () => {
    const problems = await lint({
      'source/example/shared/images/logo/chassis-logo-brand.svg': null
    })
    expect(of(problems, 'reserved-names')).toEqual([])
  })
})
