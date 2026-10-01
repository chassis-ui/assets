/**
 * @file asset-types.test.js
 * @description The extension lists and the metadata check of `build/asset-types.js`, which
 *              the validator uses to decide which source files it expects in the output.
 */

import { describe, expect, test } from 'vitest'
import {
  assetTypes,
  getAllValidExtensions,
  getAssetTypeNames,
  getValidExtensions,
  isAssetType,
  isMetadataFile,
  isValidExtension
} from '../build/asset-types.js'

describe('asset types', () => {
  test('fonts, icons and images', () => {
    expect(getAssetTypeNames()).toEqual(['fonts', 'icons', 'images'])
    expect(isAssetType('fonts')).toBe(true)
    expect(isAssetType('videos')).toBe(false)
  })

  test('the stylesheets count as fonts', () => {
    expect(getValidExtensions('fonts')).toEqual([...assetTypes.fonts.extensions, '.css', '.scss'])
    expect(getValidExtensions('images')).toEqual(assetTypes.images.extensions)
    expect(getValidExtensions('videos')).toEqual([])
  })

  test.each([
    ['.woff2', 'fonts', true],
    ['.TTF', 'fonts', true],
    ['.scss', 'fonts', true],
    ['.png', 'fonts', false],
    ['.pdf', 'icons', true],
    ['.webp', 'images', true],
    ['.avif', 'images', true],
    ['.svg', 'images', false],
    ['.mp4', 'videos', false]
  ])('isValidExtension(%s, %s) is %s', (ext, type, expected) => {
    expect(isValidExtension(ext, type)).toBe(expected)
  })

  test('getAllValidExtensions() is sorted and has no duplicates', () => {
    const all = getAllValidExtensions()
    expect(all).toEqual([...new Set(all)].sort())
    expect(all).toContain('.woff2')
    expect(all).toContain('.pdf')
    expect(all).toContain('.webp')
  })
})

describe('isMetadataFile()', () => {
  test.each([
    ['LICENSE', true],
    ['LICENSE.txt', true],
    ['OFL.txt', true],
    ['README.md', true],
    ['FONTLOG.txt', true],
    ['text-license.txt', false],
    ['license-plate.png', false],
    ['logo.png', false]
  ])('%s → %s', (name, expected) => {
    expect(isMetadataFile(name)).toBe(expected)
  })
})
