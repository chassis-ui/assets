/**
 * @file inventory.test.js
 * @description Tests for the inventory, on trees in memory and on one in a scratch folder.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { BuildError } from '../../build/errors.js'
import { fsReader, isLfsPointer, readInventory } from '../../build/inventory.js'
import { layers } from '../../build/plan.js'
import { LFS_POINTER, memoryReader, png, scratch, svg } from './helpers/tree.js'

const file = { bytes: 10 }
const image = (width, height) => ({ width, height, bytes: 100 })

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
      'source/default/docs/fonts/text.otf': file
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

  test('skips a layer that does not exist, except the one of the app in default', async () => {
    const reader = memoryReader({ 'source/example/docs/images/logo.svg': image(1, 1) })
    const read = readInventory(layers('example', 'docs'), reader)
    await expect(read).rejects.toThrow(BuildError)
    await expect(read).rejects.toThrow('source/default/docs/: is missing')
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

  test.each([
    ['a file', 'source/default/docs/README.md'],
    ['a folder that is not a type', 'source/default/docs/pictures/logo.svg']
  ])('fails on %s outside a type folder', async (_, path) => {
    const reader = memoryReader({ [path]: file, 'source/default/docs/images/a.svg': file })
    const name = path.split('/').slice(0, 4).join('/')
    await expect(readInventory(layers('acme', 'docs'), reader)).rejects.toThrow(
      `${name}: is outside a type folder. A layer holds the folders fonts, icons, images, other`
    )
  })

  test('fails on a raster image without a size, and not on an SVG file', async () => {
    const sprite = memoryReader({ 'source/default/docs/images/sprite.svg': file })
    expect(await readInventory(layers('acme', 'docs'), sprite)).toHaveLength(1)

    const broken = memoryReader({ 'source/default/docs/images/broken@2x.png': file })
    await expect(readInventory(layers('acme', 'docs'), broken)).rejects.toThrow(
      'source/default/docs/images/broken@2x.png: is not an image whose size can be read'
    )
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
      'images/text.png': 'not an image'
    })
    const reader = fsReader(root)
    expect(await reader.size('images/a@2x.png')).toEqual({ width: 200, height: 100 })
    expect(await reader.size('images/b.svg')).toEqual({ width: 24, height: 12 })
    expect(await reader.size('images/sprite.svg')).toBeNull()
    expect(await reader.size('images/text.png')).toBeNull()
  })

  test('says that a file is a Git LFS pointer', async () => {
    const root = await scratch({ 'source/default/docs/images/a.png': LFS_POINTER })
    const read = readInventory(layers('acme', 'docs'), fsReader(root))
    await expect(read).rejects.toThrow(BuildError)
    await expect(read).rejects.toThrow(
      'source/default/docs/images/a.png: is a Git LFS pointer, not the file. ' +
        'Install Git LFS and run `git lfs pull`'
    )
  })

  test('reads a tree from the disk as one from memory', async () => {
    const root = await scratch({
      'source/default/docs/images/home/lego@2x.png': png(200, 100),
      'source/default/docs/icons/cx-sprite.svg': '<svg/>',
      'source/default/docs/.DS_Store': ''
    })
    const assets = await readInventory(layers('acme', 'docs'), fsReader(root))
    expect(assets.map((asset) => asset.id)).toEqual(['icons/cx-sprite', 'images/home/lego'])
    expect(assets[1].files[0]).toMatchObject({ density: 2, bytes: 33, width: 200, height: 100 })
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
