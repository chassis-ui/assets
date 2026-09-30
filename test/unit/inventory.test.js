/**
 * @file inventory.test.js
 * @description Tests for the inventory, on trees in memory and on one in a scratch folder:
 *              the layers, what a later layer overrides, the manifests, and what is wrong
 *              with a layer.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { compose } from '../../build/assets.js'
import { BuildError } from '../../build/errors.js'
import {
  fsReader,
  isLfsPointer,
  readInventory,
  readLayer,
  readLayers
} from '../../build/inventory.js'
import { layers } from '../../build/plan.js'
import { LFS_POINTER, memoryReader, png, scratch, svg } from './helpers/tree.js'

const file = { bytes: 10 }
const image = (width, height) => ({ width, height, bytes: 100 })

const fonts = {
  version: 1,
  families: [
    {
      id: 'text',
      family: 'Inter',
      license: 'licenses/inter.txt',
      faces: [
        { file: 'text-strong.otf', weight: 600, style: 'normal' },
        { file: 'text-normal.otf', weight: 400, style: 'normal' }
      ]
    },
    {
      id: 'code',
      family: 'Fira Code',
      license: 'licenses/fira-code.txt',
      faces: [{ file: 'code-normal.ttf', weight: 400, style: 'normal' }]
    }
  ]
}

const fontFiles = {
  'source/default/demo/fonts/fonts.json': fonts,
  'source/default/demo/fonts/text-normal.otf': file,
  'source/default/demo/fonts/text-strong.otf': file,
  'source/default/demo/fonts/code-normal.ttf': file,
  'source/default/demo/fonts/licenses/inter.txt': 'OFL',
  'source/default/demo/fonts/licenses/fira-code.txt': 'OFL'
}

describe('readInventory', () => {
  test('returns the assets of a layer, each with its files', async () => {
    const reader = memoryReader({
      'source/default/docs/images/home/lego@2x.png': image(200, 100),
      'source/default/docs/images/home/lego.png': image(100, 50),
      'source/default/docs/images/site-logo.svg': image(24, 24),
      'source/default/docs/icons/cx-sprite.svg': file,
      'source/default/docs/other/default.tokens.json': file
    })
    const assets = await readInventory(layers('acme', 'docs'), reader)

    expect(assets.map((asset) => asset.id)).toEqual([
      'icons/cx-sprite',
      'images/home/lego',
      'images/site-logo',
      'other/default.tokens'
    ])
    expect(assets[1]).toEqual({
      type: 'images',
      id: 'images/home/lego',
      folder: 'home',
      name: 'lego',
      files: [
        {
          path: 'source/default/docs/images/home/lego.png',
          layer: 'source/default/docs',
          type: 'images',
          folder: 'home',
          name: 'lego',
          density: 1,
          extension: '.png',
          bytes: 100,
          width: 100,
          height: 50
        },
        {
          path: 'source/default/docs/images/home/lego@2x.png',
          layer: 'source/default/docs',
          type: 'images',
          folder: 'home',
          name: 'lego',
          density: 2,
          extension: '.png',
          bytes: 100,
          width: 200,
          height: 100
        }
      ]
    })
  })

  test('reads a size for images only', async () => {
    const reader = memoryReader({
      'source/default/docs/icons/arrow.svg': image(16, 16),
      'source/default/docs/other/photo.png': image(16, 16)
    })
    const assets = await readInventory(layers('acme', 'docs'), reader)
    expect(assets.flatMap((asset) => asset.files).map((file) => file.width)).toEqual([
      undefined,
      undefined
    ])
  })

  test('takes the files of the last layer that has an asset', async () => {
    const reader = memoryReader({
      'source/default/shared/images/logo/brand.svg': image(10, 10),
      'source/default/shared/images/logo/white.svg': image(10, 10),
      'source/default/demo/images/logo/brand.png': image(10, 10),
      'source/default/demo/images/logo/brand@2x.png': image(20, 20),
      'source/example/shared/images/logo/brand.svg': image(30, 30),
      'source/example/demo/images/hero@3x.png': image(90, 90)
    })
    const paths = async (brand) =>
      (await readInventory(layers(brand, 'demo'), reader))
        .flatMap((asset) => asset.files)
        .map((file) => file.path)

    // The app overrides the asset with both of its files, not the file of one name
    expect(await paths('chassis')).toEqual([
      'source/default/demo/images/logo/brand.png',
      'source/default/demo/images/logo/brand@2x.png',
      'source/default/shared/images/logo/white.svg'
    ])
    // A later layer wins, also with another extension and another density
    expect(await paths('example')).toEqual([
      'source/example/demo/images/hero@3x.png',
      'source/example/shared/images/logo/brand.svg',
      'source/default/shared/images/logo/white.svg'
    ])
  })

  test('gives an image the rule of the manifests of its layers, in their order', async () => {
    const reader = memoryReader({
      'source/default/shared/images/images.json': {
        version: 1,
        rules: [{ match: '**', densities: [1, 2], budget: 1000 }]
      },
      'source/default/shared/images/logo/brand.svg': image(10, 10),
      'source/default/docs/images/images.json': {
        version: 1,
        rules: [
          { match: 'home/*', formats: ['png', 'webp'] },
          { match: 'figma/**', committed: true }
        ]
      },
      'source/default/docs/images/home/lego@2x.png': image(200, 100),
      'source/default/docs/images/figma/alert/dark/window.png': image(20, 10),
      'source/example/shared/images/images.json': {
        version: 1,
        rules: [{ match: 'home/lego', densities: [2] }]
      }
    })
    const rules = async (brand) =>
      Object.fromEntries(
        (await readInventory(layers(brand, 'docs'), reader)).map((asset) => [asset.id, asset.rule])
      )

    expect(await rules('chassis')).toEqual({
      'images/figma/alert/dark/window': { densities: [1, 2], budget: 1000, committed: true },
      'images/home/lego': { densities: [1, 2], budget: 1000, formats: ['png', 'webp'] },
      'images/logo/brand': { densities: [1, 2], budget: 1000 }
    })
    expect((await rules('example'))['images/home/lego']).toEqual({
      densities: [2],
      budget: 1000,
      formats: ['png', 'webp']
    })
  })

  test('takes a manifest out of the files, and gives an image without a rule none', async () => {
    const reader = memoryReader({
      'source/default/docs/images/images.json': { version: 1, rules: [] },
      'source/default/docs/images/favicon.png': image(48, 48)
    })
    const assets = await readInventory(layers('acme', 'docs'), reader)
    expect(assets.map((asset) => asset.id)).toEqual(['images/favicon'])
    expect('rule' in assets[0]).toBe(false)
  })

  test('returns a font family with its faces in the order of the manifest, then its license', async () => {
    const assets = await readInventory(layers('acme', 'demo'), memoryReader(fontFiles))

    expect(assets.map((asset) => asset.id)).toEqual(['fonts/code', 'fonts/text'])
    expect(assets[1]).toMatchObject({
      type: 'fonts',
      id: 'fonts/text',
      folder: '',
      name: 'text',
      family: {
        id: 'text',
        family: 'Inter',
        license: 'licenses/inter.txt',
        manifest: 'source/default/demo/fonts/fonts.json'
      }
    })
    expect(assets[1].files.map((file) => file.path)).toEqual([
      'source/default/demo/fonts/text-strong.otf',
      'source/default/demo/fonts/text-normal.otf',
      'source/default/demo/fonts/licenses/inter.txt'
    ])
  })

  test('lets a brand override a font family, with every face of it', async () => {
    const reader = memoryReader({
      ...fontFiles,
      'source/example/demo/fonts/fonts.json': {
        version: 1,
        families: [
          {
            id: 'text',
            family: 'Roboto Serif',
            license: 'licenses/roboto-serif.txt',
            faces: [{ file: 'text-normal.ttf', weight: 400, style: 'normal' }]
          }
        ]
      },
      'source/example/demo/fonts/text-normal.ttf': file,
      'source/example/demo/fonts/licenses/roboto-serif.txt': 'OFL'
    })
    const assets = await readInventory(layers('example', 'demo'), reader)
    expect(assets.map((asset) => [asset.id, asset.family.family, asset.files.length])).toEqual([
      ['fonts/code', 'Fira Code', 2],
      ['fonts/text', 'Roboto Serif', 2]
    ])
  })

  test('leaves out a font file that no family names', async () => {
    const reader = memoryReader({
      ...fontFiles,
      'source/default/demo/fonts/display-normal.otf': file,
      'source/default/demo/fonts/text-normal.woff2': file
    })
    const assets = await readInventory(layers('acme', 'demo'), reader)
    expect(assets.flatMap((asset) => asset.files)).toHaveLength(5)
  })

  test.each([
    [
      'a layer of the app in default that is missing',
      { 'source/example/docs/images/logo.svg': image(1, 1) },
      'source/default/docs/: is missing. Every app has a folder in the first layer'
    ],
    [
      'a file outside a type folder',
      { 'source/default/docs/README.md': file },
      'source/default/docs/README.md: is outside a type folder. A layer holds the folders ' +
        'fonts, icons, images, other'
    ],
    [
      'a folder that is not a type',
      { 'source/default/docs/pictures/logo.svg': file },
      'source/default/docs/pictures: is outside a type folder'
    ],
    [
      'a raster image without a size',
      { 'source/default/docs/images/broken@2x.png': file },
      'source/default/docs/images/broken@2x.png: is not an image whose size can be read'
    ],
    [
      'a Git LFS pointer',
      { 'source/default/docs/images/lego.png': LFS_POINTER },
      'source/default/docs/images/lego.png: is a Git LFS pointer, not the file. ' +
        'Install Git LFS and run `git lfs pull`'
    ],
    [
      'a manifest that is not JSON',
      { 'source/default/docs/images/images.json': '{ rules' },
      'source/default/docs/images/images.json: is not JSON'
    ],
    [
      'a manifest with a wrong key',
      { 'source/default/docs/images/images.json': { version: 1, rules: [{ match: 'a', x: 1 }] } },
      'source/default/docs/images/images.json: rule 1 has the key "x"'
    ],
    [
      'a face whose file does not exist',
      {
        'source/default/docs/fonts/fonts.json': fonts,
        'source/default/docs/fonts/text-normal.otf': file,
        'source/default/docs/fonts/text-strong.otf': file,
        'source/default/docs/fonts/licenses/inter.txt': 'OFL',
        'source/default/docs/fonts/licenses/fira-code.txt': 'OFL'
      },
      'source/default/docs/fonts/fonts.json: the family "code" names the file code-normal.ttf, ' +
        'which does not exist'
    ],
    [
      'a license that does not exist',
      {
        'source/default/docs/fonts/fonts.json': fonts,
        'source/default/docs/fonts/text-normal.otf': file,
        'source/default/docs/fonts/text-strong.otf': file,
        'source/default/docs/fonts/code-normal.ttf': file,
        'source/default/docs/fonts/licenses/inter.txt': 'OFL'
      },
      'the family "code" names the license licenses/fira-code.txt, which does not exist'
    ]
  ])('fails on %s', async (_, tree, message) => {
    const read = readInventory(layers('acme', 'docs'), memoryReader(tree))
    await expect(read).rejects.toThrow(BuildError)
    await expect(read).rejects.toThrow(message)
  })

  test('does not fail on an SVG file without a size', async () => {
    const reader = memoryReader({ 'source/default/docs/images/sprite.svg': file })
    expect(await readInventory(layers('acme', 'docs'), reader)).toHaveLength(1)
  })

  test('leaves out the files of the system', async () => {
    const reader = memoryReader({
      'source/default/docs/.DS_Store': file,
      'source/default/docs/images/.DS_Store': file,
      'source/default/docs/images/Thumbs.db': file,
      'source/default/docs/images/.hidden/logo.svg': file,
      'source/default/docs/images/logo.svg': image(1, 1)
    })
    const assets = await readInventory(layers('acme', 'docs'), reader)
    expect(assets.map((asset) => asset.id)).toEqual(['images/logo'])
  })
})

describe('readLayer', () => {
  test('returns null for a layer that does not exist', async () => {
    expect(await readLayer(memoryReader({}), 'source/default/docs')).toBeNull()
  })

  test('returns everything that is wrong with a layer, and throws nothing', async () => {
    const reader = memoryReader({
      'source/default/docs/README.md': file,
      'source/default/docs/images/images.json': { version: 2 },
      'source/default/docs/images/broken.png': file,
      'source/default/docs/images/pointer.png': LFS_POINTER,
      'source/default/docs/fonts/fonts.json': '[',
      'source/default/docs/fonts/pointer.otf': LFS_POINTER
    })
    const layer = await readLayer(reader, 'source/default/docs', { content: true })
    expect(layer.problems.map((problem) => [problem.rule, problem.file])).toEqual([
      ['known-types', 'source/default/docs/README.md'],
      ['manifest', 'source/default/docs/fonts/fonts.json'],
      ['real-files', 'source/default/docs/fonts/pointer.otf'],
      ['real-files', 'source/default/docs/images/broken.png'],
      ['manifest', 'source/default/docs/images/images.json'],
      ['real-files', 'source/default/docs/images/pointer.png']
    ])
    expect(layer.rules).toEqual([])
    expect(layer.families).toEqual([])
  })

  test('reads the hash of every file when it is asked for the content', async () => {
    const reader = memoryReader({
      'source/default/docs/icons/a.svg': '<svg/>',
      'source/default/docs/icons/b.svg': '<svg/>',
      'source/default/docs/icons/c.svg': '<svg></svg>'
    })
    const without = await readLayer(reader, 'source/default/docs')
    expect(without.files.map((file) => file.sha256)).toEqual([undefined, undefined, undefined])

    const { files } = await readLayer(reader, 'source/default/docs', { content: true })
    expect(files[0].sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(files[0].sha256).toBe(files[1].sha256)
    expect(files[0].sha256).not.toBe(files[2].sha256)
  })
})

describe('readLayers', () => {
  test('reads a layer through what it is given, so that a caller can remember', async () => {
    const reader = memoryReader({ 'source/default/docs/images/logo.svg': file })
    /** @type {string[]} */
    const asked = []
    const read = async (layer) => {
      asked.push(layer)
      return readLayer(reader, layer)
    }
    const found = await readLayers(layers('acme', 'docs'), reader, { read })
    expect(asked).toEqual(layers('acme', 'docs'))
    expect(found.layers.map((layer) => layer.path)).toEqual(['source/default/docs'])
    expect(found.problems).toEqual([])
  })
})

describe('compose', () => {
  test('returns the font files that no family names', async () => {
    const reader = memoryReader({
      ...fontFiles,
      'source/default/demo/fonts/display-normal.otf': file,
      'source/default/demo/fonts/text.css': file
    })
    const layer = await readLayer(reader, 'source/default/demo')
    expect(compose([layer]).unlisted.map((file) => file.path)).toEqual([
      'source/default/demo/fonts/display-normal.otf',
      'source/default/demo/fonts/text.css'
    ])
  })
})

describe('fsReader', () => {
  test('reads the entries of a folder sorted, with the size of the files', async () => {
    const root = await scratch({
      'source/default/docs/images/b.svg': svg(24, 12),
      'source/default/docs/images/a@2x.png': png(200, 100),
      'source/default/docs/images/home/c.svg': svg(1, 1)
    })
    const reader = fsReader(root)
    expect(await reader.list('source/default/docs/images')).toEqual([
      { name: 'a@2x.png', directory: false, bytes: 33 },
      { name: 'b.svg', directory: false, bytes: svg(24, 12).length },
      { name: 'home', directory: true, bytes: 0 }
    ])
    expect(await reader.list('source/default/demo')).toBeNull()
    expect(await reader.list('source/default/docs/images/b.svg')).toBeNull()
  })

  test('reads the size of an image with image-size', async () => {
    const root = await scratch({
      'images/a@2x.png': png(200, 100),
      'images/b.svg': svg(24, 12),
      'images/sprite.svg': '<svg xmlns="http://www.w3.org/2000/svg"><symbol id="a"/></svg>',
      'images/text.png': 'not an image',
      'images/pointer.png': LFS_POINTER
    })
    const reader = fsReader(root)
    expect(await reader.size('images/a@2x.png')).toEqual({ width: 200, height: 100 })
    expect(await reader.size('images/b.svg')).toEqual({ width: 24, height: 12 })
    expect(await reader.size('images/sprite.svg')).toBeNull()
    expect(await reader.size('images/text.png')).toBeNull()
    expect(await reader.size('images/pointer.png')).toBeNull()
  })

  test('reads the content of a file', async () => {
    const root = await scratch({ 'source/default/docs/images/images.json': '{}' })
    const content = await fsReader(root).read('source/default/docs/images/images.json')
    expect(Buffer.from(content).toString()).toBe('{}')
  })

  test('reads a tree from the disk as one from memory', async () => {
    const root = await scratch({
      'source/default/docs/images/images.json': {
        version: 1,
        rules: [{ match: 'home/*', densities: [1, 2] }]
      },
      'source/default/docs/images/home/lego@2x.png': png(200, 100),
      'source/default/docs/icons/cx-sprite.svg': '<svg/>',
      'source/default/docs/.DS_Store': ''
    })
    const assets = await readInventory(layers('acme', 'docs'), fsReader(root))
    expect(assets.map((asset) => asset.id)).toEqual(['icons/cx-sprite', 'images/home/lego'])
    expect(assets[1].files[0]).toMatchObject({ density: 2, bytes: 33, width: 200, height: 100 })
    expect(assets[1].rule).toEqual({ densities: [1, 2] })
  })

  test('says that a file is a Git LFS pointer', async () => {
    const root = await scratch({ 'source/default/docs/images/a.png': LFS_POINTER })
    const read = readInventory(layers('acme', 'docs'), fsReader(root))
    await expect(read).rejects.toThrow(
      'source/default/docs/images/a.png: is a Git LFS pointer, not the file'
    )
  })
})

describe('isLfsPointer', () => {
  test('knows a pointer from a file', () => {
    expect(isLfsPointer(Buffer.from(LFS_POINTER))).toBe(true)
    expect(isLfsPointer(png(1, 1))).toBe(false)
    expect(isLfsPointer(Buffer.alloc(0))).toBe(false)
    expect(isLfsPointer(Buffer.from(LFS_POINTER.padEnd(2048, ' ')))).toBe(false)
  })
})
