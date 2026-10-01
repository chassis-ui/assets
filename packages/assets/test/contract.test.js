/**
 * @file contract.test.js
 * @description The consumer contracts of `build/contract.js`: the pattern expansion, the
 *              files and the sets of a contract, and `checkContracts()` on the contracts of
 *              the fixture's `chassis.checks.json` and on outputs written into temporary folders.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import {
  checkContracts,
  compilePattern,
  expand,
  missingFromContract,
  missingFromSet
} from '../build/contract.js'
import { FIXTURE, GOLDEN, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

describe('expand()', () => {
  test.each([
    ['images/site-logo.svg', ['images/site-logo.svg']],
    ['a-{b,c}.svg', ['a-b.svg', 'a-c.svg']],
    ['a{,@2x}.png', ['a.png', 'a@2x.png']],
    ['{a,b}-{c,d}', ['a-c', 'a-d', 'b-c', 'b-d']]
  ])('%s', (pattern, paths) => {
    expect(expand(pattern)).toEqual(paths)
  })
})

describe('compilePattern()', () => {
  test.each([
    ['shots/*/{light,dark}/*.png', 'shots/alert/dark/window.png', true],
    ['shots/*/{light,dark}/*.png', 'shots/alert/dim/window.png', false],
    ['shots/*/{light,dark}/*.png', 'shots/alert/more/dark/window.png', false],
    ['shots/*/*/meta-1-*.png', 'shots/card/light/meta-1-2x-3.png', true],
    ['shots/*/*/meta-1-*.png', 'shots/card/light/meta-1.png', false],
    ['a.b', 'axb', false]
  ])('%s matches %s: %s', (pattern, file, expected) => {
    expect(compilePattern(pattern).regex.test(file)).toBe(expected)
  })
})

describe('missingFromSet()', () => {
  const SET = 'shots/*/{light,dark}/*{,@2x}.png'
  const COMPLETE = expand('shots/alert/{light,dark}/window{,@2x}.png')

  test('nothing is missing from a complete set', () => {
    expect(missingFromSet(COMPLETE, SET)).toEqual([])
  })

  test('a file needs every alternative of the pattern', () => {
    const paths = COMPLETE.filter((file) => file !== 'shots/alert/dark/window@2x.png')
    paths.push('shots/badge/light/pill.png')
    expect(missingFromSet(paths, SET).sort()).toEqual([
      'shots/alert/dark/window@2x.png',
      'shots/badge/dark/pill.png',
      'shots/badge/dark/pill@2x.png',
      'shots/badge/light/pill@2x.png'
    ])
  })

  test('a file that only the longer alternative fits is read with it', () => {
    expect(
      missingFromSet(['shots/alert/light/window@2x.png'], 'shots/*/light/*{,@2x}.png')
    ).toEqual(['shots/alert/light/window.png'])
  })

  test('a set that no file matches lacks its pattern', () => {
    expect(missingFromSet(['images/logo.svg'], SET)).toEqual([SET])
  })

  test('an exception asks nothing of the files it matches', () => {
    const copies = expand('shots/alert/{light,dark}/window-{1,2x-1}.png')
    const set = { pattern: SET, except: ['shots/*/*/window-*.png'] }
    expect(missingFromSet([...COMPLETE, ...copies], set)).toEqual([])
    expect(missingFromSet([...COMPLETE, ...copies], SET)).toHaveLength(4)
  })

  test('a set of exceptions only still needs a file', () => {
    const set = { pattern: 'shots/*.png', except: ['shots/*.png'] }
    expect(missingFromSet(['shots/a.png'], set)).toEqual(['shots/*.png'])
  })
})

describe('missingFromContract()', () => {
  const ENTRIES = [
    {
      job: 'web/site/alpha',
      reader: 'the layout',
      files: ['images/logo.svg', 'fonts/a.{woff,woff2}']
    },
    { job: 'web/site/alpha', reader: 'the gallery', sets: ['shots/*{,@2x}.png'] }
  ]
  const COMPLETE = [
    'images/logo.svg',
    'fonts/a.woff',
    'fonts/a.woff2',
    'shots/a.png',
    'shots/a@2x.png'
  ]

  test('nothing is missing from a complete output', () => {
    expect(missingFromContract(COMPLETE, ENTRIES)).toEqual([])
  })

  test('names each missing file with its reader, sorted by path', () => {
    const paths = COMPLETE.filter((file) => file !== 'fonts/a.woff2' && file !== 'shots/a@2x.png')
    expect(missingFromContract(paths, ENTRIES)).toEqual([
      { path: 'fonts/a.woff2', reader: 'the layout' },
      { path: 'shots/a@2x.png', reader: 'the gallery' }
    ])
  })

  test('no entries, nothing missing', () => {
    expect(missingFromContract([], [])).toEqual([])
  })
})

describe('checkContracts()', () => {
  /** The contracts of the fixture, by job, as its `chassis.checks.json` has them. */
  const FIXTURE_CONTRACTS = JSON.parse(
    fs.readFileSync(path.join(FIXTURE, 'chassis.checks.json'), 'utf-8')
  ).contracts

  /**
   * A repository root with the configuration of the fixture, the given `contracts` in its
   * `chassis.checks.json`, or no such file, and the golden output as `dist/`.
   */
  function repository(contracts) {
    const cwd = tempDir()
    fs.copyFileSync(path.join(FIXTURE, 'package.json'), path.join(cwd, 'package.json'))
    if (contracts !== undefined) {
      fs.writeFileSync(path.join(cwd, 'chassis.checks.json'), JSON.stringify({ contracts }))
    }
    fs.cpSync(GOLDEN, path.join(cwd, 'dist'), { recursive: true })
    return cwd
  }

  test('the golden output keeps the contracts of the fixture, one result per job', () => {
    expect(checkContracts({ cwd: FIXTURE, out: '../golden' })).toEqual([
      { job: 'web/site/alpha', dir: '../golden/web/site/alpha', files: 17, missing: [] }
    ])
  })

  test('names a file the output lacks, and takes out', () => {
    const cwd = repository(FIXTURE_CONTRACTS)
    fs.renameSync(path.join(cwd, 'dist'), path.join(cwd, 'build'))
    fs.rmSync(path.join(cwd, 'build/web/site/alpha/images/logo/mark@3x.png'))
    expect(checkContracts({ cwd, out: 'build' })).toEqual([
      {
        job: 'web/site/alpha',
        dir: 'build/web/site/alpha',
        files: 16,
        missing: [
          { path: 'images/logo/mark@3x.png', reader: 'the logo component of the fixture site' }
        ]
      }
    ])
  })

  test('a repository without chassis.checks.json has nothing to check', () => {
    expect(checkContracts({ cwd: repository(undefined) })).toEqual([])
  })

  test('an output that does not exist is missing, for the readers of its job', () => {
    const cwd = repository({ 'web/site/beta': [{ reader: 'a site', files: ['images/photo.jpg'] }] })
    fs.rmSync(path.join(cwd, 'dist/web/site/beta'), { recursive: true })
    expect(checkContracts({ cwd })).toEqual([
      {
        job: 'web/site/beta',
        dir: 'dist/web/site/beta',
        files: 0,
        missing: [{ path: '', reader: 'a site' }]
      }
    ])
  })

  test.each([
    [{ 'web/site': [{ reader: 'a site' }] }, 'needs a job, as <platform>/<app>/<brand>'],
    [{ 'web/site/alpha': [{}] }, 'needs a job, as <platform>/<app>/<brand>, and "reader"'],
    [{ 'web/site/gamma': [{ reader: 'a site' }] }, 'does not build'],
    [{ 'ios/site/alpha': [{ reader: 'an app' }] }, 'does not build'],
    [[{ job: 'web/site/alpha', reader: 'a site' }], 'is an object with a list of contracts'],
    [{ 'web/site/alpha': { reader: 'a site' } }, 'is an object with a list of contracts']
  ])('%j fails', (contracts, message) => {
    expect(() => checkContracts({ cwd: repository(contracts) })).toThrow(message)
  })

  test('a chassis.checks.json that is not JSON fails', () => {
    const cwd = repository(undefined)
    fs.writeFileSync(path.join(cwd, 'chassis.checks.json'), '{ contracts: ')
    expect(() => checkContracts({ cwd })).toThrow('chassis.checks.json is not valid JSON')
  })
})
