/**
 * Where the build runs and which version it is.
 *
 * `source/`, `dist/` and the `chassis` block of `package.json` are at the repository root;
 * the build is in `packages/assets/`. So the root is found, not assumed: from the working
 * directory upward, or given with `cwd`.
 *
 * @module root
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * The nearest folder, from `start` upward, whose `package.json` has a `chassis` block.
 * @param {string} [start] - Default: the working directory
 * @returns {string} The folder, or `start` when no folder above it has such a file
 */
export function findRoot(start = process.cwd()) {
  const from = path.resolve(start)
  for (let dir = from; ; dir = path.dirname(dir)) {
    try {
      if (JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')).chassis) return dir
    } catch {
      // No package.json here, or one that cannot be read: look further up
    }
    if (dir === path.dirname(dir)) return from
  }
}

/**
 * The repository root of a run: `cwd` as it is when given, else `findRoot()`.
 * @param {string} [cwd] - The `cwd` option or `--cwd`
 * @returns {string} An absolute path
 */
export function resolveRoot(cwd) {
  return cwd ? path.resolve(cwd) : findRoot()
}

/**
 * The version of the build: that of `packages/assets/package.json`, wherever it runs.
 * @returns {string}
 */
export function buildVersion() {
  const file = fileURLToPath(new URL('../package.json', import.meta.url))
  return JSON.parse(fs.readFileSync(file, 'utf-8')).version
}

/**
 * Whether a module is the file Node.js was started with, and not imported.
 * @param {string} moduleUrl - `import.meta.url` of the module
 * @returns {boolean}
 */
export function isEntry(moduleUrl) {
  if (!process.argv[1]) return false
  // By the real paths: a folder reached through a link, or a path with a space, is the
  // same file under another spelling
  try {
    return fs.realpathSync(fileURLToPath(moduleUrl)) === fs.realpathSync(process.argv[1])
  } catch {
    return false
  }
}
