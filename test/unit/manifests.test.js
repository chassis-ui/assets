/**
 * @file manifests.test.js
 * @description Tests for the image manifest and the font manifest: what is accepted, which
 *              key a message names, and which rule an image gets.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { BuildError } from '../../build/errors.js'
import { checkFontsManifest } from '../../build/manifests/fonts.js'
import { checkImagesManifest, derives, matches, ruleOf } from '../../build/manifests/images.js'

const FILE = 'source/default/docs/images/images.json'

/** The manifest of the source contract. */
const images = {
  version: 1,
  rules: [
    { match: 'home/*', densities: [1, 2] },
    {
      match: 'home/comp-gallery-*',
      sizes: { small: 480 },
      formats: ['png', 'webp'],
      budget: 500000
    },
    { match: 'home/figma-*', formats: ['png', 'webp'] },
    { match: 'figma/**', committed: true }
  ]
}

describe('checkImagesManifest', () => {
  test('returns the rules, each with the file it is from', () => {
    const rules = checkImagesManifest(images, FILE)
    expect(rules).toHaveLength(4)
    expect(rules[0]).toEqual({ match: 'home/*', densities: [1, 2], file: FILE })
  })

  test('accepts every key of a rule', () => {
    const rule = {
      match: 'logo/chassis-logo-brand',
      densities: [1, 1.5, 2, 3, 4],
      sizes: { small: 480, 'extra-small': 240 },
      formats: ['png', 'jpeg', 'webp', 'avif', 'svg'],
      quality: { jpeg: 90, webp: 75, avif: 40 },
      palette: true,
      budget: 1000,
      platforms: ['ios', 'android'],
      name: 'brand-logo'
    }
    expect(checkImagesManifest({ version: 1, rules: [rule] }, FILE)).toEqual([
      { ...rule, file: FILE }
    ])
    expect(checkImagesManifest({ version: 1, rules: [] }, FILE)).toEqual([])
  })

  test.each([
    ['a list', [], 'is not an object with "version" and "rules"'],
    ['another version', { version: 2, rules: [] }, '"version" is not 1'],
    ['no rules', { version: 1 }, '"rules" is not a list'],
    ['an unknown key', { version: 1, rules: [], images: [] }, '"images" is not a key'],
    ['a rule without match', { version: 1, rules: [{ densities: [1] }] }, 'rule 1 has no "match"'],
    [
      'an unknown key of a rule',
      { version: 1, rules: [{ match: 'a' }, { match: 'b', density: 2 }] },
      'rule 2 has the key "density", which is not one of match, densities'
    ],
    ['a pattern with capitals', { version: 1, rules: [{ match: 'Home/*' }] }, 'rule 1: "match"'],
    ['a pattern with an extension', { version: 1, rules: [{ match: 'a.png' }] }, '"match" is not'],
    [
      'a density that no output has',
      { version: 1, rules: [{ match: 'a', densities: [1, 5] }] },
      'rule 1: "densities" is not a list of 1, 1.5, 2, 3, 4'
    ],
    ['a density twice', { version: 1, rules: [{ match: 'a', densities: [2, 2] }] }, '"densities"'],
    ['no density', { version: 1, rules: [{ match: 'a', densities: [] }] }, '"densities"'],
    ['a size that is no number', { version: 1, rules: [{ match: 'a', sizes: { s: '480' } }] }, ''],
    ['a size with a wrong name', { version: 1, rules: [{ match: 'a', sizes: { S: 480 } }] }, ''],
    [
      'an unknown format',
      { version: 1, rules: [{ match: 'a', formats: ['gif'] }] },
      'rule 1: "formats" is not a list of png, jpeg, webp, avif, svg'
    ],
    [
      'a quality of a format that has none',
      { version: 1, rules: [{ match: 'a', quality: { png: 80 } }] },
      'rule 1: "quality" is not an object of jpeg, webp, avif and a quality from 1 to 100'
    ],
    ['a quality of 0', { version: 1, rules: [{ match: 'a', quality: { webp: 0 } }] }, '"quality"'],
    ['a budget of 0', { version: 1, rules: [{ match: 'a', budget: 0 }] }, '"budget" is not a size'],
    [
      'committed as text',
      { version: 1, rules: [{ match: 'a', committed: 'yes' }] },
      'true or false'
    ],
    ['an unknown platform', { version: 1, rules: [{ match: 'a', platforms: ['tv'] }] }, ''],
    [
      'committed with what derives',
      { version: 1, rules: [{ match: 'a', committed: true, formats: ['webp'] }] },
      'rule 1 says "committed", and asks for "formats" too'
    ],
    [
      'a name for many images',
      { version: 1, rules: [{ match: 'logo/*', name: 'logo' }] },
      'rule 1 has a "name", so its "match" has to name one image'
    ]
  ])('fails on %s', (_, raw, message) => {
    expect(() => checkImagesManifest(raw, FILE)).toThrow(BuildError)
    expect(() => checkImagesManifest(raw, FILE)).toThrow(`${FILE}: `)
    expect(() => checkImagesManifest(raw, FILE)).toThrow(message)
  })
})

describe('matches', () => {
  test.each([
    ['home/*', 'home/lego-chassis', true],
    ['home/*', 'home', false],
    ['home/*', 'home/icons/arrow', false],
    ['home/comp-gallery-*', 'home/comp-gallery-light', true],
    ['home/comp-gallery-*', 'home/comp-gallery', false],
    ['home/comp-gallery-*', 'demo/home/comp-gallery-light', false],
    ['figma/**', 'figma/components/alert/dark/alert-window', true],
    ['figma/**', 'figma-docs', false],
    ['**', 'home/lego-chassis', true],
    ['**/light/*', 'figma/components/alert/light/alert-window', true],
    ['*', 'favicon', true],
    ['*', 'home/favicon', false],
    ['favicon-16x16', 'favicon-16x16', true],
    ['favicon-16x16', 'favicon-16x16-dark', false]
  ])('%s and %s', (pattern, image, expected) => {
    expect(matches(pattern, image)).toBe(expected)
  })
})

describe('ruleOf', () => {
  const rules = checkImagesManifest(images, FILE)

  test('gives an image the keys of every rule that matches it', () => {
    expect(ruleOf('home/comp-gallery-light', rules)).toEqual({
      densities: [1, 2],
      sizes: { small: 480 },
      formats: ['png', 'webp'],
      budget: 500000
    })
    expect(ruleOf('home/lego-chassis', rules)).toEqual({ densities: [1, 2] })
    expect(ruleOf('figma/components/alert/dark/alert-window', rules)).toEqual({ committed: true })
  })

  test('gives an image without a rule nothing', () => {
    expect(ruleOf('favicon', rules)).toBeUndefined()
    expect(ruleOf('favicon', [])).toBeUndefined()
  })

  test('lets a later rule override the keys that it sets', () => {
    const brand = checkImagesManifest(
      {
        version: 1,
        rules: [
          { match: 'home/comp-gallery-light', formats: ['avif'], densities: [2] },
          { match: 'figma/components/alert/**', committed: false, densities: [1, 2] }
        ]
      },
      'source/example/docs/images/images.json'
    )
    expect(ruleOf('home/comp-gallery-light', [...rules, ...brand])).toEqual({
      densities: [2],
      sizes: { small: 480 },
      formats: ['avif'],
      budget: 500000
    })
    expect(ruleOf('figma/components/alert/dark/alert-window', [...rules, ...brand])).toEqual({
      committed: false,
      densities: [1, 2]
    })
  })
})

describe('derives', () => {
  test('says whether a rule asks the build for files', () => {
    expect(derives({ densities: [1, 2] })).toBe(true)
    expect(derives({ sizes: { small: 480 } })).toBe(true)
    expect(derives({ formats: ['webp'] })).toBe(true)
    expect(derives({ committed: false, formats: ['webp'] })).toBe(true)
    expect(derives({ committed: true, formats: ['webp'] })).toBe(false)
    expect(derives({ committed: true })).toBe(false)
    expect(derives({ budget: 1000, platforms: ['web'] })).toBe(false)
    expect(derives(undefined)).toBe(false)
  })
})

describe('checkFontsManifest', () => {
  const FONTS = 'source/default/demo/fonts/fonts.json'
  const text = {
    id: 'text',
    family: 'Inter',
    license: 'licenses/inter.txt',
    subset: ['U+0020-007E', 'U+00A0-024F', 'U+20AC'],
    faces: [
      { file: 'text-elegant.otf', weight: 300, style: 'normal' },
      { file: 'text-normal.otf', weight: 400, style: 'normal' },
      { file: 'text-normal-italic.otf', weight: 400, style: 'italic' }
    ]
  }
  const code = {
    id: 'code',
    family: 'Fira Code',
    license: 'licenses/fira-code.txt',
    faces: [{ file: 'code-normal.ttf', weight: 400, style: 'normal' }]
  }
  const manifest = (/** @type {object[]} */ ...families) => ({ version: 1, families })

  test('returns the families, each with the manifest it is from', () => {
    expect(checkFontsManifest(manifest(text, code), FONTS)).toEqual([
      { ...text, manifest: FONTS },
      { ...code, manifest: FONTS }
    ])
  })

  test.each([
    ['another version', { version: 2, families: [] }, '"version" is not 1'],
    ['no families', { version: 1 }, '"families" is not a list'],
    ['an unknown key', { version: 1, families: [], fonts: [] }, '"fonts" is not a key'],
    ['a family without id', manifest({ ...text, id: undefined }), 'family 1: "id" is not a name'],
    ['an id with capitals', manifest({ ...text, id: 'Text' }), 'family 1: "id" is not a name'],
    ['a family twice', manifest(text, { ...code, id: 'text' }), 'the family "text" is there twice'],
    ['no family name', manifest({ ...text, family: ' ' }), 'the family "text": "family" is not'],
    ['no license', manifest({ ...code, license: undefined }), 'the family "code": "license"'],
    ['a license outside licenses/', manifest({ ...code, license: 'ofl.txt' }), '"license" is not'],
    ['a wrong range', manifest({ ...text, subset: ['0020-007E'] }), '"subset" is not a list'],
    ['no face', manifest({ ...code, faces: [] }), 'the family "code": "faces" is not a list'],
    [
      'an unknown key of a family',
      manifest({ ...code, weight: 400 }),
      'the family "code" has the key "weight", which is not one of id, family, license'
    ],
    [
      'a web font as the file of a face',
      manifest({ ...code, faces: [{ file: 'code-normal.woff2', weight: 400, style: 'normal' }] }),
      'the family "code", face 1: "file" is not an OTF or TTF file'
    ],
    [
      'a file in a folder',
      manifest({ ...code, faces: [{ file: 'code/normal.ttf', weight: 400, style: 'normal' }] }),
      'face 1: "file" is not'
    ],
    [
      'a weight that no face has',
      manifest({ ...code, faces: [{ file: 'code-normal.ttf', weight: 950, style: 'normal' }] }),
      'the family "code", face 1: "weight" is not a number from 100 to 900'
    ],
    [
      'an unknown style',
      manifest({ ...code, faces: [{ file: 'code-normal.ttf', weight: 400, style: 'oblique' }] }),
      'face 1: "style" is not normal or italic'
    ],
    [
      'an unknown key of a face',
      manifest({
        ...code,
        faces: [{ file: 'code-normal.ttf', weight: 400, style: 'normal', x: 1 }]
      }),
      'face 1 has the key "x"'
    ],
    [
      'a file in two faces',
      manifest(text, {
        ...code,
        faces: [{ file: 'text-normal.otf', weight: 400, style: 'normal' }]
      }),
      'the family "code", face 1: the file text-normal.otf is there twice'
    ],
    [
      'two faces of one weight and style',
      manifest({
        ...code,
        faces: [...code.faces, { file: 'code-regular.ttf', weight: 400, style: 'normal' }]
      }),
      'the family "code" has two faces of the weight 400, normal'
    ]
  ])('fails on %s', (_, raw, message) => {
    expect(() => checkFontsManifest(raw, FONTS)).toThrow(BuildError)
    expect(() => checkFontsManifest(raw, FONTS)).toThrow(`${FONTS}: `)
    expect(() => checkFontsManifest(raw, FONTS)).toThrow(message)
  })
})
