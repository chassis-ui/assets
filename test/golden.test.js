/**
 * @file golden.test.js
 * @description Builds the fixture into a temporary folder and requires every file to match
 *              `test/golden/`, the committed output of the six jobs, by path and by content.
 *              A processor that changes a name, a filter that keeps or drops another file, or
 *              a density folder that moves, fails here. To write the baseline again after an
 *              intended change, run `pnpm test:golden` and review the diff of `test/golden/`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { generateAssets } from '../build/build-assets.js'
import { FIXTURE, GOLDEN, compareDirs, listFiles, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

describe('golden output', () => {
  test('the build of the fixture reproduces test/golden/', async () => {
    const out = tempDir()
    await generateAssets({ cwd: FIXTURE, out, quiet: true })
    const { missing, extra, changed } = compareDirs(GOLDEN, out)
    expect({ missing, extra, changed }).toEqual({ missing: [], extra: [], changed: [] })
  })

  test('the baseline has the six jobs', () => {
    const jobs = [
      ...new Set(listFiles(GOLDEN).map((file) => file.split('/').slice(0, 3).join('/')))
    ].sort()
    expect(jobs).toEqual([
      'android/mobile/alpha',
      'android/mobile/beta',
      'ios/mobile/alpha',
      'ios/mobile/beta',
      'web/site/alpha',
      'web/site/beta'
    ])
  })

  test('the baseline has no hidden file and no empty folder', () => {
    const entries = fs.readdirSync(GOLDEN, { recursive: true, withFileTypes: true })
    for (const entry of entries) {
      const file = path.join(entry.parentPath, entry.name)
      expect(entry.name.startsWith('.'), file).toBe(false)
      if (entry.isDirectory()) expect(fs.readdirSync(file).length, file).toBeGreaterThan(0)
    }
  })
})
