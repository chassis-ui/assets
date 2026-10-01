/**
 * @file filters.test.js
 * @description The file filters of the build, `--type` and `--include`, and `pnpm assets:lfs`,
 *              which prints the Git LFS paths of a build with the same filters.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterAll, describe, expect, test } from 'vitest'
import { generateAssets } from '../build/build-assets.js'
import { compileInclude, coverPaths, createFileFilter } from '../build/filters.js'
import { lfsInclude } from '../build/lfs-include.js'
import {
  CLI,
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

afterAll(removeTempDirs)

/**
 * Build the fixture into a temporary folder.
 * @param {import('../build/build-assets.js').BuildOptions} [options]
 */
async function build(options = {}) {
  const out = tempDir()
  const stats = await generateAssets({ cwd: FIXTURE, quiet: true, ...options, out })
  return { out, stats }
}

describe('compileInclude()', () => {
  test.each([
    // A file by its path
    ['icons/cx-sprite.svg', 'icons/cx-sprite.svg', true],
    ['icons/cx-sprite.svg', 'icons/cx-sprite.svg.bak', false],
    ['icons/cx-sprite.svg', 'more/icons/cx-sprite.svg', false],
    // A folder by its name, with or without the slash
    ['images/home', 'images/home/hero.png', true],
    ['images/home/', 'images/home/dark/hero@2x.png', true],
    ['./images/home', 'images/home/hero.png', true],
    ['images/home', 'images/homepage/hero.png', false],
    // * stays inside one folder
    ['images/*', 'images/favicon.png', true],
    ['images/*', 'images/home/hero.png', false],
    ['images/*.png', 'images/favicon.png', true],
    ['images/*.png', 'images/site-logo.svg', false],
    ['images/*/hero.png', 'images/home/hero.png', true],
    ['images/*/hero.png', 'images/home/dark/hero.png', false],
    // ** is any run of folders
    ['images/home/**', 'images/home/dark/hero.png', true],
    ['images/home/**', 'images/home/hero.png', true],
    ['images/**/*.svg', 'images/logo/mark.svg', true],
    ['images/**/*.svg', 'images/site-logo.svg', true],
    ['images/**/*.svg', 'images/logo/mark.png', false],
    ['**/*@2x.png', 'images/logo/mark@2x.png', true],
    // {a,b} is one of its alternatives, an empty one too
    ['images/home/gallery-{light,dark}{,@2x}.{png,webp}', 'images/home/gallery-dark@2x.webp', true],
    ['images/home/gallery-{light,dark}{,@2x}.{png,webp}', 'images/home/gallery-light.png', true],
    ['images/home/gallery-{light,dark}{,@2x}.{png,webp}', 'images/home/gallery-blue.png', false],
    // A dot is a dot
    ['images/a.png', 'images/axpng', false]
  ])('%s, %s → %s', (pattern, file, expected) => {
    expect(compileInclude(pattern).test(file)).toBe(expected)
  })
})

describe('createFileFilter()', () => {
  test('without filters every file passes', () => {
    const filter = createFileFilter()
    expect(filter.active).toBe(false)
    expect(filter.type('fonts')).toBe(true)
    expect(filter.file('data/brand.tokens.json')).toBe(true)
  })

  test('--type passes the files of the type folders', () => {
    const filter = createFileFilter({ types: ['images', 'icons'] })
    expect(filter.active).toBe(true)
    expect(filter.type('images')).toBe(true)
    expect(filter.type('fonts')).toBe(false)
    expect(filter.file('images/logo/mark.svg')).toBe(true)
    expect(filter.file('fonts/text.woff2')).toBe(false)
  })

  test('--include passes the files that match a pattern', () => {
    const filter = createFileFilter({ include: ['images/logo', 'icons/*.svg'] })
    expect(filter.type('fonts')).toBe(true)
    expect(filter.file('images/logo/mark.svg')).toBe(true)
    expect(filter.file('icons/arrow-right.svg')).toBe(true)
    expect(filter.file('images/photo.jpg')).toBe(false)
  })

  test('a file has to pass both', () => {
    const filter = createFileFilter({ types: ['images'], include: ['**/*.svg'] })
    expect(filter.file('images/logo/mark.svg')).toBe(true)
    expect(filter.file('icons/arrow-right.svg')).toBe(false)
    expect(filter.file('images/photo.jpg')).toBe(false)
  })
})

describe('coverPaths()', () => {
  const all = ['s/a/x.png', 's/a/y.png', 's/a/deep/z.png', 's/b/w.png', 's/b/v.png', 't/u.png']

  test('a folder whose files are all selected is one path', () => {
    expect(
      coverPaths(all, new Set(['s/a/x.png', 's/a/y.png', 's/a/deep/z.png', 's/b/w.png']))
    ).toEqual(['s/a/**', 's/b/w.png'])
  })

  test('the highest folder that is selected whole', () => {
    expect(coverPaths(all, new Set(all.filter((file) => file.startsWith('s/'))))).toEqual(['s/**'])
    expect(coverPaths(all, new Set(['s/a/deep/z.png', 's/a/x.png']))).toEqual([
      's/a/deep/**',
      's/a/x.png'
    ])
  })

  test('nothing selected, nothing named', () => {
    expect(coverPaths(all, new Set())).toEqual([])
  })
})

describe('generateAssets() with types and include', () => {
  test('--type builds the type folders it names, in every job', async () => {
    const { out, stats } = await build({ types: ['fonts', 'data'] })
    const expected = listFiles(GOLDEN).filter((file) =>
      /^[^/]+\/[^/]+\/[^/]+\/(fonts|data)\//.test(file)
    )
    expect(listFiles(out)).toEqual(expected)
    expect(stats.filesProcessed).toBe(expected.length)
    expect(stats.warnings).toEqual([])
  })

  test('--include builds the files that match, with the names of the platform', async () => {
    const { out } = await build({ include: ['images/logo', 'images/HeroBanner.png'] })
    expect(listFiles(out)).toEqual([
      'android/mobile/alpha/images/drawable/hero_banner.png',
      'android/mobile/alpha/images/logo/drawable-xhdpi/mark.png',
      'android/mobile/alpha/images/logo/drawable/mark.svg',
      'android/mobile/beta/images/drawable/hero_banner.png',
      'android/mobile/beta/images/logo/drawable-xhdpi/mark.png',
      'android/mobile/beta/images/logo/drawable/mark.svg',
      'ios/mobile/alpha/images/hero_banner.png',
      'ios/mobile/alpha/images/logo/mark.svg',
      'ios/mobile/alpha/images/logo/mark@2x.png',
      'ios/mobile/beta/images/hero_banner.png',
      'ios/mobile/beta/images/logo/mark.svg',
      'ios/mobile/beta/images/logo/mark@2x.png',
      'web/site/alpha/images/hero-banner.png',
      'web/site/alpha/images/logo/mark.png',
      'web/site/alpha/images/logo/mark.svg',
      'web/site/alpha/images/logo/mark@2x.png',
      'web/site/alpha/images/logo/mark@3x.png',
      'web/site/beta/images/hero-banner.png',
      'web/site/beta/images/logo/mark.png',
      'web/site/beta/images/logo/mark.svg',
      'web/site/beta/images/logo/mark@2x.png',
      'web/site/beta/images/logo/mark@3x.png'
    ])
  })

  test('a file of the build is the file of the default build, the brand file included', async () => {
    const { out } = await build({ include: ['images/logo'] })
    for (const file of listFiles(out)) {
      expect(read(out, file)).toBe(read(GOLDEN, file))
    }
    expect(read(out, 'web/site/alpha/images/logo/mark.svg')).not.toBe(
      read(out, 'web/site/beta/images/logo/mark.svg')
    )
  })

  test('a build with a filter keeps the output that is there, and --clean removes the jobs', async () => {
    const { out } = await build()
    await generateAssets({ cwd: FIXTURE, quiet: true, out, types: ['fonts'] })
    expect(listFiles(out)).toEqual(listFiles(GOLDEN))

    await generateAssets({ cwd: FIXTURE, quiet: true, out, types: ['fonts'], clean: true })
    expect(listFiles(out).every((file) => file.includes('/fonts/'))).toBe(true)
  })

  test('a Git LFS pointer fails the build only when the filters read it', async () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/default/site/images/photo.jpg'), LFS_POINTER)

    await expect(
      generateAssets({ cwd: root, quiet: true, out: tempDir(), apps: ['site'] })
    ).rejects.toThrow('Git LFS pointers')
    const stats = await generateAssets({
      cwd: root,
      quiet: true,
      out: tempDir(),
      apps: ['site'],
      include: ['images/logo', 'icons']
    })
    expect(stats.lfsPointers).toEqual([])
    await expect(
      generateAssets({
        cwd: root,
        quiet: true,
        out: tempDir(),
        apps: ['site'],
        include: ['images/*']
      })
    ).rejects.toThrow('source/default/site/images/photo.jpg')
  })

  test('filters that select no file fail the build', async () => {
    await expect(build({ types: ['sounds'] })).rejects.toThrow(
      'The filters select no file. Check --type and --include.'
    )
    await expect(build({ include: ['images/none/**'] })).rejects.toThrow(
      'The filters select no file'
    )
  })

  test('filters that select no file of one job warn, and write no folder for it', async () => {
    const { out, stats } = await build({ include: ['icons/icons.css'] })
    expect(listFiles(out)).toEqual([
      'web/site/alpha/icons/icons.css',
      'web/site/beta/icons/icons.css'
    ])
    expect(fs.existsSync(path.join(out, 'ios'))).toBe(false)
    expect(stats.warnings).toEqual([
      'The filters select no file of ios/mobile/alpha',
      'The filters select no file of android/mobile/alpha',
      'The filters select no file of ios/mobile/beta',
      'The filters select no file of android/mobile/beta'
    ])
  })

  test('a dry run counts the files of the filters', async () => {
    const out = tempDir()
    const stats = await generateAssets({
      cwd: FIXTURE,
      quiet: true,
      dryRun: true,
      apps: ['site'],
      brands: ['alpha'],
      include: ['images/logo'],
      out
    })
    expect(stats.filesProcessed).toBe(4)
    expect(listFiles(out)).toEqual([])
  })
})

describe('lfsInclude()', () => {
  test('names the app folders of a job that is read whole', () => {
    expect(lfsInclude({ cwd: FIXTURE, apps: ['site'], brands: ['alpha'] })).toEqual([
      'source/alpha/site/**',
      'source/default/site/data/**',
      'source/default/site/fonts/text-license.txt',
      'source/default/site/fonts/text.css',
      'source/default/site/fonts/text.woff',
      'source/default/site/fonts/text.woff2',
      'source/default/site/icons/**',
      'source/default/site/images/**'
    ])
  })

  test('names the files of the filters, in the default brand and in the brand', () => {
    expect(
      lfsInclude({ cwd: FIXTURE, apps: ['site'], include: ['images/logo', 'images/*.png'] })
    ).toEqual([
      'source/alpha/site/**',
      'source/default/site/images/HeroBanner.png',
      'source/default/site/images/logo/**'
    ])
  })

  test('leaves out what the platform does not keep', () => {
    const paths = lfsInclude({ cwd: FIXTURE, platforms: ['ios'], types: ['images'] })
    expect(paths).toContain('source/default/mobile/images/badge.png')
    expect(paths).not.toContain('source/default/mobile/images/photo.webp')
    expect(paths).not.toContain('source/default/mobile/images/**')
  })

  test('the paths are those a build with the same filters reads', async () => {
    const options = { apps: ['site'], brands: ['beta'], include: ['images/logo', 'fonts/*.woff2'] }
    const stats = await generateAssets({
      cwd: FIXTURE,
      quiet: true,
      dryRun: true,
      out: tempDir(),
      ...options
    })
    const paths = lfsInclude({ cwd: FIXTURE, ...options })
    expect(paths).toEqual([
      'source/default/site/fonts/text.woff2',
      'source/default/site/images/logo/**'
    ])
    expect(stats.filesProcessed).toBe(5)
  })

  test('fails on filters that select no file, and on a filter that is not configured', () => {
    expect(() => lfsInclude({ cwd: FIXTURE, types: ['sounds'] })).toThrow(
      'The filters select no file'
    )
    expect(() => lfsInclude({ cwd: FIXTURE, brands: ['gamma'] })).toThrow('Unknown brand "gamma"')
  })
})

describe('pnpm assets:lfs and the filters of pnpm assets', () => {
  /** @param {string[]} args */
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf-8' })

  test('prints the paths on one line, separated by commas', () => {
    const result = run([
      'lfs',
      '--cwd',
      FIXTURE,
      '--app',
      'site',
      '--include',
      'images/logo',
      'icons/*.css'
    ])
    expect(result.status).toBe(0)
    expect(result.stdout).toBe(
      'source/alpha/site/images/logo/**,source/default/site/icons/icons.css,source/default/site/images/logo/**\n'
    )
  })

  test('--help names the options, and an error exits with 1', () => {
    const help = run(['lfs', '--help'])
    expect(help.status).toBe(0)
    for (const flag of ['--brand', '--app', '--platform', '--type', '--include', '--cwd']) {
      expect(help.stdout).toContain(flag)
    }
    const failed = run(['lfs', '--cwd', FIXTURE, '--type', 'sounds'])
    expect(failed.status).toBe(1)
    expect(failed.stderr).toContain('The filters select no file')
    expect(run(['lfs', '--bogus']).status).toBe(2)
  })

  test('pnpm assets --type and --include build the files of the filters', () => {
    const out = tempDir()
    const result = run([
      'build',
      '--cwd',
      FIXTURE,
      '--out',
      out,
      '--platform',
      'web',
      '--type',
      'images',
      '--include',
      '**/*.svg'
    ])
    expect(result.status).toBe(0)
    expect(listFiles(out)).toEqual([
      'web/site/alpha/images/logo/mark.svg',
      'web/site/beta/images/logo/mark.svg'
    ])
  })

  test('--type and --include need a value', () => {
    expect(run(['build', '--type']).stderr).toContain('--type needs at least one value')
    expect(run(['build', '--include']).stderr).toContain('--include needs at least one value')
  })
})
