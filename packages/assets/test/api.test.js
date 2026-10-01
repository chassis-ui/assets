/**
 * @file api.test.js
 * @description `ChassisAssets` of `build/api/index.js`, the Programmatic API of the
 *              build-system page, on the fixture and the golden output.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import ChassisAssets from '../build/api/index.js'
import { FIXTURE, GOLDEN, compareDirs, listFiles, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

const api = new ChassisAssets('package.json', { cwd: FIXTURE, out: '../golden' })

describe('ChassisAssets', () => {
  test('reads the configuration and the package', () => {
    expect(api.config.defaults.brandFolder).toBe('default')
    expect(api.packageInfo).toEqual({ name: 'chassis-assets-fixture', version: '0.0.0-fixture' })
  })

  test('fails with the path of a configuration it cannot read', () => {
    expect(() => new ChassisAssets('missing.json', { cwd: FIXTURE })).toThrow(
      /Failed to load configuration from .*missing\.json/
    )
  })

  test('brands, apps and platforms', () => {
    expect(api.getBrands()).toEqual(['alpha', 'beta'])
    expect(api.getApps()).toEqual(['site', 'mobile'])
    expect(api.getPlatforms('site')).toEqual(['web'])
    expect(api.getPlatforms('mobile')).toEqual(['ios', 'android'])
    expect(api.getPlatforms('nope')).toEqual([])
    expect(api.getAllPlatforms()).toEqual(['web', 'ios', 'android'])
  })

  test('the combinations are the jobs of the build', () => {
    expect(api.getCombinations()).toEqual([
      { brand: 'alpha', app: 'site', platform: 'web' },
      { brand: 'alpha', app: 'mobile', platform: 'ios' },
      { brand: 'alpha', app: 'mobile', platform: 'android' },
      { brand: 'beta', app: 'site', platform: 'web' },
      { brand: 'beta', app: 'mobile', platform: 'ios' },
      { brand: 'beta', app: 'mobile', platform: 'android' }
    ])
  })

  test('assetsExist() in source/ and in the output', () => {
    // beta has no folder of its own and falls back to default
    expect(api.assetsExist('beta', 'site')).toBe(true)
    expect(api.assetsExist('alpha', 'nope')).toBe(false)
    expect(api.assetsExist('alpha', 'mobile', 'dist')).toBe(true)
    expect(api.assetsExist('gamma', 'mobile', 'dist')).toBe(false)
  })

  test('getAssetInventory() of the source, default and brand together', () => {
    const inventory = api.getAssetInventory('alpha', 'site')
    expect(inventory).toMatchObject({ brand: 'alpha', app: 'site', platform: null })
    // By the type folder, as the build decides it: the SVG under images/logo/ is an image.
    // An override is listed twice, once from default and once from the brand.
    expect(inventory.fonts).toHaveLength(6)
    expect(inventory.icons.map((a) => a.name).sort()).toEqual([
      'arrow-right.pdf',
      'arrow-right.svg',
      'check_mark.svg',
      'icons.css'
    ])
    expect(inventory.images.map((a) => a.name).sort()).toEqual([
      'HeroBanner.png',
      'alpha-only.png',
      'mark.png',
      'mark.svg',
      'mark.svg',
      'mark@2x.png',
      'mark@3x.png',
      'photo.jpg',
      'photo.webp'
    ])
    expect(inventory.other.map((a) => a.name)).toEqual(['brand.tokens.json'])
  })

  test('getAssetInventory() of an output', () => {
    const inventory = api.getAssetInventory('beta', 'mobile', 'android')
    expect(inventory.fonts.map((a) => a.name).sort()).toEqual([
      'text.otf',
      'text.ttf',
      'text_license.txt'
    ])
    expect(inventory.icons.map((a) => a.name).sort()).toEqual([
      'ic_arrow_right.svg',
      'ic_check_mark.svg',
      'ic_close.svg'
    ])
    expect(inventory.images).toHaveLength(8)
  })

  test('getStats() counts from cwd and out, not from the working directory', () => {
    expect(api.getStats()).toEqual({
      brands: 2,
      apps: 2,
      combinations: 6,
      platforms: 3,
      sourceAssets: listFiles(path.join(FIXTURE, 'source')).length,
      distAssets: listFiles(GOLDEN).length
    })
  })

  test('validate() passes on the fixture', () => {
    expect(api.validate()).toEqual({ valid: true, errors: [], warnings: [] })
  })

  test('validate() reports a missing configuration', () => {
    const root = tempDir()
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ chassis: { defaults: {} } }))
    const result = new ChassisAssets('package.json', { cwd: root }).validate()
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(['No build configuration found'])
  })

  test('validate() warns about a missing default folder', () => {
    const root = tempDir()
    fs.copyFileSync(path.join(FIXTURE, 'package.json'), path.join(root, 'package.json'))
    const result = new ChassisAssets('package.json', { cwd: root }).validate()
    expect(result.valid).toBe(true)
    expect(result.warnings).toContain('Default brand directory not found: source/default')
  })

  test('build() writes the golden output into its out', async () => {
    const out = tempDir()
    const stats = await new ChassisAssets('package.json', { cwd: FIXTURE, out }).build({
      quiet: true
    })
    expect(stats.errors).toEqual([])
    expect(compareDirs(GOLDEN, out)).toEqual({ missing: [], extra: [], changed: [] })
  })

  test('build() takes the filters', async () => {
    const out = tempDir()
    await new ChassisAssets('package.json', { cwd: FIXTURE, out }).build({
      brands: ['beta'],
      platforms: ['ios'],
      quiet: true
    })
    expect(fs.readdirSync(out)).toEqual(['ios'])
    expect(fs.readdirSync(path.join(out, 'ios/mobile'))).toEqual(['beta'])
  })
})
