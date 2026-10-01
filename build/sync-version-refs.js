#!/usr/bin/env node

/*!
 * Version Reference Sync Script
 *
 * Copies the version of @chassis-ui/assets into the places that show it and that
 * `changeset version` cannot update: `currentVersion` of packages/site/config.yml and the
 * version badge of README.md.
 *
 * Runs as part of `pnpm changeset:version`, after `changeset version` has bumped
 * packages/assets/package.json, which is the source of the version.
 *
 * Copyright 2025-2026 Ozgur Gunes
 * Licensed under MIT
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/

/**
 * The files that show the version, each with the pattern of the reference and its text
 * for a version. A required file without a match fails the run, so a reference cannot go
 * stale unnoticed. The badge of the README is not required: a repository may have none.
 */
const REFERENCES = [
  {
    file: 'packages/site/config.yml',
    required: true,
    pattern: /^currentVersion:(\s*)"[^"]*"/m,
    replace: (version, spacing) => `currentVersion:${spacing}"${version}"`
  },
  {
    file: 'README.md',
    required: false,
    pattern:
      /\[!\[Version: [^\]]*\]\(https:\/\/img\.shields\.io\/badge\/Version-[^)]*-blue\.svg\)\]/,
    // shields.io reads a dash as a separator, and a doubled dash as a dash
    replace: (version) =>
      `[![Version: ${version}](https://img.shields.io/badge/Version-${version.replaceAll('-', '--')}-blue.svg)]`
  }
]

async function readVersion() {
  const pkgPath = path.resolve('packages/assets/package.json')
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'))

  if (!pkg.version || !SEMVER_RE.test(pkg.version)) {
    console.error(`❌ Invalid or missing version in packages/assets/package.json: "${pkg.version}"`)
    process.exit(1)
  }

  return pkg.version
}

async function syncReference({ file, required, pattern, replace }, version) {
  const original = await fs.readFile(file, 'utf8')

  if (!pattern.test(original)) {
    if (!required) {
      console.log(`ℹ️  No version badge in ${file}, nothing to update there`)
      return false
    }

    console.error(`❌ No version reference in ${file}`)
    process.exit(1)
  }

  const updated = original.replace(pattern, (_match, ...groups) => replace(version, ...groups))

  if (updated === original) {
    return false
  }

  await fs.writeFile(file, updated, 'utf8')
  console.log(`📄 Updated the version in ${file} → ${version}`)
  return true
}

async function main() {
  const version = await readVersion()
  console.log(`🔄 Syncing version references to v${version}`)

  const results = []

  for (const reference of REFERENCES) {
    results.push(await syncReference(reference, version))
  }

  const updatedCount = results.filter(Boolean).length

  console.log(
    updatedCount > 0
      ? `✅ Synced ${updatedCount} of ${results.length} references`
      : 'ℹ️  Already in sync, nothing to update'
  )
}

main().catch((error) => {
  console.error(`❌ Unexpected error: ${error.message}`)
  process.exit(1)
})
