/**
 * @file config.js
 * @description Reads the build configuration, `chassis.build` of `package.json` or the
 *              file of `--config`, checks it, and names the key that is wrong.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { BuildError } from './errors.js'
import { DEFAULT_LAYER, OPTIMIZATIONS, PLATFORMS, SHARED_LAYER, SOURCE } from './names.js'
import { optimizations } from './plan.js'

/** @import { Config } from './types.js' */

const KEYS = ['brands', 'apps', 'options']
const NAME = /^[a-z][a-z0-9-]*$/

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks a configuration. It reads no file.
 * @param {unknown} raw - The value of `chassis.build`, or the content of a file.
 * @param {string} file - The file the value comes from, for the messages.
 * @param {string} [prefix] - What comes before a key in a message: `chassis.build.`.
 * @returns {Config} The configuration, with `options` also when the file has none.
 * @throws {BuildError} That names the key, when a value is missing or wrong.
 */
export function checkConfig(raw, file, prefix = '') {
  /** @type {(key: string, message: string) => never} */
  const fail = (key, message) => {
    throw new BuildError(`${file}: ${prefix}${key} ${message}`, { file, rule: 'config' })
  }

  if (!isObject(raw)) {
    throw new BuildError(
      `${file}: ${prefix ? prefix.slice(0, -1) : 'the configuration'} is missing`,
      { file, rule: 'config' }
    )
  }
  for (const key of Object.keys(raw)) {
    if (!KEYS.includes(key)) fail(key, `is not a key of the configuration (${KEYS.join(', ')})`)
  }

  const { brands, apps, options = {} } = raw
  if (!Array.isArray(brands) || brands.length === 0) fail('brands', 'is missing or empty')
  for (const brand of /** @type {unknown[]} */ (brands)) {
    if (typeof brand !== 'string' || !NAME.test(brand)) {
      fail('brands', `has the value ${JSON.stringify(brand)}, which is not a name`)
    }
    if (brand === DEFAULT_LAYER) {
      fail('brands', `names "${DEFAULT_LAYER}", the first layer of every brand, as a brand`)
    }
  }
  const brandList = /** @type {string[]} */ (brands)
  const repeated = brandList.find((brand, index) => brandList.indexOf(brand) !== index)
  if (repeated) fail('brands', `names "${repeated}" twice`)

  if (!isObject(apps) || Object.keys(apps).length === 0) fail('apps', 'is missing or empty')
  for (const [app, platforms] of Object.entries(/** @type {object} */ (apps))) {
    if (!NAME.test(app)) fail(`apps.${app}`, 'is not a name')
    if (app === SHARED_LAYER) {
      fail(`apps.${app}`, `has the name of the folder that every app gets`)
    }
    if (!Array.isArray(platforms) || platforms.length === 0) {
      fail(`apps.${app}`, 'has no platform')
    }
    for (const platform of platforms) {
      if (!PLATFORMS.includes(platform)) {
        fail(
          `apps.${app}`,
          `has the platform ${JSON.stringify(platform)}, which is not one of ${PLATFORMS.join(', ')}`
        )
      }
    }
    if (new Set(platforms).size !== platforms.length) fail(`apps.${app}`, 'names a platform twice')
  }

  if (!isObject(options)) fail('options', 'is not an object')
  const used = new Set(Object.values(/** @type {object} */ (apps)).flat())
  for (const [platform, values] of Object.entries(/** @type {object} */ (options))) {
    if (!used.has(platform)) fail(`options.${platform}`, 'is for a platform that no app uses')
    if (!isObject(values)) fail(`options.${platform}`, 'is not an object')
    for (const key of Object.keys(values)) {
      if (key !== 'optimize') fail(`options.${platform}.${key}`, 'is not an option (optimize)')
    }
    if (optimizations(values.optimize) === null) {
      fail(
        `options.${platform}.optimize`,
        `is not true, false or a list of ${OPTIMIZATIONS.join(', ')}`
      )
    }
  }

  return /** @type {Config} */ ({ brands, apps, options })
}

/**
 * Reads a JSON file.
 * @param {string} file - The path of the file.
 * @param {string} name - The name of the file in a message.
 * @returns {Promise<any>}
 * @throws {BuildError} When the file is missing or does not parse.
 */
async function readJson(file, name) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    throw new BuildError(`${name}: cannot be read (${error.code ?? error.message})`, {
      file: name,
      rule: 'config',
      cause: error
    })
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new BuildError(`${name}: is not JSON (${error.message})`, {
      file: name,
      rule: 'config',
      cause: error
    })
  }
}

/**
 * Reads the version of the package.
 * @param {string} [root] - The folder of `package.json`. The working directory without it.
 * @returns {Promise<string>}
 * @throws {BuildError} When `package.json` cannot be read.
 */
export async function readVersion(root = process.cwd()) {
  const packageJson = await readJson(path.join(root, 'package.json'), 'package.json')
  return String(packageJson.version)
}

/**
 * Loads the version of the package and the build configuration.
 * @param {Object} [options]
 * @param {string} [options.root] - The folder of `package.json` and `source/`. The working
 *   directory without it.
 * @param {string} [options.config] - A JSON file with `brands`, `apps` and `options`,
 *   instead of `chassis.build` of `package.json`.
 * @returns {Promise<{ version: string, config: Config }>}
 * @throws {BuildError} When a file cannot be read, when a key is wrong, or when an app has
 *   no folder in the first layer.
 */
export async function loadConfig({ root = process.cwd(), config: configFile } = {}) {
  const packageJson = await readJson(path.join(root, 'package.json'), 'package.json')
  const config = configFile
    ? checkConfig(await readJson(path.resolve(root, configFile), configFile), configFile)
    : checkConfig(packageJson.chassis?.build, 'package.json', 'chassis.build.')

  const file = configFile ?? 'package.json'
  for (const app of Object.keys(config.apps)) {
    const folder = `${SOURCE}/${DEFAULT_LAYER}/${app}`
    const found = await stat(path.join(root, folder)).catch(() => null)
    if (!found?.isDirectory()) {
      const key = `${configFile ? '' : 'chassis.build.'}apps.${app}`
      throw new BuildError(`${file}: ${key} has no folder ${folder}/`, { file, rule: 'config' })
    }
  }
  return { version: String(packageJson.version), config }
}
