/**
 * @file build.test.js
 * @description Tests for the library, on a tree in a scratch folder: what a build writes,
 *              that it writes the same twice, what the lint finds, and what `verify`
 *              checks.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { readFile } from 'node:fs/promises'
import { describe, expect, test } from 'vitest'
import { sha256 } from '../../build/cache.js'
import { CONTRACT, expand } from '../../build/contract.js'
import { BuildError } from '../../build/errors.js'
import { build, lint, plan, verify } from '../../build/index.js'
import { listTree, packageJson, png, scratch, svg, writeTree } from './helpers/tree.js'

const tree = {
  'package.json': packageJson({
    brands: ['chassis', 'example'],
    apps: { docs: ['web'], demo: ['ios', 'android'] }
  }),
  'source/default/shared/images/logo/brand.svg': svg(100, 20),
  'source/default/docs/images/images.json': {
    version: 1,
    rules: [{ match: 'home/lego', committed: true }]
  },
  'source/default/docs/images/home/lego@2x.png': png(200, 100),
  'source/default/docs/images/home/lego.png': png(100, 50),
  'source/default/docs/images/figma/alert/alert-window.png': png(10, 10),
  'source/default/docs/icons/cx-sprite.svg': '<svg/>',
  'source/default/docs/.DS_Store': '',
  'source/default/demo/images/hero@3x.png': png(300, 150),
  'source/default/demo/fonts/fonts.json': {
    version: 1,
    families: [
      {
        id: 'text',
        family: 'Inter',
        license: 'licenses/inter.txt',
        faces: [{ file: 'text-normal.otf', weight: 400, style: 'normal' }]
      }
    ]
  },
  'source/default/demo/fonts/text-normal.otf': 'otf',
  'source/default/demo/fonts/licenses/inter.txt': 'OFL',
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
            'icons/cx-sprite.svg',
            'images/figma/alert/alert-window.png',
            'images/home/lego.png',
            'images/home/lego@2x.png',
            'images/logo/brand.svg'
          ]
        ],
        [
          'dist/ios/demo/chassis',
          [
            'fonts/text_normal.otf',
            'images/hero@3x.png',
            'images/logo/brand.svg',
            'licenses/inter.txt'
          ]
        ],
        [
          'dist/android/demo/chassis',
          [
            'fonts/text_normal.otf',
            'images/drawable-xxhdpi/hero.png',
            'images/logo/drawable/brand.svg',
            'licenses/inter.txt'
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

  test('plans the variants that a rule derives, each with its step', async () => {
    const root = await scratch({
      ...tree,
      'source/default/docs/images/images.json': {
        version: 1,
        rules: [{ match: 'home/lego', densities: [1, 2], formats: ['png', 'webp'] }]
      },
      'source/default/docs/images/home/lego.png': undefined
    })
    const { jobs } = await plan({ root, brands: ['chassis'], apps: ['docs'] })
    const lego = jobs[0].files.filter((file) => file.path.startsWith('images/home/'))
    expect(lego.map((file) => [file.path, file.step?.name, file.width])).toEqual([
      ['images/home/lego.png', 'raster', 100],
      ['images/home/lego.webp', 'raster', 100],
      ['images/home/lego@2x.png', undefined, 200],
      ['images/home/lego@2x.webp', 'raster', 200]
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
    expect(result.jobs[0]).toMatchObject({ out: 'dist/web/docs/chassis', written: 5, errors: [] })
    expect(await listTree(`${root}/dist`)).toEqual([
      'web/docs/chassis/chassis-assets.json',
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
    expect(manifest.files).toHaveLength(5)
    expect(manifest.files[3]).toEqual({
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
    expect(manifest.files[0]).toEqual({
      path: 'icons/cx-sprite.svg',
      type: 'icons',
      bytes: 6,
      sha256: sha256('<svg/>'),
      source: 'source/default/docs/icons/cx-sprite.svg',
      derived: false
    })
  })

  test('writes the licenses of the fonts into every output that holds them', async () => {
    const root = await scratch(tree)
    await build({ root, brands: ['chassis'], apps: ['demo'] })
    expect(await listTree(`${root}/dist/ios`)).toEqual([
      'demo/chassis/chassis-assets.json',
      'demo/chassis/fonts/text_normal.otf',
      'demo/chassis/images/hero@3x.png',
      'demo/chassis/images/logo/brand.svg',
      'demo/chassis/licenses/inter.txt'
    ])
    expect(await readFile(`${root}/dist/android/demo/chassis/licenses/inter.txt`, 'utf8')).toBe(
      'OFL'
    )
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
    expect(calls).toEqual(['1/3 web', 'web 5', '2/3 ios', 'ios 4', '3/3 android', 'android 4'])
  })

  test('reports a job that fails, builds the others, and never ends the process', async () => {
    // Two names that iOS and Android write as one
    const root = await scratch({
      ...tree,
      'source/default/demo/images/hero_3.png': png(1, 1),
      'source/default/demo/images/hero-3.png': png(1, 1)
    })
    const result = await build({ root, brands: ['chassis'], platforms: ['web', 'ios'] })

    expect(result.ok).toBe(false)
    expect(result.jobs.map((report) => [report.platform, report.written])).toEqual([
      ['web', 5],
      ['ios', 0]
    ])
    expect(result.jobs[1].errors[0]).toBeInstanceOf(BuildError)
    expect(result.jobs[1].errors[0]).toMatchObject({ rule: 'collision' })
    expect(await listTree(`${root}/dist`)).not.toContain('ios/demo/chassis/chassis-assets.json')
  })

  test('fails a job whose rule derives, until the build has the step', async () => {
    const root = await scratch({
      ...tree,
      'source/default/demo/images/images.json': {
        version: 1,
        rules: [{ match: 'hero', platforms: ['web', 'ios', 'android'] }]
      },
      'source/default/docs/images/images.json': {
        version: 1,
        rules: [{ match: 'figma/**', formats: ['webp'] }]
      }
    })
    const result = await build({ root, brands: ['chassis'], apps: ['docs'] })
    expect(result.jobs[0].errors[0].message).toContain('the build has no step "raster"')
  })
})

describe('lint', () => {
  test('finds nothing in a source that follows the contract', async () => {
    const root = await scratch(tree)
    expect(await lint({ root })).toEqual({ ok: true, files: 9, problems: [] })
  })

  test('returns the problems of the source, and writes nothing', async () => {
    const root = await scratch({
      ...tree,
      'source/default/docs/images/Alert Window.png': png(1, 1),
      'source/default/demo/fonts/text.css': '@font-face {}',
      'source/acme/docs/images/logo.svg': svg(1, 1)
    })
    const before = await listTree(root)
    const result = await lint({ root })

    expect(result.ok).toBe(false)
    expect(result.problems.map(({ rule, file }) => [rule, file])).toEqual([
      ['reserved-names', 'source/acme/'],
      ['no-generated-file', 'source/default/demo/fonts/text.css'],
      ['names', 'source/default/docs/images/Alert Window.png']
    ])
    expect(await listTree(root)).toEqual(before)
  })

  test('fails on a configuration that is wrong', async () => {
    const root = await scratch({ 'package.json': packageJson({ brands: [] }) })
    await expect(lint({ root })).rejects.toThrow(BuildError)
  })
})

describe('verify', () => {
  /** The files of the consumer contract, in the docs app of a tree. */
  const contract = Object.fromEntries(
    [
      ...CONTRACT.flatMap(({ files }) => files.flatMap(expand)),
      ...expand('images/figma/components/alert/{light,dark}/alert-window{,@2x}.png')
    ].map((path) => [
      path.startsWith('images/logo/')
        ? `source/default/shared/${path}`
        : `source/default/docs/${path}`,
      path.endsWith('.svg') ? svg(10, 10) : png(10, 10)
    ])
  )
  const complete = {
    ...tree,
    ...contract,
    'source/default/docs/images/images.json': {
      version: 1,
      rules: [{ match: '**', committed: true }]
    }
  }

  test('builds into a scratch folder, and leaves the root as it was', async () => {
    const root = await scratch(complete)
    const before = await listTree(root)
    const result = await verify({ root })

    expect(result.ok).toBe(true)
    expect(result.jobs).toHaveLength(6)
    expect(result.contract).toEqual({ checked: true, missing: [] })
    expect(await listTree(root)).toEqual(before)
  })

  test('fails when the docs output lacks a file of the consumer contract', async () => {
    const root = await scratch({
      ...complete,
      'source/default/docs/images/social-image.png': undefined,
      'source/default/docs/images/home/comp-gallery-dark-small@2x.webp': undefined
    })
    const result = await verify({ root, brands: ['chassis'], apps: ['docs'] })

    expect(result.ok).toBe(false)
    expect(result.jobs[0].errors).toEqual([])
    expect(result.contract.missing.map((file) => file.path)).toEqual([
      'images/home/comp-gallery-dark-small@2x.webp',
      'images/social-image.png'
    ])
  })

  test('does not check the contract when the filters leave its job out', async () => {
    const root = await scratch(tree)
    const result = await verify({ root, apps: ['demo'] })
    expect(result).toMatchObject({ ok: true, contract: { checked: false, missing: [] } })
  })

  test('keeps the build in the folder of out', async () => {
    const root = await scratch(tree)
    const result = await verify({ root, out: 'checked', brands: ['chassis'], apps: ['docs'] })
    expect(result.ok).toBe(false)
    expect(result.contract.missing.length).toBeGreaterThan(40)
    expect(await listTree(`${root}/checked`)).toHaveLength(6)
  })
})
