/**
 * @file cache.test.js
 * @description Tests for the cache of the steps.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { cacheKey, openCache, sha256 } from '../../build/cache.js'
import { listTree, scratch } from './helpers/tree.js'

describe('cacheKey', () => {
  const source = sha256('the bytes of the source')
  const step = { name: 'raster', params: { width: 480, format: 'webp' } }
  const key = cacheKey(source, step, '1.0.0')

  test('is the same for the same source, step and version', () => {
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(
      cacheKey(source, { name: 'raster', params: { format: 'webp', width: 480 } }, '1.0.0')
    ).toBe(key)
  })

  test('changes with the source, the step, a parameter and the version', () => {
    const others = [
      cacheKey(sha256('other bytes'), step, '1.0.0'),
      cacheKey(source, { ...step, name: 'svg' }, '1.0.0'),
      cacheKey(source, { ...step, params: { ...step.params, width: 481 } }, '1.0.0'),
      cacheKey(source, step, '1.0.1')
    ]
    expect(new Set([key, ...others]).size).toBe(5)
  })

  test('counts a step without parameters as one with none', () => {
    expect(cacheKey(source, { name: 'svg' }, '1')).toBe(
      cacheKey(source, { name: 'svg', params: {} }, '1')
    )
  })
})

describe('openCache', () => {
  test('returns what was set, and null for what was not', async () => {
    const folder = await scratch()
    const cache = openCache(`${folder}/.cache/assets`)
    const key = sha256('key')
    expect(await cache.get(key)).toBeNull()

    await cache.set(key, Buffer.from('content'))
    expect(Buffer.from(await cache.get(key)).toString()).toBe('content')
    expect(await listTree(folder)).toEqual([`.cache/assets/${key.slice(0, 2)}/${key}`])
  })
})
