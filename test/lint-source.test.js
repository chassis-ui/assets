/**
 * @file lint-source.test.js
 * @description The source lint of `build/lint-source.js`: the naming rules of the
 *              design-guidelines page as a table, the known oddities, and `lintSource()` on
 *              the fixture and on copies of it that break a rule.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest'
import { KNOWN_ODDITIES, checkName, lintSource, matchesPattern } from '../build/lint-source.js'
import { FIXTURE, copyFixture, removeTempDirs } from './helpers.js'

afterAll(removeTempDirs)
afterEach(() => vi.unstubAllEnvs())

describe('checkName()', () => {
  test.each([
    'default/docs/images/hero-background.jpg',
    'default/docs/images/illustration-onboarding-step-1.svg',
    'default/docs/images/logo-light.svg',
    'default/docs/images/hero-image@2x.png',
    'default/docs/images/hero-image@3x.png',
    'default/docs/images/badge@1.5x.png',
    'brand-a/docs/images/logo/mark.svg',
    'default/docs/images/figma/components/card/light/card-orientation-top-2x-1.png',
    'default/docs/fonts/text-license.txt'
  ])('%s keeps the rules', (file) => {
    expect(checkName(file)).toEqual([])
  })

  test.each([
    [
      'default/docs/images/Hero Background.jpg',
      'has the name "Hero Background"',
      'hero-background.jpg'
    ],
    [
      'default/docs/images/hero_background.jpg',
      'has the name "hero_background"',
      'hero-background.jpg'
    ],
    [
      'default/docs/images/hero@background.jpg',
      'has the name "hero@background"',
      'hero-background.jpg'
    ],
    ['default/docs/images/HeroBanner.png', 'has the name "HeroBanner"', 'hero-banner.png'],
    ['default/docs/images/card@2x-1.png', 'has the name "card@2x-1"', 'card-2x-1.png'],
    ['default/docs/images/logo.min.svg', 'has the name "logo.min"', 'logo-min.svg'],
    ['default/docs/images/logo--dark.svg', 'has the name "logo--dark"', 'logo-dark.svg']
  ])('%s', (file, message, suggestion) => {
    const [problem] = checkName(file)
    expect(problem).toContain(message)
    expect(problem).toContain(`such as "${suggestion}"`)
  })

  test.each([
    ['default/docs/images/logo.SVG', 'has the extension .SVG, which is not in lowercase'],
    ['default/docs/images/logo', 'has no extension'],
    ['default/docs/Images/logo.svg', 'the folder "Images" is not of lowercase letters'],
    ['default/docs/images/Logos/logo.svg', 'the folder "Logos" is not of lowercase letters'],
    ['default/docs/logo.svg', 'is not in a type folder'],
    ['default/logo.svg', 'is not in a type folder']
  ])('%s: %s', (file, message) => {
    expect(checkName(file).join('\n')).toContain(message)
  })
})

describe('known oddities', () => {
  test.each([
    ['default/docs/other/default.tokens.json', '*/*/other/default.tokens.json', true],
    [
      'default/demo/icons/icons/chassis-icons.min.css',
      '*/*/icons/icons/chassis-icons.min.css',
      true
    ],
    ['default/docs/other/nested/default.tokens.json', '*/*/other/default.tokens.json', false],
    ['default/docs/images/default.tokens.json', '*/*/other/default.tokens.json', false]
  ])('%s matches %s: %s', (file, pattern, expected) => {
    expect(matchesPattern(file, pattern)).toBe(expected)
  })

  test('each breaks a rule, so that it is worth a warning', () => {
    for (const { pattern } of KNOWN_ODDITIES) {
      expect(checkName(pattern.replaceAll('*', 'default')), pattern).not.toEqual([])
    }
  })
})

describe('lintSource()', () => {
  test('finds the names of the fixture that break the rules', () => {
    const { errors, warnings, files } = lintSource({ cwd: FIXTURE })
    expect(files).toBe(42)
    expect(warnings).toEqual([])
    expect(errors.map((e) => e.file)).toEqual([
      'default/mobile/data/brand.tokens.json',
      'default/mobile/icons/ic_close.svg',
      'default/mobile/icons/svgs/check_mark.svg',
      'default/mobile/images/HeroBanner.png',
      'default/site/data/brand.tokens.json',
      'default/site/icons/svgs/check_mark.svg',
      'default/site/images/HeroBanner.png'
    ])
  })

  test('warns about a known oddity instead of failing', () => {
    const root = copyFixture()
    fs.mkdirSync(path.join(root, 'source/default/site/other'))
    fs.writeFileSync(path.join(root, 'source/default/site/other/default.tokens.json'), '{}')
    const { errors, warnings } = lintSource({ cwd: root })
    expect(errors.map((e) => e.file)).not.toContain('default/site/other/default.tokens.json')
    expect(warnings).toEqual([
      {
        file: 'default/site/other/default.tokens.json',
        message: expect.stringContaining('Kept: a Figma variables export')
      }
    ])
  })

  test('warns about a brand or an app the build does not read', () => {
    const root = copyFixture()
    fs.mkdirSync(path.join(root, 'source/gamma/site/images'), { recursive: true })
    fs.mkdirSync(path.join(root, 'source/alpha/docs/images'), { recursive: true })
    const { warnings } = lintSource({ cwd: root })
    expect(warnings.map((w) => w.file)).toEqual(['alpha/docs/', 'gamma/'])
  })

  test('the ignored files are left out', () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/default/site/images/.DS_Store'), '')
    fs.writeFileSync(path.join(root, 'source/default/site/images/Thumbs.db'), '')
    const before = lintSource({ cwd: FIXTURE })
    expect(lintSource({ cwd: root })).toEqual(before)
  })

  test('a Git LFS pointer is an error, unless allowed', () => {
    vi.stubEnv('CHASSIS_ALLOW_LFS_POINTERS', '')
    const root = copyFixture()
    fs.writeFileSync(
      path.join(root, 'source/default/site/images/pointer.png'),
      'version https://git-lfs.github.com/spec/v1\noid sha256:0\nsize 1\n'
    )
    expect(lintSource({ cwd: root }).errors).toContainEqual({
      file: 'default/site/images/pointer.png',
      message: expect.stringContaining('is a Git LFS pointer')
    })
    const allowed = lintSource({ cwd: root, allowLfsPointers: true })
    expect(allowed.errors.map((e) => e.file)).not.toContain('default/site/images/pointer.png')
  })
})
