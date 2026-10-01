/**
 * @file vector-drawables.test.js
 * @description The `vectorDrawables` option of the build, `--vector-drawables`: the SVG
 *              icons of Android are written as vector drawables, and nothing else changes.
 *              The files of the fixture are lines of text, so each test writes real SVG
 *              files into a copy of it: two icons, and a third without a shape, which is the
 *              case of a file that a vector drawable cannot draw.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { generateAssets } from '../build/build-assets.js'
import { androidProcessor, iosProcessor, webProcessor } from '../build/processors/index.js'
import DistValidator from '../build/validate-assets.js'
import { convertFolder, drawsSomething, loadConverter } from '../build/vector-drawables.js'
import {
  BUILD_CLI,
  compareDirs,
  copyFixture,
  listFiles,
  read,
  removeTempDirs,
  tempDir
} from './helpers.js'

const ARROW = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentcolor" viewBox="0 0 24 24">
  <path d="M4 11H16L11 6L12.5 4.5L20 12L12.5 19.5L11 18L16 13H4Z"/>
</svg>
`

const CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path fill="#ff0000" d="M9 16.2L4.8 12L3.4 13.4L9 19L21 7L19.6 5.6Z"/>
</svg>
`

const ARROW_DRAWABLE = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FF000000"
        android:pathData="M4 11h12l-5-5 1.5-1.5L20 12l-7.5 7.5L11 18l5-5H4Z"/>
</vector>
`

const SHAPELESS = '<svg xmlns="http://www.w3.org/2000/svg"><defs><font id="f"/></defs></svg>\n'

afterAll(removeTempDirs)

/**
 * A copy of the fixture whose `mobile` app has real SVG icons, one without a shape.
 * @returns {string} The root of the copy
 */
function fixtureWithIcons() {
  const root = copyFixture()
  const icons = path.join(root, 'source/default/mobile/icons')
  fs.writeFileSync(path.join(icons, 'arrow-right.svg'), ARROW)
  fs.writeFileSync(path.join(icons, 'svgs/check_mark.svg'), CHECK)
  fs.writeFileSync(path.join(icons, 'ic_close.svg'), SHAPELESS)
  return root
}

/**
 * Build a root into a temporary folder.
 * @param {string} cwd
 * @param {import('../build/build-assets.js').BuildOptions} [options]
 */
async function build(cwd, options = {}) {
  const out = tempDir()
  const stats = await generateAssets({ cwd, quiet: true, ...options, out })
  return { out, stats }
}

describe('the processors', () => {
  test('Android converts the SVG files of icons/ to .xml, the web and iOS convert nothing', () => {
    expect(androidProcessor.vectorDrawables).toEqual({ type: 'icons', from: '.svg', to: '.xml' })
    expect(webProcessor.vectorDrawables).toBeUndefined()
    expect(iosProcessor.vectorDrawables).toBeUndefined()
  })
})

describe('drawsSomething()', () => {
  test.each([
    ['', false],
    ['<vector xmlns:android="http://schemas.android.com/apk/res/android">\n</vector>\n', false],
    [ARROW_DRAWABLE, true]
  ])('%j → %s', (xml, expected) => {
    expect(drawsSomething(xml)).toBe(expected)
  })
})

describe('convertFolder()', () => {
  const conversion = { type: 'icons', from: '.svg', to: '.xml' }

  test('writes each SVG as a vector drawable beside itself and removes it', async () => {
    const dir = tempDir()
    fs.mkdirSync(path.join(dir, 'svgs'))
    fs.writeFileSync(path.join(dir, 'ic_arrow.svg'), ARROW)
    fs.writeFileSync(path.join(dir, 'svgs/ic_check.SVG'), CHECK)
    fs.writeFileSync(path.join(dir, 'ic_arrow.pdf'), 'pdf')

    const result = await convertFolder(dir, conversion, await loadConverter())
    expect(listFiles(dir)).toEqual(['ic_arrow.pdf', 'ic_arrow.xml', 'svgs/ic_check.xml'])
    expect(result.converted).toHaveLength(2)
    expect(result.kept).toEqual([])
    expect(result.failed).toEqual([])
  })

  test('a path without a fill is filled black, for a tint to replace', async () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'ic_arrow.svg'), ARROW)
    await convertFolder(dir, conversion, await loadConverter())
    expect(read(dir, 'ic_arrow.xml')).toBe(ARROW_DRAWABLE)
  })

  test('a fill of the SVG is kept', async () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'ic_check.svg'), CHECK)
    await convertFolder(dir, conversion, await loadConverter())
    expect(read(dir, 'ic_check.xml')).toContain('android:fillColor="#FFFF0000"')
  })

  test('keeps a file that has no shape', async () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'ic_font.svg'), SHAPELESS)
    fs.writeFileSync(path.join(dir, 'ic_empty.svg'), '')

    const result = await convertFolder(dir, conversion, await loadConverter())
    expect(listFiles(dir)).toEqual(['ic_empty.svg', 'ic_font.svg'])
    expect(read(dir, 'ic_font.svg')).toBe(SHAPELESS)
    expect(result.kept.map((file) => path.basename(file)).sort()).toEqual([
      'ic_empty.svg',
      'ic_font.svg'
    ])
  })

  test('reports a file that is no SVG, and goes on', async () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'a.svg'), 'not an SVG')
    fs.writeFileSync(path.join(dir, 'b.svg'), ARROW)
    const result = await convertFolder(dir, conversion, await loadConverter())
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].file).toBe(path.join(dir, 'a.svg'))
    expect(listFiles(dir)).toEqual(['a.svg', 'b.xml'])
  })

  test('does nothing for a missing folder', async () => {
    const result = await convertFolder(path.join(tempDir(), 'none'), conversion, async () => '')
    expect(result).toEqual({ converted: [], kept: [], failed: [] })
  })
})

describe('generateAssets() with vectorDrawables', () => {
  test('changes the icons of the Android jobs and nothing else', async () => {
    const root = fixtureWithIcons()
    const plain = await build(root)
    const converted = await build(root, { vectorDrawables: true })

    const difference = compareDirs(plain.out, converted.out)
    expect(difference.changed).toEqual([])
    expect(difference.missing).toEqual([
      'android/mobile/alpha/icons/ic_arrow_right.svg',
      'android/mobile/alpha/icons/svgs/ic_check_mark.svg',
      'android/mobile/beta/icons/ic_arrow_right.svg',
      'android/mobile/beta/icons/svgs/ic_check_mark.svg'
    ])
    expect(difference.extra).toEqual([
      'android/mobile/alpha/icons/ic_arrow_right.xml',
      'android/mobile/alpha/icons/svgs/ic_check_mark.xml',
      'android/mobile/beta/icons/ic_arrow_right.xml',
      'android/mobile/beta/icons/svgs/ic_check_mark.xml'
    ])
    expect(read(converted.out, 'android/mobile/beta/icons/ic_arrow_right.xml')).toBe(ARROW_DRAWABLE)
  })

  test('counts the files and warns about the one it keeps as SVG', async () => {
    const plain = await build(fixtureWithIcons())
    const { stats } = await build(fixtureWithIcons(), { vectorDrawables: true })
    expect(plain.stats.filesConverted).toBe(0)
    expect(stats.filesConverted).toBe(4)
    expect(stats.filesProcessed).toBe(plain.stats.filesProcessed)
    expect(stats.warnings).toHaveLength(2)
    expect(stats.warnings[0]).toContain('Not converted')
    expect(stats.warnings[0]).toContain(path.join('android/mobile/alpha/icons/ic_close.svg'))
  })

  test('a file that is no SVG fails the build, naming the file', async () => {
    const error = await build(copyFixture(), { vectorDrawables: true }).catch((error) => error)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('Failed to convert')
    expect(error.message).toContain(path.join('android/mobile/alpha/icons/ic_arrow_right.svg'))
  })

  test('the validator passes on the output', async () => {
    const root = fixtureWithIcons()
    const { out } = await build(root, { vectorDrawables: true })
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const ok = await new DistValidator({ cwd: root, out }).runValidation()
    vi.restoreAllMocks()
    expect(ok).toBe(true)
  })

  test('a build of jobs that convert nothing warns and writes the default output', async () => {
    const root = fixtureWithIcons()
    const plain = await build(root, { platforms: ['web', 'ios'] })
    const { out, stats } = await build(root, { platforms: ['web', 'ios'], vectorDrawables: true })
    expect(compareDirs(plain.out, out)).toEqual({ missing: [], extra: [], changed: [] })
    expect(stats.warnings).toEqual([
      '--vector-drawables changes nothing: no selected job has a platform that converts'
    ])
  })

  test('a dry run writes nothing', async () => {
    const out = tempDir()
    const stats = await generateAssets({
      cwd: fixtureWithIcons(),
      quiet: true,
      dryRun: true,
      vectorDrawables: true,
      out
    })
    expect(listFiles(out)).toEqual([])
    expect(stats.filesConverted).toBe(0)
  })
})

describe('pnpm assets --vector-drawables', () => {
  beforeEach(() => vi.restoreAllMocks())

  test('builds the Android icons as vector drawables and prints the count', () => {
    const out = tempDir()
    const result = spawnSync(
      process.execPath,
      [BUILD_CLI, '--cwd', fixtureWithIcons(), '--out', out, '--vector-drawables'],
      { encoding: 'utf-8' }
    )
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('4 files converted to vector drawables')
    expect(listFiles(path.join(out, 'android/mobile/beta/icons'))).toEqual([
      'ic_arrow_right.xml',
      'ic_close.svg',
      'svgs/ic_check_mark.xml'
    ])
  })
})
