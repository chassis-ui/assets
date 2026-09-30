/**
 * @file compare-0.1.8.js
 * @description The acceptance of session 2.1 of the roadmap: with the optimization off,
 *              the new build writes the files of the build of 0.1.8, byte for byte. It
 *              runs both builds into a scratch folder and compares them, job by job.
 *              The only difference that it accepts is `chassis-assets.json`, which 0.1.8
 *              did not write. It goes when the old build goes.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build } from '../build/index.js'
import { compareManifests, readManifest } from '../build/manifest.js'
import { MANIFEST_FILE } from '../build/names.js'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

/**
 * Lists the files of a folder with their size and their hash.
 * @param {string} folder
 * @returns {Promise<{ files: Array<{ path: string, bytes: number, sha256: string }> }>}
 */
async function hashFolder(folder) {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory()) continue
    const file = path.join(entry.parentPath, entry.name)
    const content = await readFile(file)
    files.push({
      path: path.relative(folder, file).split(path.sep).join('/'),
      bytes: content.length,
      sha256: createHash('sha256').update(content).digest('hex')
    })
  }
  return { files }
}

/**
 * Runs the build of 0.1.8. It reads `package.json` and `source/` from the working
 * directory and writes `dist/` into it, so it runs in a folder that links to both.
 * @param {string} folder
 */
async function buildOld(folder) {
  await symlink(path.join(ROOT, 'source'), path.join(folder, 'source'), 'dir')
  await copyFile(path.join(ROOT, 'package.json'), path.join(folder, 'package.json'))
  await promisify(execFile)(process.execPath, [path.join(ROOT, 'build/build-assets.js')], {
    cwd: folder,
    maxBuffer: 256 * 1024 * 1024
  })
}

const scratch = await mkdtemp(path.join(tmpdir(), 'chassis-assets-compare-'))
let failed = 0
try {
  const oldRoot = path.join(scratch, 'old')
  const newRoot = path.join(scratch, 'new')
  await mkdir(oldRoot)
  await buildOld(oldRoot)

  const result = await build({ root: ROOT, out: newRoot, optimize: false, cache: false })
  for (const report of result.jobs) {
    const name = `${report.platform}/${report.app}/${report.brand}`
    for (const error of report.errors) {
      failed++
      console.error(`❌ ${name}: ${error.message}`)
    }
    if (report.errors.length > 0) continue

    const before = await hashFolder(path.join(oldRoot, 'dist', name))
    const manifest = await readManifest(report.out)
    const written = await hashFolder(report.out)
    written.files = written.files.filter((file) => file.path !== MANIFEST_FILE)

    const keys = /** @type {const} */ (['bytes', 'sha256'])
    const checks = {
      'the build of 0.1.8': compareManifests(before, manifest, [...keys]),
      'its own manifest': compareManifests(manifest, written, [...keys])
    }
    let differences = 0
    for (const [what, { added, removed, changed }] of Object.entries(checks)) {
      const lines = [
        ...added.map((file) => `+ ${file}`),
        ...removed.map((file) => `- ${file}`),
        ...changed.map((file) => `≠ ${file.path} (${file.keys.join(', ')})`)
      ]
      differences += lines.length
      if (lines.length === 0) continue
      console.error(`❌ ${name} differs from ${what} in ${lines.length} file(s):`)
      for (const line of lines.slice(0, 20)) console.error(`   ${line}`)
      if (lines.length > 20) console.error(`   and ${lines.length - 20} more`)
    }
    if (differences > 0) failed++
    else console.log(`✔︎ ${name}: ${manifest.files.length} files, the same as in 0.1.8`)
  }
} finally {
  await rm(scratch, { recursive: true, force: true })
}

if (failed > 0) {
  console.error(`\n❌ ${failed} job(s) differ from the build of 0.1.8`)
  process.exitCode = 1
} else {
  console.log('\n✅ The new build writes the files of 0.1.8')
}
