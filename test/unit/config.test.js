/**
 * @file config.test.js
 * @description Tests for the configuration: what is accepted, and which key a message
 *              names.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { checkConfig, loadConfig, readVersion } from '../../build/config.js'
import { BuildError } from '../../build/errors.js'
import { packageJson, scratch } from './helpers/tree.js'

const valid = {
  brands: ['chassis', 'example'],
  apps: { docs: ['web'], demo: ['web', 'ios', 'android'] }
}

describe('checkConfig', () => {
  test('returns the configuration, with options', () => {
    expect(checkConfig(valid, 'package.json', 'chassis.build.')).toEqual({ ...valid, options: {} })
  })

  test('accepts the three values of optimize', () => {
    for (const optimize of [true, false, ['images', 'svg']]) {
      const config = checkConfig({ ...valid, options: { web: { optimize } } }, 'build.json')
      expect(config.options.web.optimize).toEqual(optimize)
    }
  })

  test.each([
    ['no configuration', undefined, 'package.json: chassis.build is missing'],
    ['no brands', { apps: valid.apps }, 'chassis.build.brands is missing or empty'],
    ['empty brands', { ...valid, brands: [] }, 'chassis.build.brands is missing or empty'],
    ['a brand named default', { ...valid, brands: ['default'] }, 'chassis.build.brands names'],
    ['a brand twice', { ...valid, brands: ['a', 'a'] }, 'chassis.build.brands names "a" twice'],
    ['a brand with capitals', { ...valid, brands: ['Acme'] }, 'which is not a name'],
    ['no apps', { brands: valid.brands }, 'chassis.build.apps is missing or empty'],
    ['an app named shared', { ...valid, apps: { shared: ['web'] } }, 'chassis.build.apps.shared'],
    ['an app without platform', { ...valid, apps: { docs: [] } }, 'chassis.build.apps.docs has no'],
    [
      'an unknown platform',
      { ...valid, apps: { docs: ['flutter'] } },
      'chassis.build.apps.docs has the platform "flutter"'
    ],
    [
      'options for an unused platform',
      { ...valid, apps: { docs: ['web'] }, options: { ios: { optimize: true } } },
      'chassis.build.options.ios is for a platform that no app uses'
    ],
    [
      'an unknown option',
      { ...valid, options: { web: { minify: true } } },
      'chassis.build.options.web.minify is not an option'
    ],
    [
      'a wrong value of optimize',
      { ...valid, options: { web: { optimize: ['pictures'] } } },
      'chassis.build.options.web.optimize is not true, false or a list'
    ],
    ['an unknown key', { ...valid, themes: ['light'] }, 'chassis.build.themes is not a key']
  ])('fails on %s, and names the key', (_, raw, message) => {
    expect(() => checkConfig(raw, 'package.json', 'chassis.build.')).toThrow(BuildError)
    expect(() => checkConfig(raw, 'package.json', 'chassis.build.')).toThrow(message)
  })

  test('names the file of --config, without the prefix', () => {
    expect(() => checkConfig({ apps: valid.apps }, 'build.json')).toThrow(
      'build.json: brands is missing or empty'
    )
  })
})

describe('loadConfig', () => {
  test('reads chassis.build of package.json from the root it is given', async () => {
    const root = await scratch({
      'package.json': packageJson(),
      'source/default/docs/images/logo.svg': '<svg/>'
    })
    expect(await loadConfig({ root })).toEqual({
      version: '1.2.3',
      config: { brands: ['acme'], apps: { docs: ['web'] }, options: {} }
    })
  })

  test('reads the file of --config instead', async () => {
    const root = await scratch({
      'package.json': packageJson(),
      'build.json': { brands: ['other'], apps: { demo: ['ios'] } },
      'source/default/demo/images/logo.svg': '<svg/>'
    })
    const { config } = await loadConfig({ root, config: 'build.json' })
    expect(config.brands).toEqual(['other'])
  })

  test('fails when an app has no folder in the first layer', async () => {
    const root = await scratch({ 'package.json': packageJson() })
    await expect(loadConfig({ root })).rejects.toThrow(
      'package.json: chassis.build.apps.docs has no folder source/default/docs/'
    )
  })

  test('fails when a file is missing or is not JSON', async () => {
    const root = await scratch({ 'package.json': packageJson(), 'build.json': '{ brands' })
    await expect(loadConfig({ root: `${root}/none` })).rejects.toThrow('package.json: cannot be')
    await expect(loadConfig({ root, config: 'build.json' })).rejects.toThrow('build.json: is not')
    await expect(loadConfig({ root, config: 'none.json' })).rejects.toThrow(BuildError)
  })
})

describe('readVersion', () => {
  test('reads the version without checking the configuration', async () => {
    const root = await scratch({ 'package.json': { version: '0.2.0' } })
    expect(await readVersion(root)).toBe('0.2.0')
  })
})
