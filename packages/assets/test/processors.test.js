/**
 * @file processors.test.js
 * @description The platform rules of `build/processors/`: the renaming of each platform, the
 *              resolution indicator, the Android density folders and `ic_` prefix, and the
 *              formats each platform keeps per type. One row per rule of the pages
 *              `build-system.mdx`, `fonts.mdx`, `images.mdx`, `icons.mdx` and
 *              `design-guidelines.mdx`.
 */

import { describe, expect, test } from 'vitest'
import { keepsFile } from '../build/build-assets.js'
import {
  androidProcessor,
  extractResolutionIndicator,
  getPlatformNames,
  getProcessor,
  iosProcessor,
  isAllowedFormat,
  isExcludedFormat,
  platformProcessors,
  webProcessor
} from '../build/processors/index.js'

describe('registry', () => {
  test('has the three platforms of the pages', () => {
    expect(getPlatformNames()).toEqual(['web', 'ios', 'android'])
    expect(getProcessor('web')).toBe(webProcessor)
    expect(getProcessor('ios')).toBe(iosProcessor)
    expect(getProcessor('android')).toBe(androidProcessor)
    expect(getProcessor('windows')).toBeNull()
  })

  test.each(Object.entries(platformProcessors))('%s has a name and renameFile()', (name, p) => {
    expect(p.name).toBe(name)
    expect(typeof p.renameFile).toBe('function')
  })
})

describe('extractResolutionIndicator()', () => {
  test.each([
    ['icon@2x.png', 'icon', '@2x', '.png'],
    ['icon@3x.png', 'icon', '@3x', '.png'],
    ['badge@1.5x.png', 'badge', '@1.5x', '.png'],
    ['icon.png', 'icon', '', '.png'],
    ['my.file@2x.png', 'my.file', '@2x', '.png'],
    // A Figma export number after the indicator: not an indicator to the build
    ['card-top@2x-1.png', 'card-top@2x-1', '', '.png'],
    ['no-extension', 'no-extension', '', '']
  ])('%s', (fileName, base, resolution, ext) => {
    expect(extractResolutionIndicator(fileName)).toEqual({ base, resolution, ext })
  })
})

describe('isAllowedFormat() and isExcludedFormat()', () => {
  test.each([
    ['.woff2', ['.woff2'], true],
    ['.WOFF2', ['.woff2'], true],
    ['.ttf', ['.woff2'], false],
    ['.ttf', [], true],
    ['.ttf', undefined, true]
  ])('isAllowedFormat(%s, %j) is %s', (ext, list, expected) => {
    expect(isAllowedFormat(ext, list)).toBe(expected)
  })

  test.each([
    ['.webp', ['.webp'], true],
    ['.WEBP', ['.webp'], true],
    ['.png', ['.webp'], false],
    ['.png', [], false],
    ['.png', undefined, false]
  ])('isExcludedFormat(%s, %j) is %s', (ext, list, expected) => {
    expect(isExcludedFormat(ext, list)).toBe(expected)
  })
})

describe('web renameFile(): kebab-case, indicator kept', () => {
  test.each([
    ['MyFont@2x.woff2', 'my-font@2x.woff2'],
    ['HeroBanner.png', 'hero-banner.png'],
    ['Alert Window.png', 'alert-window.png'],
    ['Alert Window@2x.png', 'alert-window@2x.png'],
    ['check_mark.svg', 'check-mark.svg'],
    ['a--b__c  d.svg', 'a-b-c-d.svg'],
    ['badge@1.5x.png', 'badge@1.5x.png'],
    ['arrow-right.svg', 'arrow-right.svg'],
    // A dot inside a name becomes a hyphen (known oddity, the consumers read these names)
    ['chassis-icons.min.css', 'chassis-icons-min.css'],
    ['default.tokens.json', 'default-tokens.json'],
    ['card-orientation-top@2x-1.png', 'card-orientation-top-2x-1.png']
  ])('%s → %s', (from, to) => {
    expect(webProcessor.renameFile(from)).toBe(to)
  })
})

describe('iOS renameFile(): snake_case, indicator kept', () => {
  test.each([
    ['MyFont@2x.ttf', 'my_font@2x.ttf'],
    ['HeroBanner.png', 'hero_banner.png'],
    ['Alert Window@2x.png', 'alert_window@2x.png'],
    ['arrow-right.pdf', 'arrow_right.pdf'],
    ['a--b__c  d.svg', 'a_b_c_d.svg'],
    ['badge@3x.png', 'badge@3x.png'],
    ['ic_close.svg', 'ic_close.svg'],
    ['default.tokens.json', 'default_tokens.json']
  ])('%s → %s', (from, to) => {
    expect(iosProcessor.renameFile(from)).toBe(to)
  })
})

describe('Android renameFile(): snake_case, indicator removed, ic_ under icons/', () => {
  test.each([
    ['myImage@2x.png', { currentDir: 'images' }, 'my_image.png'],
    ['HeroBanner.png', { currentDir: 'images' }, 'hero_banner.png'],
    ['badge@1.5x.png', { currentDir: 'drawable-hdpi', parentDir: 'images' }, 'badge.png'],
    ['MyIcon@2x.svg', { currentDir: 'icons' }, 'ic_my_icon.svg'],
    ['arrow-right.svg', { currentDir: 'icons' }, 'ic_arrow_right.svg'],
    ['ic_close.svg', { currentDir: 'icons' }, 'ic_close.svg'],
    ['check_mark.svg', { currentDir: 'svgs', parentDir: 'icons' }, 'ic_check_mark.svg'],
    ['text-regular.ttf', { currentDir: 'fonts' }, 'text_regular.ttf'],
    ['default.tokens.json', { currentDir: 'data' }, 'default_tokens.json'],
    // The legacy form: a boolean that says whether the file is an icon
    ['arrow-right.svg', true, 'ic_arrow_right.svg'],
    ['arrow-right.svg', false, 'arrow_right.svg']
  ])('%s in %j → %s', (from, context, to) => {
    expect(androidProcessor.renameFile(from, context)).toBe(to)
  })
})

describe('Android density folders', () => {
  test.each([
    ['@1x', 'drawable-mdpi'],
    ['@1.5x', 'drawable-hdpi'],
    ['@2x', 'drawable-xhdpi'],
    ['@3x', 'drawable-xxhdpi'],
    ['@4x', 'drawable-xxxhdpi'],
    ['@5x', 'drawable-mdpi'],
    ['', 'drawable-mdpi']
  ])('%s → %s', (resolution, folder) => {
    expect(androidProcessor.getDensityFolder(resolution)).toBe(folder)
  })

  test.each([
    ['hero.png', 'drawable'],
    ['hero@2x.png', 'drawable-xhdpi'],
    ['Hero Banner@3x.png', 'drawable-xxhdpi']
  ])('imageFolder(%s) → %s', (fileName, folder) => {
    expect(androidProcessor.imageFolder(fileName)).toBe(folder)
  })
})

describe('keepsFile(): the formats each platform keeps per type', () => {
  const rows = [
    // Fonts: WOFF, WOFF2 and the stylesheets for the web, TTF and OTF for the apps (D4),
    // and the license files everywhere (D8)
    ['web', 'fonts', 'text.woff', true],
    ['web', 'fonts', 'text.woff2', true],
    ['web', 'fonts', 'TEXT.WOFF2', true],
    ['web', 'fonts', 'text.css', true],
    ['web', 'fonts', 'fonts.scss', true],
    ['web', 'fonts', 'text-license.txt', true],
    ['web', 'fonts', 'text.ttf', false],
    ['web', 'fonts', 'text.otf', false],
    ['web', 'fonts', 'text.eot', false],
    ['ios', 'fonts', 'text.ttf', true],
    ['ios', 'fonts', 'text.otf', true],
    ['ios', 'fonts', 'text-license.txt', true],
    ['ios', 'fonts', 'text.woff2', false],
    ['ios', 'fonts', 'text.css', false],
    ['android', 'fonts', 'text.ttf', true],
    ['android', 'fonts', 'text.otf', true],
    ['android', 'fonts', 'text-license.txt', true],
    ['android', 'fonts', 'text.woff', false],
    ['android', 'fonts', 'text.scss', false],
    // Images: every format, except WebP for iOS. Android gets it (D14)
    ['web', 'images', 'photo.webp', true],
    ['web', 'images', 'photo.png', true],
    ['ios', 'images', 'photo.webp', false],
    ['ios', 'images', 'photo.PNG', true],
    ['ios', 'images', 'photo.jpg', true],
    ['ios', 'images', 'logo.svg', true],
    ['android', 'images', 'photo.webp', true],
    ['android', 'images', 'photo.png', true],
    // Icons: everything for the web, SVG, PDF and PNG for iOS (D15), SVG for Android
    ['web', 'icons', 'icons.woff2', true],
    ['web', 'icons', 'icons.css', true],
    ['web', 'icons', 'arrow.pdf', true],
    ['ios', 'icons', 'arrow.svg', true],
    ['ios', 'icons', 'arrow.pdf', true],
    ['ios', 'icons', 'star.png', true],
    ['ios', 'icons', 'icons.woff2', false],
    ['ios', 'icons', 'icons.css', false],
    ['android', 'icons', 'arrow.svg', true],
    ['android', 'icons', 'arrow.pdf', false],
    ['android', 'icons', 'star.png', false],
    ['android', 'icons', 'icons.woff2', false],
    // Any other folder: every file
    ['web', 'data', 'tokens.json', true],
    ['ios', 'videos', 'intro.mp4', true],
    ['android', 'other', 'photo.webp', true],
    ['android', null, 'anything.bin', true]
  ]

  test.each(rows)('%s %s/%s is kept: %s', (platform, type, fileName, kept) => {
    expect(keepsFile(platformProcessors[platform], type, fileName)).toBe(kept)
  })
})
