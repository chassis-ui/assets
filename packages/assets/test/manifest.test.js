/**
 * @file manifest.test.js
 * @description `chassis-assets manifest` and `chassis-assets diff`: the list of the files of the
 *              golden output, and what a later build reports against it.
 */

import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { diffManifests, formatDiff } from '../build/diff.js'
import { buildManifest, writeManifest } from '../build/manifest.js'
import { CLI, FIXTURE, GOLDEN, listFiles, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf-8' })

/**
 * A manifest of one job.
 * @param {Record<string, string>} files - The content by path
 * @param {string} [version]
 */
function manifestOf(files, version = '1.0.0') {
  const job = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [
      name,
      { size: content.length, sha256: content }
    ])
  )
  return { name: 'acme', version, builder: '0.0.0', jobs: { 'web/site/main': job } }
}

describe('the manifest', () => {
  const options = { cwd: FIXTURE, out: GOLDEN, prefix: 'acme', release: '1.2.3' }

  test('lists every file of every job, with its size and its hash', () => {
    const manifest = buildManifest(options)
    expect(manifest).toMatchObject({ name: 'acme', version: '1.2.3' })
    expect(Object.keys(manifest.jobs)).toEqual([
      'android/mobile/alpha',
      'android/mobile/beta',
      'ios/mobile/alpha',
      'ios/mobile/beta',
      'web/site/alpha',
      'web/site/beta'
    ])
    for (const [job, files] of Object.entries(manifest.jobs)) {
      const dir = path.join(GOLDEN, job)
      expect(Object.keys(files)).toEqual(listFiles(dir))
      for (const [name, { size, sha256 }] of Object.entries(files)) {
        const data = fs.readFileSync(path.join(dir, name))
        expect(size).toBe(data.length)
        expect(sha256).toBe(crypto.createHash('sha256').update(data).digest('hex'))
      }
    }
  })

  test('is written beside the archives, in place of the one of an earlier version', () => {
    const to = tempDir()
    fs.writeFileSync(path.join(to, 'acme-manifest-1.0.0.json'), '{}')
    fs.writeFileSync(path.join(to, 'other-manifest-1.0.0.json'), '{}')
    const { file } = writeManifest({ ...options, to })
    expect(path.basename(file)).toBe('acme-manifest-1.2.3.json')
    expect(fs.readdirSync(to).sort()).toEqual([
      'acme-manifest-1.2.3.json',
      'other-manifest-1.0.0.json'
    ])
    expect(JSON.parse(fs.readFileSync(file, 'utf-8')).jobs['web/site/alpha']).toBeDefined()
  })

  test('the command exits 1 without a job, and 2 on a wrong call', () => {
    const cwd = tempDir()
    fs.writeFileSync(path.join(cwd, 'package.json'), '{ "name": "a", "version": "1.0.0" }')
    const none = run('manifest', '--cwd', cwd)
    expect(none.status).toBe(1)
    expect(none.stderr).toContain('Run the build first')
    expect(fs.readdirSync(path.join(cwd, 'archives'))).toEqual([])
    expect(run('manifest', '--zip').status).toBe(2)
  })
})

describe('the comparison', () => {
  test('reports added, removed, renamed and changed files, by job', () => {
    const base = manifestOf({ 'a.png': 'A', 'b.png': 'B', 'c.png': 'C', 'd.png': 'D' })
    const head = manifestOf({ 'a.png': 'A', 'b2.png': 'B', 'c.png': 'C2', 'e.png': 'E' }, '1.1.0')
    expect(diffManifests(base, head)).toEqual([
      {
        job: 'web/site/main',
        added: ['e.png'],
        removed: ['d.png'],
        renamed: [{ from: 'b.png', to: 'b2.png' }],
        changed: ['c.png']
      }
    ])
    const report = formatDiff(diffManifests(base, head), base, head)
    expect(report).toContain('# Files of acme, 1.0.0 to 1.1.0')
    expect(report).toContain('## web/site/main')
    expect(report).toContain('**Removed, breaking** (1)')
    expect(report).toContain('- `b.png` to `b2.png`')
  })

  test('a job of one side only is all added or all removed, and the same output says so', () => {
    const base = manifestOf({ 'a.png': 'A' })
    const empty = { ...base, jobs: {} }
    expect(diffManifests(empty, base)[0].added).toEqual(['a.png'])
    expect(diffManifests(base, empty)[0].removed).toEqual(['a.png'])
    expect(diffManifests(base, base)).toEqual([])
    expect(formatDiff([], base, base)).toContain('No file differs.')
  })

  test('the command compares an output with a manifest, and exits 0', () => {
    const to = tempDir()
    const { file } = writeManifest({
      cwd: FIXTURE,
      out: GOLDEN,
      to,
      prefix: 'acme',
      release: '1.0.0'
    })
    const same = run('diff', '--base', file, '--cwd', FIXTURE, '--out', GOLDEN)
    expect(same.status).toBe(0)
    expect(same.stdout).toContain('No file differs.')
  })

  test('the command needs a base that is a manifest', () => {
    expect(run('diff').status).toBe(2)
    const file = path.join(tempDir(), 'other.json')
    fs.writeFileSync(file, '{}')
    const result = run('diff', '--base', file, '--cwd', FIXTURE, '--out', GOLDEN)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('is no manifest')
  })
})
