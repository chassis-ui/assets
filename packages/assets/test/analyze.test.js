/**
 * @file analyze.test.js
 * @description `AssetAnalyzer` of `build/analyze-assets.js` on the fixture and on the golden
 *              output: the counts per type, platform, app and brand, the filters, and the
 *              duplicate the fixture holds on purpose (F8).
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import AssetAnalyzer, { parseAnalyzerArgs } from '../build/analyze-assets.js'
import { FIXTURE, GOLDEN, listFiles, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

const SOURCE_FILES = listFiles(path.join(FIXTURE, 'source')).length
const GOLDEN_FILES = listFiles(GOLDEN).length

/**
 * @param {Object} [options]
 */
function analyze(options = {}) {
  const analyzer = new AssetAnalyzer({ cwd: FIXTURE, out: '../golden', quiet: true, ...options })
  analyzer.analyze()
  return analyzer.stats
}

describe('AssetAnalyzer', () => {
  test('the fixture is what the counts below assume', () => {
    expect(SOURCE_FILES).toBe(42)
    expect(GOLDEN_FILES).toBe(95)
  })

  test('counts source/ and the output together', () => {
    const stats = analyze()
    expect(stats.totalFiles).toBe(SOURCE_FILES + GOLDEN_FILES)
    expect(stats.platforms).toEqual({ android: 29, ios: 33, web: 33 })
    expect(stats.apps).toEqual({ mobile: 62, site: 33 })
    expect(stats.brands).toEqual({ alpha: 49, beta: 46 })
    expect(stats.fileTypes['.webp']).toBe(2 + 2)
    expect(stats.fileTypes['.woff']).toBe(1 + 2)
    expect(stats.filtered).toBe(false)
  })

  test('without an output, counts source/ only', () => {
    const stats = analyze({ out: path.join(tempDir(), 'missing') })
    expect(stats.totalFiles).toBe(SOURCE_FILES)
    expect(stats.platforms).toEqual({})
  })

  test('finds the duplicate in source/', () => {
    const stats = analyze({ out: path.join(tempDir(), 'missing') })
    expect(stats.duplicatesInSource).toHaveLength(1)
    const [group] = stats.duplicatesInSource
    expect(group.count).toBe(2)
    expect(
      group.paths.map((p) => path.relative(FIXTURE, p).split(path.sep).join('/')).sort()
    ).toEqual([
      'source/default/mobile/images/logo/mark.svg',
      'source/default/site/images/logo/mark.svg'
    ])
  })

  test('finds a duplicate it did not know about', () => {
    const root = tempDir()
    fs.cpSync(FIXTURE, root, { recursive: true })
    fs.copyFileSync(
      path.join(root, 'source/default/site/images/photo.jpg'),
      path.join(root, 'source/default/site/images/photo-copy.jpg')
    )
    const stats = analyze({ cwd: root, out: 'missing' })
    expect(stats.duplicatesInSource).toHaveLength(2)
  })

  test('finds the copies between jobs in the output', () => {
    const stats = analyze()
    // Every file beta shares with alpha is a copy, and so is every file iOS and Android share
    expect(stats.duplicatesInDist.length).toBeGreaterThan(0)
    const tokens = stats.duplicatesInDist.find((group) => group.file === 'brand_tokens.json')
    expect(tokens.count).toBe(4)
  })

  test.each([
    [{ platforms: ['web'] }, { web: 33 }],
    [{ platforms: ['ios', 'android'] }, { android: 29, ios: 33 }],
    [{ brands: ['beta'] }, { android: 14, ios: 16, web: 16 }],
    [
      { apps: ['mobile'], brands: ['alpha'] },
      { android: 15, ios: 17 }
    ]
  ])('filters %j', (filters, platforms) => {
    const stats = analyze(filters)
    expect(stats.platforms).toEqual(platforms)
    expect(stats.filtered).toBe(true)
    const outputFiles = Object.values(platforms).reduce((a, b) => a + b, 0)
    expect(stats.totalFiles).toBe(SOURCE_FILES + outputFiles)
  })

  test.each([
    [0, '0 Bytes'],
    [512, '512 Bytes'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [1073741824, '1 GB']
  ])('formatBytes(%d) is %s', (bytes, text) => {
    expect(new AssetAnalyzer({ cwd: FIXTURE, quiet: true }).formatBytes(bytes)).toBe(text)
  })
})

describe('parseAnalyzerArgs()', () => {
  test('reads the filters, --out, --cwd and --quiet', () => {
    expect(
      parseAnalyzerArgs([
        '--brand',
        'a',
        'b',
        '--platform',
        'web',
        '--out',
        'x',
        '--cwd',
        'y',
        '--quiet'
      ])
    ).toEqual({
      brands: ['a', 'b'],
      apps: [],
      platforms: ['web'],
      out: 'x',
      cwd: 'y',
      quiet: true,
      help: false
    })
  })

  test('--help and -h ask for the help', () => {
    expect(parseAnalyzerArgs(['--help']).help).toBe(true)
    expect(parseAnalyzerArgs(['-h']).help).toBe(true)
  })

  test.each([
    [['--out'], '--out needs a value'],
    [['--nope'], 'Unknown option --nope']
  ])('%j fails', (argv, message) => {
    expect(() => parseAnalyzerArgs(argv)).toThrow(message)
  })
})
