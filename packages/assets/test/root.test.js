/**
 * @file root.test.js
 * @description `build/root.js`: the repository root, found from a folder upward or given,
 *              and the version of the build.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { buildVersion, findRoot, isEntry, resolveRoot } from '../build/root.js'
import { FIXTURE, ROOT, read, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

describe('findRoot()', () => {
  test('a folder whose package.json has a chassis block is the root', () => {
    expect(findRoot(FIXTURE)).toBe(FIXTURE)
  })

  test('the root is found from a folder below it', () => {
    expect(findRoot(path.join(FIXTURE, 'source', 'default', 'site', 'images'))).toBe(FIXTURE)
  })

  test('a package.json without a chassis block is passed over', () => {
    const root = tempDir()
    const below = path.join(root, 'packages', 'assets')
    fs.mkdirSync(below, { recursive: true })
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ chassis: {} }))
    fs.writeFileSync(path.join(below, 'package.json'), JSON.stringify({ name: 'x' }))
    expect(findRoot(below)).toBe(root)
  })

  test('a package.json that is not JSON is passed over', () => {
    const root = tempDir()
    const below = path.join(root, 'below')
    fs.mkdirSync(below)
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ chassis: {} }))
    fs.writeFileSync(path.join(below, 'package.json'), '{')
    expect(findRoot(below)).toBe(root)
  })

  test('the start folder is returned when no folder above it has a chassis block', () => {
    const dir = tempDir()
    expect(findRoot(dir)).toBe(dir)
  })

  test('from the package of the build, the root is the repository', () => {
    expect(findRoot(ROOT)).toBe(path.resolve(ROOT, '..', '..'))
  })
})

describe('resolveRoot()', () => {
  test('a given cwd is taken as it is, without looking upward', () => {
    const below = path.join(FIXTURE, 'source')
    expect(resolveRoot(below)).toBe(below)
  })

  test('a relative cwd resolves from the working directory', () => {
    expect(resolveRoot('some/folder')).toBe(path.resolve('some/folder'))
  })

  test('without a cwd, the root is found from the working directory', () => {
    expect(resolveRoot()).toBe(findRoot(process.cwd()))
  })
})

describe('buildVersion()', () => {
  test('is the version of packages/assets/package.json', () => {
    expect(buildVersion()).toBe(JSON.parse(read(ROOT, 'package.json')).version)
    expect(buildVersion()).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe('isEntry()', () => {
  test('a module that is imported is not the entry', () => {
    expect(isEntry(new URL('../build/root.js', import.meta.url).href)).toBe(false)
  })
})
