/**
 * @file watch.test.js
 * @description The watch of the build, `--watch`: a first build, then a build of the jobs
 *              of a brand and an app when a file of theirs under `source/` changes. Each
 *              test watches a copy of the fixture, changes files in it and waits for the
 *              build that follows.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { afterAll, afterEach, describe, expect, test } from 'vitest'
import { loadConfig, planJobs } from '../build/build-assets.js'
import { createFileFilter } from '../build/filters.js'
import { affectedJobs, isRelevant, watchAssets } from '../build/watch.js'
import {
  BUILD_CLI,
  FIXTURE,
  GOLDEN,
  copyFixture,
  listFiles,
  read,
  removeTempDirs,
  tempDir
} from './helpers.js'

const LFS_POINTER = `version https://git-lfs.github.com/spec/v1
oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393
size 12345
`

/** @param {import('../build/types.js').Job[]} jobs */
const names = (jobs) => jobs.map((job) => `${job.platform}/${job.app}/${job.brand}`)

/** The watches of a test, closed after it. @type {Array<{ close: () => Promise<void> }>} */
const watches = []

afterEach(async () => {
  while (watches.length > 0) await watches.pop()?.close()
})
afterAll(removeTempDirs)

/**
 * Watch a copy of the fixture.
 * @param {import('../build/build-assets.js').BuildOptions} [options]
 * @returns {Promise<{ root: string, out: string, next: () => Promise<{ jobs: string[], changed?: string[], error?: Error }> }>}
 *   The root, the output, and `next()`, which resolves with the next build or its error
 */
async function watchFixture(options = {}) {
  // The real path: the system names the folder of a change by it
  const root = fs.realpathSync(copyFixture())
  const out = tempDir()
  /** @type {Array<{ jobs: string[], changed?: string[], error?: Error }>} */
  const builds = []
  /** @type {Array<(build: { jobs: string[], changed?: string[], error?: Error }) => void>} */
  const waiting = []
  let changed
  /** @param {{ jobs: string[], error?: Error }} build */
  const push = (build) => {
    const waiter = waiting.shift()
    if (waiter) waiter({ ...build, changed })
    else builds.push({ ...build, changed })
  }

  watches.push(
    await watchAssets(
      { cwd: root, out, quiet: true, ...options },
      {
        onChange: (paths) => (changed = paths),
        onBuild: (_stats, jobs) => push({ jobs: names(jobs) }),
        onError: (error, jobs) => push({ jobs: names(jobs), error })
      }
    )
  )
  // The watcher of the system needs a moment before it reports
  await new Promise((resolve) => setTimeout(resolve, 100))
  const next = () => {
    const build = builds.shift()
    return build ? Promise.resolve(build) : new Promise((resolve) => waiting.push(resolve))
  }
  return { root, out, next }
}

describe('affectedJobs()', () => {
  const config = loadConfig(FIXTURE)
  const jobs = planJobs(config)

  test.each([
    ['default/site/images/photo.jpg', ['web/site/alpha', 'web/site/beta']],
    ['alpha/site/images/logo/mark.svg', ['web/site/alpha']],
    ['beta/mobile/fonts/text.ttf', ['ios/mobile/beta', 'android/mobile/beta']],
    [
      'default/mobile',
      ['ios/mobile/alpha', 'android/mobile/alpha', 'ios/mobile/beta', 'android/mobile/beta']
    ],
    ['alpha', ['web/site/alpha', 'ios/mobile/alpha', 'android/mobile/alpha']],
    ['gamma/site/images/photo.jpg', []],
    ['default/shop/images/photo.jpg', []]
  ])('%s → %j', (relative, expected) => {
    expect(names(affectedJobs(config, jobs, relative))).toEqual(expected)
  })

  test('a change without a name is a change of every job', () => {
    expect(affectedJobs(config, jobs, '')).toEqual(jobs)
  })

  test('only the jobs of the run', () => {
    const web = planJobs(config, { platforms: ['web'] })
    expect(names(affectedJobs(config, web, 'default/mobile/images/badge.png'))).toEqual([])
  })
})

describe('isRelevant()', () => {
  const all = createFileFilter()

  test.each([
    ['default/site/images/photo.jpg', true],
    ['default/site/images', true],
    ['default/site/.DS_Store', false],
    ['default/site/images/.hidden/photo.jpg', false],
    ['default/site/images/photo.jpg~', false],
    ['default/site/images/photo.tmp', false]
  ])('%s → %s', (relative, expected) => {
    expect(isRelevant(relative, all)).toBe(expected)
  })

  test('the file filters of the run leave a change out', () => {
    const filter = createFileFilter({ types: ['images'], include: ['images/logo'] })
    expect(isRelevant('default/site/images/logo/mark.svg', filter)).toBe(true)
    expect(isRelevant('default/site/images/photo.jpg', filter)).toBe(false)
    expect(isRelevant('default/site/fonts/text.woff2', filter)).toBe(false)
    expect(isRelevant('default/site/fonts', filter)).toBe(false)
    // A folder is taken as it is
    expect(isRelevant('default/site/images/logo', filter)).toBe(true)
  })
})

describe('watchAssets()', () => {
  test('builds first, as a build does', async () => {
    const { out } = await watchFixture()
    expect(listFiles(out)).toEqual(listFiles(GOLDEN))
  })

  test('a change in the default brand builds the jobs of the app for every brand', async () => {
    const { root, out, next } = await watchFixture()
    fs.writeFileSync(path.join(root, 'source/default/mobile/images/badge.png'), 'a new badge')

    const build = await next()
    expect(build.jobs).toEqual([
      'ios/mobile/alpha',
      'android/mobile/alpha',
      'ios/mobile/beta',
      'android/mobile/beta'
    ])
    expect(build.changed).toEqual(['default/mobile/images/badge.png'])
    expect(read(out, 'ios/mobile/beta/images/badge.png')).toBe('a new badge')
    expect(read(out, 'android/mobile/alpha/images/drawable/badge.png')).toBe('a new badge')
  })

  test('a change in a brand builds the jobs of that brand', async () => {
    const { root, out, next } = await watchFixture()
    fs.writeFileSync(path.join(root, 'source/alpha/site/images/logo/mark.svg'), 'a new mark')

    expect((await next()).jobs).toEqual(['web/site/alpha'])
    expect(read(out, 'web/site/alpha/images/logo/mark.svg')).toBe('a new mark')
    expect(read(out, 'web/site/beta/images/logo/mark.svg')).toBe(
      read(GOLDEN, 'web/site/beta/images/logo/mark.svg')
    )
  })

  test('a new file is in the output, and a file that is removed is gone from it', async () => {
    const { root, out, next } = await watchFixture()
    fs.writeFileSync(path.join(root, 'source/default/site/images/NewImage.png'), 'new')
    fs.rmSync(path.join(root, 'source/default/site/images/photo.jpg'))

    const build = await next()
    expect(build.jobs).toEqual(['web/site/alpha', 'web/site/beta'])
    expect(listFiles(path.join(out, 'web/site/beta/images'))).toEqual([
      'hero-banner.png',
      'logo/mark.png',
      'logo/mark.svg',
      'logo/mark@2x.png',
      'logo/mark@3x.png',
      'new-image.png',
      'photo.webp'
    ])
    // The jobs of the other app are as they were
    expect(listFiles(path.join(out, 'ios'))).toEqual(listFiles(path.join(GOLDEN, 'ios')))
  })

  test('changes that come together are one build', async () => {
    const { root, next } = await watchFixture()
    for (const name of ['a.png', 'b.png', 'c.png']) {
      fs.writeFileSync(path.join(root, 'source/default/site/images', name), name)
    }
    const build = await next()
    expect(build.changed).toEqual([
      'default/site/images/a.png',
      'default/site/images/b.png',
      'default/site/images/c.png'
    ])
  })

  test('a file of the ignore list builds nothing', async () => {
    const { root, next } = await watchFixture()
    fs.writeFileSync(path.join(root, 'source/default/site/.DS_Store'), '')
    fs.writeFileSync(path.join(root, 'source/default/site/images/photo.jpg~'), '')
    await new Promise((resolve) => setTimeout(resolve, 400))
    fs.writeFileSync(path.join(root, 'source/alpha/site/images/marker.png'), 'marker')

    // The next build is that of the marker: the two files before it started none
    const build = await next()
    expect(build.changed).toEqual(['alpha/site/images/marker.png'])
    expect(build.jobs).toEqual(['web/site/alpha'])
  })

  test('watches the jobs of its filters only', async () => {
    const { root, next } = await watchFixture({ brands: ['beta'], platforms: ['web'] })
    fs.writeFileSync(path.join(root, 'source/default/mobile/images/badge.png'), 'ignored')
    fs.writeFileSync(path.join(root, 'source/alpha/site/images/alpha-only.png'), 'ignored')
    await new Promise((resolve) => setTimeout(resolve, 400))
    fs.writeFileSync(path.join(root, 'source/default/site/images/photo.jpg'), 'watched')

    const build = await next()
    expect(build.changed).toEqual(['default/site/images/photo.jpg'])
    expect(build.jobs).toEqual(['web/site/beta'])
  })

  test('a build that fails is reported, and the watch goes on', async () => {
    const { root, out, next } = await watchFixture()
    const file = path.join(root, 'source/default/site/images/photo.jpg')
    fs.writeFileSync(file, LFS_POINTER)

    const failed = await next()
    expect(failed.error?.message).toContain('Git LFS pointers')
    expect(failed.jobs).toEqual(['web/site/alpha', 'web/site/beta'])

    fs.writeFileSync(file, 'a photo again')
    const build = await next()
    expect(build.error).toBeUndefined()
    expect(read(out, 'web/site/alpha/images/photo.jpg')).toBe('a photo again')
  })

  test('close() stops the watch', async () => {
    const { root, out } = await watchFixture()
    await watches[0].close()
    fs.writeFileSync(path.join(root, 'source/default/site/images/photo.jpg'), 'after the end')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(read(out, 'web/site/alpha/images/photo.jpg')).toBe(
      read(GOLDEN, 'web/site/alpha/images/photo.jpg')
    )
  })

  test('fails when the first build fails, and with a dry run', async () => {
    await expect(
      watchAssets({ cwd: FIXTURE, out: tempDir(), quiet: true, brands: ['gamma'] })
    ).rejects.toThrow('Unknown brand "gamma"')
    await expect(
      watchAssets({ cwd: FIXTURE, out: tempDir(), quiet: true, dryRun: true })
    ).rejects.toThrow('--watch writes the output')
  })
})

describe('pnpm assets --watch', () => {
  test('builds, says that it watches, and builds again on a change', async () => {
    const root = fs.realpathSync(copyFixture())
    const out = tempDir()
    const child = spawn(process.execPath, [
      BUILD_CLI,
      '--cwd',
      root,
      '--out',
      out,
      '--watch',
      '--quiet'
    ])
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    /** @param {string} text */
    const printed = (text) =>
      new Promise((resolve, reject) => {
        const started = Date.now()
        const timer = setInterval(() => {
          if (output.includes(text)) {
            clearInterval(timer)
            resolve(undefined)
          } else if (Date.now() - started > 10000) {
            clearInterval(timer)
            reject(new Error(`"${text}" was not printed. Output:\n${output}`))
          }
        }, 25)
      })

    try {
      await printed('Watching source/ for changes')
      await new Promise((resolve) => setTimeout(resolve, 100))
      fs.writeFileSync(path.join(root, 'source/alpha/site/images/alpha-only.png'), 'changed')
      await printed('✅ Built web/site/alpha: ')
      expect(output).toContain('🔄 Changed: alpha/site/images/alpha-only.png')
      expect(output).toContain('Building web/site/alpha')
      expect(read(out, 'web/site/alpha/images/alpha-only.png')).toBe('changed')
    } finally {
      child.kill()
    }
  }, 20000)
})
