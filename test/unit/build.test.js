/**
 * @file build.test.js
 * @description Tests for the library, on a tree in a scratch folder: what a build writes,
 *              and that it writes the same twice.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { sha256 } from '../../build/cache.js'
import { BuildError } from '../../build/errors.js'
import { build, plan } from '../../build/index.js'
import { listTree, packageJson, png, scratch, svg, writeTree } from './helpers/tree.js'

const tree = {
  'package.json': packageJson({
    brands: ['chassis', 'example'],
    apps: { docs: ['web'], demo: ['ios', 'android'] }
  }),
  'source/default/shared/images/logo/brand.svg': svg(100, 20),
  'source/default/docs/images/home/lego@2x.png': png(200, 100),
  'source/default/docs/images/home/lego.png': png(100, 50),
  'source/default/docs/images/figma/alert/Alert Window.png': png(10, 10),
  'source/default/docs/icons/cx-sprite.svg': '<svg/>',
  'source/default/docs/fonts/text-normal.otf': 'otf',
  'source/default/docs/fonts/text-normal.woff2': 'woff2',
  'source/default/docs/.DS_Store': '',
  'source/default/demo/images/hero@3x.png': png(300, 150),
  'source/default/demo/fonts/text-normal.otf': 'otf',
  'source/example/shared/images/logo/brand.svg': svg(200, 40)
}

describe('plan', () => {
  test('plans the files of every job, and writes nothing', async () => {
    const root = await scratch(tree)
    const planned = await plan({ root })

    expect(planned).toMatchObject({ ok: true, version: '1.2.3' })
    expect(planned.jobs.map(({ job, files }) => [job.out, files.map((file) => file.path)])).toEqual(
      [
        [
          'dist/web/docs/chassis',
          [
            'fonts/text-normal.woff2',
            'icons/cx-sprite.svg',
            'images/figma/alert/alert-window.png',
            'images/home/lego.png',
            'images/home/lego@2x.png',
            'images/logo/brand.svg'
          ]
        ],
        [
          'dist/ios/demo/chassis',
          ['fonts/text_normal.otf', 'images/hero@3x.png', 'images/logo/brand.svg']
        ],
        [
          'dist/android/demo/chassis',
          [
            'fonts/text_normal.otf',
            'images/drawable-xxhdpi/hero.png',
            'images/logo/drawable/brand.svg'
          ]
        ],
        ['dist/web/docs/example', expect.any(Array)],
        ['dist/ios/demo/example', expect.any(Array)],
        ['dist/android/demo/example', expect.any(Array)]
      ]
    )
    expect((await listTree(root)).filter((file) => file.startsWith('dist'))).toEqual([])
  })

  test('takes the logo of the brand, from its shared layer', async () => {
    const root = await scratch(tree)
    const { jobs } = await plan({ root, platforms: ['web'] })
    const logo = jobs.map(({ files }) => files.find((file) => file.path.endsWith('brand.svg')))
    expect(logo.map((file) => [file.source, file.width])).toEqual([
      ['source/default/shared/images/logo/brand.svg', 100],
      ['source/example/shared/images/logo/brand.svg', 200]
    ])
  })

  test('fails on a configuration that is wrong', async () => {
    const root = await scratch({ 'package.json': packageJson({ brands: [] }) })
    await expect(plan({ root })).rejects.toThrow(BuildError)
  })

  test('reports a job that cannot be planned, and plans the others', async () => {
    const root = await scratch({ ...tree, 'source/default/demo/README.md': '' })
    const planned = await plan({ root, brands: ['chassis'] })
    expect(planned.ok).toBe(false)
    expect(planned.jobs.map(({ job, errors }) => [job.platform, errors.length])).toEqual([
      ['web', 0],
      ['ios', 1],
      ['android', 1]
    ])
    expect(planned.jobs[1].errors[0].message).toContain('is outside a type folder')
  })
})

describe('build', () => {
  test('writes the files and the manifest of a job', async () => {
    const root = await scratch(tree)
    const result = await build({ root, brands: ['chassis'], apps: ['docs'] })

    expect(result).toMatchObject({ ok: true, version: '1.2.3' })
    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({ out: 'dist/web/docs/chassis', written: 6, errors: [] })
    expect(await listTree(`${root}/dist`)).toEqual([
      'web/docs/chassis/chassis-assets.json',
      'web/docs/chassis/fonts/text-normal.woff2',
      'web/docs/chassis/icons/cx-sprite.svg',
      'web/docs/chassis/images/figma/alert/alert-window.png',
      'web/docs/chassis/images/home/lego.png',
      'web/docs/chassis/images/home/lego@2x.png',
      'web/docs/chassis/images/logo/brand.svg'
    ])

    const manifest = JSON.parse(
      await readFile(`${root}/dist/web/docs/chassis/chassis-assets.json`, 'utf8')
    )
    expect(manifest).toMatchObject({
      version: 1,
      package: '1.2.3',
      brand: 'chassis',
      app: 'docs',
      platform: 'web'
    })
    expect(manifest.files).toHaveLength(6)
    expect(manifest.files[4]).toEqual({
      path: 'images/home/lego@2x.png',
      type: 'images',
      bytes: 33,
      sha256: sha256(png(200, 100)),
      width: 200,
      height: 100,
      density: 2,
      source: 'source/default/docs/images/home/lego@2x.png',
      derived: false
    })
    expect(manifest.files[1]).toEqual({
      path: 'icons/cx-sprite.svg',
      type: 'icons',
      bytes: 6,
      sha256: sha256('<svg/>'),
      source: 'source/default/docs/icons/cx-sprite.svg',
      derived: false
    })
  })

  test('writes the same manifest twice, without a date and without the root', async () => {
    const root = await scratch(tree)
    const other = await scratch(tree)
    await build({ root })
    await build({ root: other, out: 'out' })

    for (const job of ['web/docs/example', 'ios/demo/chassis', 'android/demo/example']) {
      const first = await readFile(`${root}/dist/${job}/chassis-assets.json`, 'utf8')
      expect(await readFile(`${other}/out/${job}/chassis-assets.json`, 'utf8')).toBe(first)
      expect(first).not.toContain(root)
    }
  })

  test('keeps the files of the jobs that it does not build', async () => {
    const root = await scratch(tree)
    await build({ root })
    const before = await listTree(`${root}/dist`)

    await writeTree(root, { 'dist/web/docs/chassis/images/old.png': '' })
    const result = await build({ root, brands: ['chassis'], apps: ['docs'] })
    expect(result.jobs[0].removed).toEqual(['images/old.png'])
    expect(await listTree(`${root}/dist`)).toEqual(before)
  })

  test('tells when a job starts and ends', async () => {
    const root = await scratch(tree)
    /** @type {string[]} */
    const calls = []
    await build({
      root,
      brands: ['chassis'],
      onJobStart: (job, index, total) => calls.push(`${index + 1}/${total} ${job.platform}`),
      onJobEnd: (report) => calls.push(`${report.platform} ${report.written}`)
    })
    expect(calls).toEqual(['1/3 web', 'web 6', '2/3 ios', 'ios 3', '3/3 android', 'android 3'])
  })

  test('reports a job that fails, builds the others, and never ends the process', async () => {
    const root = await scratch({
      ...tree,
      'source/default/docs/images/figma/alert/alert-window.png': png(1, 1)
    })
    const result = await build({ root, brands: ['chassis'] })

    expect(result.ok).toBe(false)
    expect(result.jobs.map((report) => [report.platform, report.written])).toEqual([
      ['web', 0],
      ['ios', 3],
      ['android', 3]
    ])
    expect(result.jobs[0].errors[0]).toBeInstanceOf(BuildError)
    expect(result.jobs[0].errors[0]).toMatchObject({ rule: 'collision' })
    expect(await listTree(`${root}/dist`)).not.toContain('web/docs/chassis/chassis-assets.json')
  })
})
