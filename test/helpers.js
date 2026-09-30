/**
 * @file helpers.js
 * @description Paths and file helpers shared by the tests. Every test that writes does so in
 *              a temporary folder made with `tempDir()`, never in the repository.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** The repository root. */
export const ROOT = path.resolve(here, '..')

/** The fixture: a `package.json` with the `chassis` block and a `source/` folder. */
export const FIXTURE = path.join(here, 'fixtures')

/** The output of a default build of the fixture, committed. */
export const GOLDEN = path.join(here, 'golden')

/** The command-line entries of the build and its checks. */
export const BUILD_CLI = path.join(ROOT, 'build', 'build-assets.js')
export const ANALYZE_CLI = path.join(ROOT, 'build', 'analyze-assets.js')
export const VALIDATE_CLI = path.join(ROOT, 'build', 'validate-assets.js')
export const LINT_SOURCE_CLI = path.join(ROOT, 'build', 'lint-source.js')
export const CONTRACT_CLI = path.join(ROOT, 'build', 'contract.js')
export const VERIFY_CLI = path.join(ROOT, 'build', 'verify.js')

const made = []

/**
 * A new empty temporary folder. `removeTempDirs()` removes every folder made so far.
 * @param {string} [prefix]
 * @returns {string}
 */
export function tempDir(prefix = 'chassis-assets-test-') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  made.push(dir)
  return dir
}

/** Remove the folders `tempDir()` made. For `afterAll()`. */
export function removeTempDirs() {
  while (made.length > 0) {
    fs.rmSync(made.pop(), { recursive: true, force: true })
  }
}

/**
 * A copy of the fixture in a temporary folder, for a test that changes the source.
 * @returns {string} The root of the copy
 */
export function copyFixture() {
  const dir = tempDir('chassis-assets-fixture-')
  fs.cpSync(FIXTURE, dir, { recursive: true })
  return dir
}

/**
 * Every file under a folder, as sorted paths relative to it with forward slashes.
 * @param {string} dir
 * @returns {string[]}
 */
export function listFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
    )
    .sort()
}

/**
 * Compare two output folders file by file.
 * @param {string} expectedDir
 * @param {string} actualDir
 * @returns {{ missing: string[], extra: string[], changed: string[] }}
 */
export function compareDirs(expectedDir, actualDir) {
  const expected = listFiles(expectedDir)
  const actual = listFiles(actualDir)
  const changed = expected.filter(
    (file) =>
      actual.includes(file) &&
      !fs
        .readFileSync(path.join(expectedDir, file))
        .equals(fs.readFileSync(path.join(actualDir, file)))
  )
  return {
    missing: expected.filter((file) => !actual.includes(file)),
    extra: actual.filter((file) => !expected.includes(file)),
    changed
  }
}

/**
 * The content of a file as text.
 * @param {...string} parts
 * @returns {string}
 */
export function read(...parts) {
  return fs.readFileSync(path.join(...parts), 'utf-8')
}
