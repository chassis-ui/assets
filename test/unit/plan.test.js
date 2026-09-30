/**
 * @file plan.test.js
 * @description Tests for the plan: the jobs of a configuration, and the files of a job.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { BuildError } from '../../build/errors.js'
import { layers, optimizations, planFiles, planJobs } from '../../build/plan.js'

/** @import { Asset, Config, Job, PlannedFile, Rules } from '../../build/types.js' */

/** @type {Config} */
const config = {
  brands: ['chassis', 'example'],
  apps: { docs: ['web'], demo: ['web', 'ios', 'android'] },
  options: { web: { optimize: ['svg', 'images'] } }
}

const names = (/** @type {Job[]} */ jobs) => jobs.map((job) => job.out)

describe('planJobs', () => {
  test('plans one job per brand, app and platform, in the order of the configuration', () => {
    expect(names(planJobs(config))).toEqual([
      'dist/web/docs/chassis',
      'dist/web/demo/chassis',
      'dist/ios/demo/chassis',
      'dist/android/demo/chassis',
      'dist/web/docs/example',
      'dist/web/demo/example',
      'dist/ios/demo/example',
      'dist/android/demo/example'
    ])
  })

  test('gives a job its four layers, in override order', () => {
    const [job] = planJobs(config, { brands: ['example'], apps: ['demo'], platforms: ['ios'] })
    expect(job).toEqual({
      brand: 'example',
      app: 'demo',
      platform: 'ios',
      layers: [
        'source/default/shared',
        'source/default/demo',
        'source/example/shared',
        'source/example/demo'
      ],
      out: 'dist/ios/demo/example',
      optimize: []
    })
    expect(layers('example', 'demo')).toEqual(job.layers)
  })

  test('takes the jobs that the filters select', () => {
    expect(names(planJobs(config, { brands: ['chassis'], apps: ['docs'] }))).toEqual([
      'dist/web/docs/chassis'
    ])
    expect(names(planJobs(config, { platforms: ['android', 'ios'] }))).toEqual([
      'dist/ios/demo/chassis',
      'dist/android/demo/chassis',
      'dist/ios/demo/example',
      'dist/android/demo/example'
    ])
    expect(planJobs(config, { brands: [], apps: [], platforms: [] })).toHaveLength(8)
  })

  test('fails on a filter value that the configuration does not have', () => {
    expect(() => planJobs(config, { brands: ['chasis'], platforms: ['flutter'] })).toThrow(
      'Unknown filter values: --brand chasis (the configuration has chassis, example); ' +
        '--platform flutter (the configuration has web, ios, android)'
    )
    expect(() => planJobs(config, { apps: ['site'] })).toThrow(BuildError)
  })

  test('fails when the filters select no job', () => {
    expect(() => planJobs(config, { apps: ['docs'], platforms: ['ios'] })).toThrow(
      'The filters select no job'
    )
  })

  test('writes below the root of the output', () => {
    expect(names(planJobs(config, { apps: ['docs'] }, { out: '/tmp/scratch/' }))).toEqual([
      '/tmp/scratch/web/docs/chassis',
      '/tmp/scratch/web/docs/example'
    ])
  })

  test('takes the optimization of the platform from the configuration', () => {
    const jobs = planJobs(config, { brands: ['chassis'], apps: ['demo'] })
    expect(jobs.map((job) => [job.platform, job.optimize])).toEqual([
      ['web', ['images', 'svg']],
      ['ios', []],
      ['android', []]
    ])
  })

  test('lets the command line turn the optimization on or off for every job', () => {
    const on = planJobs(config, { brands: ['chassis'] }, { optimize: true })
    expect(on.every((job) => job.optimize.join() === 'images,svg,fonts')).toBe(true)
    const off = planJobs(config, { brands: ['chassis'] }, { optimize: false })
    expect(off.every((job) => job.optimize.length === 0)).toBe(true)
  })
})

describe('optimizations', () => {
  test('turns a value of optimize into a list', () => {
    expect(optimizations(true)).toEqual(['images', 'svg', 'fonts'])
    expect(optimizations(false)).toEqual([])
    expect(optimizations(undefined)).toEqual([])
    expect(optimizations(['fonts', 'images'])).toEqual(['images', 'fonts'])
  })

  test('returns null for a value that is not valid', () => {
    expect(optimizations('yes')).toBeNull()
    expect(optimizations(['pictures'])).toBeNull()
  })
})

describe('planFiles', () => {
  const [job] = planJobs(config, { brands: ['chassis'], apps: ['docs'] })

  /**
   * An asset with one file, whose name is its path below `images/`.
   * @param {string} name
   * @returns {Asset}
   */
  const asset = (name) => ({
    type: 'images',
    id: `images/${name}`,
    folder: '',
    name,
    files: [
      {
        path: `source/default/docs/images/${name}.png`,
        layer: 'source/default/docs',
        type: 'images',
        folder: '',
        name,
        density: 1,
        extension: '.png',
        bytes: 1
      }
    ]
  })

  /**
   * Rules that copy every file, to a path that the test chooses.
   * @param {(name: string) => string} [pathOf]
   * @param {PlannedFile[]} [extras]
   * @returns {Rules}
   */
  const rules = (pathOf = (name) => `images/${name}.png`, extras = []) => ({
    include: (asset) => asset.name !== 'left-out',
    files: (asset) => [{ path: pathOf(asset.name), type: 'images', source: asset.files[0].path }],
    extras: () => extras
  })

  test('returns the files of the assets that the platform takes, sorted by path', () => {
    const files = planFiles(job, [asset('b'), asset('left-out'), asset('a'), asset('Z')], rules())
    expect(files.map((file) => file.path)).toEqual(['images/Z.png', 'images/a.png', 'images/b.png'])
    expect(files[1]).toEqual({
      path: 'images/a.png',
      type: 'images',
      source: 'source/default/docs/images/a.png'
    })
  })

  test('adds the files that come from all assets', () => {
    /** @type {PlannedFile} */
    const stylesheet = { path: 'fonts/fonts.css', type: 'fonts', text: '@font-face {}' }
    const files = planFiles(job, [asset('a')], rules(undefined, [stylesheet]))
    expect(files.map((file) => file.path)).toEqual(['fonts/fonts.css', 'images/a.png'])
  })

  test('fails when two files would get one path, and names both sources', () => {
    const lower = rules((name) => `images/${name.toLowerCase().replace(' ', '-')}.png`)
    const plan = () =>
      planFiles(job, [asset('Alert Window'), asset('alert-window'), asset('card')], lower)
    expect(plan).toThrow(BuildError)
    expect(plan).toThrow(
      'web/docs/chassis: two files would get one path\n' +
        '  images/alert-window.png: source/default/docs/images/Alert Window.png and ' +
        'source/default/docs/images/alert-window.png'
    )
  })

  test('counts two paths that differ by case as one', () => {
    expect(() => planFiles(job, [asset('Logo'), asset('logo')], rules())).toThrow(
      'two files would get one path'
    )
  })

  test('names a file that the build writes in a collision', () => {
    /** @type {PlannedFile} */
    const written = { path: 'images/a.png', type: 'images', text: '' }
    expect(() => planFiles(job, [asset('a')], rules(undefined, [written]))).toThrow(
      'source/default/docs/images/a.png and the images/a.png that the build writes'
    )
  })

  test.each(['../a.png', '/tmp/a.png', 'images/../../a.png', 'images//a.png', '', 'a\\b.png'])(
    'fails on the path "%s", which leaves the folder of the job',
    (path) => {
      expect(() =>
        planFiles(
          job,
          [asset('a')],
          rules(() => path)
        )
      ).toThrow('is not in the folder of the job')
    }
  )

  test('keeps the output manifest for the build', () => {
    expect(() =>
      planFiles(
        job,
        [asset('a')],
        rules(() => 'chassis-assets.json')
      )
    ).toThrow(BuildError)
  })
})
