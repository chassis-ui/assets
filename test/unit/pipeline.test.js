/**
 * @file pipeline.test.js
 * @description Tests for the pipeline, in a scratch folder: what a job writes, what it
 *              removes, and what the cache saves.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { openCache, sha256 } from '../../build/cache.js'
import { mapLimit } from '../../build/concurrency.js'
import { BuildError } from '../../build/errors.js'
import { runJob } from '../../build/pipeline.js'
import { LFS_POINTER, listTree, png, scratch, writeTree } from './helpers/tree.js'

/** @import { Job, PlannedFile, StepRunner } from '../../build/types.js' */

/** @type {Job} */
const job = {
  brand: 'chassis',
  app: 'docs',
  platform: 'web',
  layers: ['source/default/docs'],
  out: 'dist/web/docs/chassis',
  optimize: []
}

const source = {
  'source/default/docs/images/home/lego@2x.png': png(200, 100),
  'source/default/docs/icons/cx-sprite.svg': '<svg/>'
}

/** @type {PlannedFile[]} */
const copies = [
  {
    path: 'icons/cx-sprite.svg',
    type: 'icons',
    source: 'source/default/docs/icons/cx-sprite.svg'
  },
  {
    path: 'images/home/lego@2x.png',
    type: 'images',
    source: 'source/default/docs/images/home/lego@2x.png',
    width: 200,
    height: 100,
    density: 2
  }
]

/**
 * A step that writes its input in capitals, and counts how often it runs.
 * @param {string} [version]
 * @returns {StepRunner & { runs: number }}
 */
function upperCase(version = '1.0.0') {
  return {
    runs: 0,
    version: () => version,
    async run(input, params) {
      this.runs++
      return Buffer.from(Buffer.from(input).toString().toUpperCase() + (params.suffix ?? ''))
    }
  }
}

/** @type {PlannedFile} */
const derived = {
  path: 'icons/upper.svg',
  type: 'icons',
  source: 'source/default/docs/icons/cx-sprite.svg',
  step: { name: 'upper', params: { suffix: '!' } }
}

describe('runJob', () => {
  test('copies the files into the folder of the job, and reports them', async () => {
    const root = await scratch(source)
    const { report, files } = await runJob(job, copies, { root })

    expect(await listTree(`${root}/dist`)).toEqual([
      'web/docs/chassis/icons/cx-sprite.svg',
      'web/docs/chassis/images/home/lego@2x.png'
    ])
    expect(await readFile(`${root}/dist/web/docs/chassis/images/home/lego@2x.png`)).toEqual(
      png(200, 100)
    )
    expect(report).toMatchObject({
      brand: 'chassis',
      app: 'docs',
      platform: 'web',
      out: 'dist/web/docs/chassis',
      written: 2,
      cached: 0,
      removed: [],
      bytes: 39,
      errors: []
    })
    expect(files).toEqual([
      {
        path: 'icons/cx-sprite.svg',
        type: 'icons',
        bytes: 6,
        sha256: sha256('<svg/>'),
        width: undefined,
        height: undefined,
        density: undefined,
        source: 'source/default/docs/icons/cx-sprite.svg',
        derived: false
      },
      {
        path: 'images/home/lego@2x.png',
        type: 'images',
        bytes: 33,
        sha256: sha256(png(200, 100)),
        width: 200,
        height: 100,
        density: 2,
        source: 'source/default/docs/images/home/lego@2x.png',
        derived: false
      }
    ])
  })

  test('writes into a folder outside the root', async () => {
    const root = await scratch(source)
    const out = await scratch()
    await runJob({ ...job, out: `${out}/web/docs/chassis` }, copies, { root })
    expect(await listTree(out)).toHaveLength(2)
    expect(await listTree(root)).toHaveLength(2)
  })

  test('writes the text of a file that a writer made', async () => {
    const root = await scratch()
    /** @type {PlannedFile} */
    const stylesheet = { path: 'fonts/fonts.css', type: 'fonts', text: '@font-face {}\n' }
    const { files } = await runJob(job, [stylesheet], { root })

    expect(await readFile(`${root}/${job.out}/fonts/fonts.css`, 'utf8')).toBe('@font-face {}\n')
    expect(files[0]).toMatchObject({ bytes: 14, derived: true, source: undefined })
  })

  test('removes what the job does not write, and the folders that are left empty', async () => {
    const root = await scratch({
      ...source,
      'dist/web/docs/chassis/chassis-assets.json': '{}',
      'dist/web/docs/chassis/images/home/lego@2x.png': 'of the build before',
      'dist/web/docs/chassis/images/home/old.png': '',
      'dist/web/docs/chassis/fonts/woff2/text.woff2': '',
      'dist/web/docs/chassis/.DS_Store': '',
      'dist/web/docs/example/images/kept.png': '',
      'dist/ios/demo/chassis/kept.png': ''
    })
    const { report } = await runJob(job, copies, { root })

    expect(report.removed).toEqual(['.DS_Store', 'fonts/woff2/text.woff2', 'images/home/old.png'])
    expect(await listTree(`${root}/dist`)).toEqual([
      'ios/demo/chassis/kept.png',
      'web/docs/chassis/chassis-assets.json',
      'web/docs/chassis/icons/cx-sprite.svg',
      'web/docs/chassis/images/home/lego@2x.png',
      'web/docs/example/images/kept.png'
    ])
    expect(await readFile(`${root}/${job.out}/images/home/lego@2x.png`)).toEqual(png(200, 100))
  })

  test('replaces a file that is there under another case', async () => {
    const root = await scratch({ ...source, 'dist/web/docs/chassis/icons/CX-Sprite.svg': 'old' })
    await runJob(job, copies.slice(0, 1), { root })
    expect(await listTree(`${root}/${job.out}`)).toEqual(['icons/cx-sprite.svg'])
  })

  test('keeps the folder of a job that writes nothing', async () => {
    const root = await scratch({ 'dist/web/docs/chassis/images/old.png': '' })
    const { report } = await runJob(job, [], { root })
    expect(report).toMatchObject({ written: 0, removed: ['images/old.png'] })
    expect(await listTree(`${root}/dist/web/docs`)).toEqual(['chassis/'])
  })

  test('runs a step, and marks its file as derived', async () => {
    const root = await scratch(source)
    const upper = upperCase()
    const { report, files } = await runJob(job, [derived], { root, steps: { upper } })

    expect(await readFile(`${root}/${job.out}/icons/upper.svg`, 'utf8')).toBe('<SVG/>!')
    expect(files[0]).toMatchObject({ bytes: 7, sha256: sha256('<SVG/>!'), derived: true })
    expect(report).toMatchObject({ written: 1, cached: 0 })
    expect(upper.runs).toBe(1)
  })

  test('takes the file of a step from the cache, when nothing changed', async () => {
    const root = await scratch(source)
    const cache = openCache(`${root}/.cache/assets`)
    const upper = upperCase()
    const first = await runJob(job, [derived], { root, steps: { upper }, cache })
    const second = await runJob(job, [derived], { root, steps: { upper }, cache })

    expect(upper.runs).toBe(1)
    expect(first.report.cached).toBe(0)
    expect(second.report).toMatchObject({ written: 1, cached: 1 })
    expect(second.files).toEqual(first.files)
    expect(await readFile(`${root}/${job.out}/icons/upper.svg`, 'utf8')).toBe('<SVG/>!')
  })

  test('runs the step again when the source, a parameter or the tool changes', async () => {
    const root = await scratch(source)
    const cache = openCache(`${root}/.cache/assets`)
    const upper = upperCase()
    await runJob(job, [derived], { root, steps: { upper }, cache })

    await writeTree(root, { 'source/default/docs/icons/cx-sprite.svg': '<svg></svg>' })
    await runJob(job, [derived], { root, steps: { upper }, cache })
    expect(upper.runs).toBe(2)

    const other = { ...derived, step: { name: 'upper', params: { suffix: '?' } } }
    await runJob(job, [other], { root, steps: { upper }, cache })
    expect(upper.runs).toBe(3)

    const newer = upperCase('2.0.0')
    await runJob(job, [other], { root, steps: { upper: newer }, cache })
    expect(newer.runs).toBe(1)
  })

  test('does not put a copy into the cache', async () => {
    const root = await scratch(source)
    await runJob(job, copies, { root, cache: openCache(`${root}/.cache/assets`) })
    expect((await listTree(root)).filter((file) => file.startsWith('.cache'))).toEqual([])
  })

  test('fails on a step that the build does not have', async () => {
    const root = await scratch(source)
    await expect(runJob(job, [derived], { root })).rejects.toThrow(
      'icons/upper.svg: the build has no step "upper"'
    )
  })

  test('names the file and the step that failed', async () => {
    const root = await scratch(source)
    const broken = {
      version: () => '1',
      run: async () => {
        throw new Error('unsupported image format')
      }
    }
    const run = runJob(job, [derived], { root, steps: { upper: broken } })
    await expect(run).rejects.toThrow(BuildError)
    await expect(run).rejects.toMatchObject({
      message:
        'source/default/docs/icons/cx-sprite.svg: the step upper failed (unsupported image format)',
      file: 'source/default/docs/icons/cx-sprite.svg',
      rule: 'upper'
    })
  })

  test('names a source file that is missing', async () => {
    const root = await scratch()
    await expect(runJob(job, copies.slice(0, 1), { root })).rejects.toMatchObject({
      file: 'source/default/docs/icons/cx-sprite.svg',
      rule: 'copy'
    })
  })

  test('says that a file is a Git LFS pointer, and does not copy it', async () => {
    const root = await scratch({ ...source, 'source/default/docs/fonts/text.woff2': LFS_POINTER })
    /** @type {PlannedFile} */
    const font = {
      path: 'fonts/text.woff2',
      type: 'fonts',
      source: 'source/default/docs/fonts/text.woff2'
    }
    await expect(runJob(job, [font], { root })).rejects.toThrow(
      'source/default/docs/fonts/text.woff2: is a Git LFS pointer, not the file'
    )
  })
})

describe('mapLimit', () => {
  test('returns the results in the order of the items', async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const results = await mapLimit([30, 1, 10], 3, async (ms, index) => {
      await wait(ms)
      return `${index}:${ms}`
    })
    expect(results).toEqual(['0:30', '1:1', '2:10'])
    expect(await mapLimit([], 4, async (item) => item)).toEqual([])
  })

  test('runs at most as many calls as its limit at a time', async () => {
    let running = 0
    let most = 0
    await mapLimit(Array.from({ length: 20 }), 4, async () => {
      most = Math.max(most, ++running)
      await new Promise((resolve) => setTimeout(resolve, 1))
      running--
    })
    expect(most).toBe(4)
  })

  test('fails with the first error, and starts no further call', async () => {
    let started = 0
    const run = mapLimit([1, 2, 3, 4, 5, 6], 2, async (item) => {
      started++
      if (item === 2) throw new Error('the second failed')
    })
    await expect(run).rejects.toThrow('the second failed')
    expect(started).toBeLessThan(6)
  })
})
