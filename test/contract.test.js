/**
 * @file contract.test.js
 * @description The consumer contract of `build/contract.js`: the pattern expansion, the
 *              files every site reads, the screenshot rule of chassis-figma, and
 *              `checkContract()` on an output written into a temporary folder.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import {
  CONTRACT,
  CONTRACT_JOB,
  checkContract,
  expand,
  missingFromContract
} from '../build/contract.js'
import { FIXTURE, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

/** Every file the contract names, and one screenshot in its four variants. */
const COMPLETE = [
  ...CONTRACT.flatMap((entry) => entry.files.flatMap(expand)),
  ...expand('images/figma/components/alert/{light,dark}/alert-window{,@2x}.png')
]

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

describe('the contract', () => {
  test('is the docs job of the chassis brand', () => {
    expect(CONTRACT_JOB).toEqual({ platform: 'web', app: 'docs', brand: 'chassis' })
  })

  test('names the files of the roadmap, each once', () => {
    const files = CONTRACT.flatMap((entry) => entry.files.flatMap(expand))
    expect(new Set(files).size).toBe(files.length)
    expect(files).toContain('images/social-image.png')
    expect(files).toContain('icons/cx-sprite.svg')
    expect(files).toContain('images/home/comp-gallery-dark-small@2x.webp')
    expect(files).toContain('images/logo/chassis-icon-white-banner.svg')
    expect(files).toHaveLength(1 + 4 + 2 + 1 + 1 + 16 + 12 + 4 + 4)
  })
})

describe('missingFromContract()', () => {
  test('nothing is missing from a complete output', () => {
    expect(missingFromContract(COMPLETE)).toEqual([])
  })

  test('names a missing file and its reader', () => {
    const paths = COMPLETE.filter((file) => file !== 'images/social-image.png')
    expect(missingFromContract(paths)).toEqual([
      {
        path: 'images/social-image.png',
        reader: expect.stringContaining('BaseLayout.astro of @chassis-ui/docs')
      }
    ])
  })

  test('an output without screenshots is missing them', () => {
    const paths = COMPLETE.filter((file) => !file.startsWith('images/figma/'))
    expect(missingFromContract(paths).map((m) => m.path)).toEqual(['images/figma/components/'])
  })

  test('a screenshot needs both modes and both densities', () => {
    const paths = COMPLETE.filter(
      (file) => file !== 'images/figma/components/alert/dark/alert-window@2x.png'
    )
    paths.push('images/figma/components/badge/light/badge-pill.png')
    expect(missingFromContract(paths).map((m) => m.path)).toEqual([
      'images/figma/components/alert/dark/alert-window@2x.png',
      'images/figma/components/badge/dark/badge-pill.png',
      'images/figma/components/badge/dark/badge-pill@2x.png',
      'images/figma/components/badge/light/badge-pill@2x.png'
    ])
  })

  test('a Figma export copy needs both modes, and no @2x', () => {
    const copies = [
      ...expand('images/figma/components/alert/{light,dark}/alert-window-{1,2x-1}.png'),
      'images/figma/components/alert/light/alert-window-2.png'
    ]
    expect(missingFromContract([...COMPLETE, ...copies]).map((m) => m.path)).toEqual([
      'images/figma/components/alert/dark/alert-window-2.png'
    ])
  })

  test('a numbered name without its original is a screenshot of its own', () => {
    const paths = [...COMPLETE, ...expand('images/figma/components/card/{light,dark}/meta-1.png')]
    expect(missingFromContract(paths).map((m) => m.path)).toEqual([
      'images/figma/components/card/dark/meta-1@2x.png',
      'images/figma/components/card/light/meta-1@2x.png'
    ])
  })
})

describe('checkContract()', () => {
  /** An output of the docs job with the given files, in a temporary folder. */
  function output(files) {
    const cwd = tempDir()
    const dir = path.join(cwd, 'dist/web/docs/chassis')
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      fs.writeFileSync(path.join(dir, file), file)
    }
    return cwd
  }

  test('passes on a complete output', () => {
    expect(checkContract({ cwd: output(COMPLETE) })).toEqual({
      dir: 'dist/web/docs/chassis',
      files: COMPLETE.length,
      missing: []
    })
  })

  test('takes out', () => {
    const cwd = output(COMPLETE)
    fs.renameSync(path.join(cwd, 'dist'), path.join(cwd, 'build'))
    expect(checkContract({ cwd, out: 'build' }).missing).toEqual([])
  })

  test('fails when the docs output does not exist', () => {
    const result = checkContract({ cwd: FIXTURE, out: '../golden' })
    expect(result.files).toBe(0)
    expect(result.missing).toHaveLength(1)
  })
})
