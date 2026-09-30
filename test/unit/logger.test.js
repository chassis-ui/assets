/**
 * @file logger.test.js
 * @description Tests for the output of the command line.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { BuildError } from '../../build/errors.js'
import { createLogger, formatBytes, formatDuration } from '../../build/logger.js'

/**
 * A console that keeps what is printed.
 */
function recorder() {
  /** @type {string[]} */
  const lines = []
  const print = (/** @type {string} */ stream) => (/** @type {unknown} */ message) =>
    lines.push(`${stream}: ${message}`)
  return { lines, log: print('log'), warn: print('warn'), error: print('error') }
}

const report = {
  brand: 'chassis',
  app: 'docs',
  platform: /** @type {const} */ ('web'),
  out: 'dist/web/docs/chassis',
  written: 12,
  cached: 0,
  removed: [],
  bytes: 61_200_000,
  ms: 1234,
  errors: []
}

describe('createLogger', () => {
  test('prints what a job did', () => {
    const out = recorder()
    const logger = createLogger({ console: out })
    logger.progress(1, 6, 'web/docs/chassis')
    logger.job(report)
    logger.job({ ...report, cached: 3, removed: ['a.png', 'b.png'] })
    expect(out.lines).toEqual([
      'log: [1/6] web/docs/chassis',
      'log:   ✔︎ dist/web/docs/chassis: 12 files, 61.2 MB (1.23s)',
      'log:   ✔︎ dist/web/docs/chassis: 12 files, 61.2 MB, 3 from the cache, 2 removed (1.23s)'
    ])
  })

  test('prints the files of a dry run, with where they come from', () => {
    const out = recorder()
    createLogger({ console: out }).dryRun([
      {
        job: { out: 'dist/web/demo/chassis' },
        files: [
          { path: 'fonts/fonts.css', type: 'fonts', text: '' },
          { path: 'images/a.png', type: 'images', source: 'source/default/demo/images/a@2x.png' },
          {
            path: 'images/a.webp',
            type: 'images',
            source: 'source/default/demo/images/a@2x.png',
            step: { name: 'raster' }
          }
        ]
      }
    ])
    expect(out.lines).toEqual([
      'log: \n🔍 Dry run - showing 1 job(s) that would run:\n',
      'log:   • dist/web/demo/chassis (3 files)',
      'log:       fonts/fonts.css (written by the build)',
      'log:       images/a.png ← source/default/demo/images/a@2x.png',
      'log:       images/a.webp ← source/default/demo/images/a@2x.png (raster)',
      'log: '
    ])
  })

  test('prints errors only when it is quiet', () => {
    const out = recorder()
    const logger = createLogger({ quiet: true, console: out })
    logger.info('info')
    logger.warn('warn')
    logger.header('header')
    logger.progress(1, 2, 'job')
    logger.job(report)
    logger.divider()
    logger.summary(1, 0, Date.now())
    logger.dryRun([])
    logger.error('Failed: web/docs/chassis', new BuildError('a.png: is not an image'))
    expect(out.lines).toEqual([
      'error: \n❌ Failed: web/docs/chassis',
      'error:    a.png: is not an image'
    ])
  })

  test('prints the stack trace of an error that was not expected, with debug', () => {
    const out = recorder()
    createLogger({ debug: true, console: out }).error('Failed', new TypeError('not a function'))
    expect(out.lines[1]).toBe('error:    TypeError: not a function')
    expect(out.lines[2]).toMatch(/^error:\s+at /)

    const expected = recorder()
    createLogger({ debug: true, console: expected }).error('Failed', new BuildError('a\nb'))
    expect(expected.lines).toEqual(['error: \n❌ Failed', 'error:    a', 'error:    b'])
  })

  test('prints debug messages with debug only', () => {
    const out = recorder()
    createLogger({ debug: false, console: out }).debug('hidden')
    createLogger({ debug: true, console: out }).debug('shown')
    expect(out.lines).toEqual(['log: 🔍 shown'])
  })

  test('prints the summary of a build', () => {
    const out = recorder()
    createLogger({ console: out }).summary(5, 1, Date.now())
    expect(out.lines[1]).toBe('log: \n✅ 5 succeeded, ❌ 1 failed')
    expect(out.lines[2]).toMatch(/^log: ⏱️ {2}Completed in 0\.0\ds\n$/)
  })
})

describe('formats', () => {
  test('write a duration in seconds', () => {
    expect(formatDuration(1234)).toBe('1.23s')
    expect(formatDuration(0)).toBe('0.00s')
  })

  test('write a size in B, kB or MB', () => {
    expect(formatBytes(999)).toBe('999 B')
    expect(formatBytes(1000)).toBe('1.0 kB')
    expect(formatBytes(61_200_000)).toBe('61.2 MB')
  })
})
