/**
 * @file release-notes.test.js
 * @description `chassis-assets release-notes`: the entry of a version in a changelog, in both
 *              heading styles, and a command that fails without one.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { releaseNotes } from '../build/release-notes.js'
import { CLI, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

const CHANGELOG = `# Changelog

## 0.3.0

### Minor Changes

- Three.

\`\`\`md
## 0.2.0 in a code block
\`\`\`

## [0.2.0] - 2026-10-01

- Two.

## 0.1.0

`

describe('releaseNotes', () => {
  test('finds the entry in both heading styles, past a heading in a code block', () => {
    expect(releaseNotes(CHANGELOG, '0.3.0')).toContain('- Three.')
    expect(releaseNotes(CHANGELOG, '0.3.0')).toContain('## 0.2.0 in a code block')
    expect(releaseNotes(CHANGELOG, '0.3.0')).not.toContain('- Two.')
    expect(releaseNotes(CHANGELOG, '0.2.0')).toBe('- Two.')
  })

  test('an empty entry is empty, and a version without one is null', () => {
    expect(releaseNotes(CHANGELOG, '0.1.0')).toBe('')
    expect(releaseNotes(CHANGELOG, '0.4.0')).toBeNull()
    expect(releaseNotes('## 1x2.0\n\n- Other.\n', '1.2.0')).toBeNull()
  })
})

describe('the command', () => {
  /**
   * A repository of a version, with a changelog when one is given.
   * @param {string} version
   * @param {string} [changelog]
   */
  function repository(version, changelog) {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version, chassis: {} }))
    if (changelog !== undefined) fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), changelog)
    return dir
  }
  const run = (...args) =>
    spawnSync(process.execPath, [CLI, 'release-notes', ...args], { encoding: 'utf-8' })

  test('prints the entry of the version of package.json, or of the version given', () => {
    const dir = repository('0.2.0', CHANGELOG)
    expect(run('--cwd', dir)).toMatchObject({ status: 0, stdout: '- Two.\n' })
    expect(run('v0.2.0', '--cwd', dir)).toMatchObject({ status: 0, stdout: '- Two.\n' })
  })

  test('exits 1 without a changelog, an entry or a text, and names what to add', () => {
    expect(run('--cwd', repository('0.2.0')).stderr).toContain('has no CHANGELOG.md')
    const none = run('--cwd', repository('0.4.0', CHANGELOG))
    expect(none.status).toBe(1)
    expect(none.stderr).toContain('CHANGELOG.md has no entry for 0.4.0')
    const empty = run('--cwd', repository('0.1.0', CHANGELOG))
    expect(empty.status).toBe(1)
    expect(empty.stderr).toContain('for 0.1.0 is empty')
    expect(run('--zip').status).toBe(2)
  })
})
