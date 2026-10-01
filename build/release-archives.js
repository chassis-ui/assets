#!/usr/bin/env node

/*!
 * Release Archives Script
 *
 * Writes one archive per platform, app and brand of an existing build, for the GitHub
 * release of a version: <prefix>-<platform>-<app>-<brand>-<version>.zip, with the content
 * of dist/<platform>/<app>/<brand>/ at its top level.
 *
 * Usage:
 *   node build/release-archives.js [--out <dir>] [--to <dir>] [--prefix <name>]
 *
 * --out is the build output to read, `dist` by default. --to is the folder the archives are
 * written to, `.cache/release` by default; archives already in it are removed. --prefix is
 * the start of the names, by default the name of the root package.json without its scope
 * and without `-workspace`: `chassis-assets` here. Needs the `zip` command. Fails when the
 * build output has no job.
 *
 * Copyright 2025-2026 Ozgur Gunes
 * Licensed under MIT
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

function option(name, fallback) {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

async function folders(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
}

async function main() {
  const out = path.resolve(option('--out', 'dist'))
  const to = path.resolve(option('--to', '.cache/release'))
  const pkg = JSON.parse(await fs.readFile(path.resolve('packages/assets/package.json'), 'utf8'))
  const root = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8'))
  const prefix = option('--prefix', root.name.replace(/^@[^/]+\//, '').replace(/-workspace$/, ''))

  await fs.mkdir(to, { recursive: true })

  for (const name of await fs.readdir(to)) {
    if (name.startsWith(`${prefix}-`) && name.endsWith('.zip')) {
      await fs.rm(path.join(to, name))
    }
  }

  let count = 0

  for (const platform of await folders(out)) {
    for (const app of await folders(path.join(out, platform))) {
      for (const brand of await folders(path.join(out, platform, app))) {
        const name = `${prefix}-${platform}-${app}-${brand}-${pkg.version}.zip`

        // -X leaves out the extra file attributes, -x the files macOS adds to a folder
        execFileSync('zip', ['-q', '-r', '-X', path.join(to, name), '.', '-x', '*.DS_Store'], {
          cwd: path.join(out, platform, app, brand),
          stdio: 'inherit'
        })

        const { size } = await fs.stat(path.join(to, name))
        console.log(`📦 ${name} (${(size / 1024 / 1024).toFixed(1)} MB)`)
        count++
      }
    }
  }

  if (count === 0) {
    console.error(`❌ No <platform>/<app>/<brand> folder in ${out}. Run pnpm assets first.`)
    process.exit(1)
  }

  console.log(`✅ ${count} archives in ${path.relative(process.cwd(), to) || '.'}`)
}

main().catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`)
  process.exit(1)
})
