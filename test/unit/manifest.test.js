/**
 * @file manifest.test.js
 * @description Tests for the output manifest.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { BuildError } from '../../build/errors.js'
import {
  buildManifest,
  compareManifests,
  readManifest,
  writeManifest
} from '../../build/manifest.js'
import { scratch } from './helpers/tree.js'

/** @import { ManifestFile } from '../../build/types.js' */

const job = { brand: 'chassis', app: 'docs', platform: /** @type {const} */ ('web') }

/** @type {ManifestFile} */
const image = {
  derived: false,
  source: 'source/default/docs/images/home/lego@2x.png',
  density: 2,
  height: 100,
  width: 200,
  sha256: 'a'.repeat(64),
  bytes: 1234,
  type: 'images',
  path: 'images/home/lego@2x.png'
}

/** @type {ManifestFile} */
const sprite = {
  path: 'icons/cx-sprite.svg',
  type: 'icons',
  bytes: 99,
  sha256: 'b'.repeat(64),
  width: undefined,
  height: undefined,
  density: undefined,
  source: 'source/default/docs/icons/cx-sprite.svg',
  derived: false
}

describe('buildManifest', () => {
  const manifest = buildManifest(job, [image, sprite], '0.2.0')

  test('names the job and the version of the package', () => {
    expect(manifest).toMatchObject({
      version: 1,
      package: '0.2.0',
      brand: 'chassis',
      app: 'docs',
      platform: 'web'
    })
    expect(Object.keys(manifest)).toEqual([
      'version',
      'package',
      'brand',
      'app',
      'platform',
      'files'
    ])
  })

  test('sorts the files by path, and the keys of a file as the contract has them', () => {
    expect(manifest.files.map((file) => file.path)).toEqual([
      'icons/cx-sprite.svg',
      'images/home/lego@2x.png'
    ])
    expect(Object.keys(manifest.files[1])).toEqual([
      'path',
      'type',
      'bytes',
      'sha256',
      'width',
      'height',
      'density',
      'source',
      'derived'
    ])
  })

  test('leaves out what a file does not have', () => {
    expect(Object.keys(manifest.files[0])).toEqual([
      'path',
      'type',
      'bytes',
      'sha256',
      'source',
      'derived'
    ])
  })

  test('has no version of the package in a golden file', () => {
    expect(Object.keys(buildManifest(job, []))).toEqual([
      'version',
      'brand',
      'app',
      'platform',
      'files'
    ])
  })
})

describe('writeManifest and readManifest', () => {
  test('write chassis-assets.json into the folder of the job, and read it', async () => {
    const folder = await scratch()
    const manifest = buildManifest(job, [image, sprite], '0.2.0')
    const file = await writeManifest(manifest, folder)

    expect(file).toBe(`${folder}/chassis-assets.json`)
    expect(await readManifest(folder)).toEqual(manifest)
    expect(await readManifest(file)).toEqual(manifest)
    const text = await readFile(file, 'utf8')
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).toContain('\n  "files": [\n    {\n      "path": "icons/cx-sprite.svg",')
  })

  test('fail on a folder without a manifest, and on another file', async () => {
    const folder = await scratch({ 'other.json': { version: 2, files: [] } })
    await expect(readManifest(folder)).rejects.toThrow(BuildError)
    await expect(readManifest(`${folder}/other.json`)).rejects.toThrow(
      'is not an output manifest of version 1'
    )
  })
})

describe('compareManifests', () => {
  const before = buildManifest(job, [image, sprite])

  test('finds nothing between a manifest and itself', () => {
    expect(compareManifests(before, before)).toEqual({ added: [], removed: [], changed: [] })
  })

  test('finds the files that were added, removed and changed', () => {
    const after = buildManifest(job, [
      { ...image, bytes: 1200, sha256: 'c'.repeat(64) },
      { ...sprite, path: 'icons/sprite.svg' }
    ])
    expect(compareManifests(before, after)).toEqual({
      added: ['icons/sprite.svg'],
      removed: ['icons/cx-sprite.svg'],
      changed: [{ path: 'images/home/lego@2x.png', keys: ['bytes', 'sha256'] }]
    })
  })

  test('compares the keys that it is given', () => {
    const after = buildManifest(job, [{ ...image, source: 'source/example/docs/a.png' }, sprite])
    expect(compareManifests(before, after).changed).toEqual([
      { path: 'images/home/lego@2x.png', keys: ['source'] }
    ])
    expect(compareManifests(before, after, ['bytes', 'sha256']).changed).toEqual([])
  })
})
