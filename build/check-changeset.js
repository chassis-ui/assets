#!/usr/bin/env node

/*!
 * Changeset Check Script
 *
 * Fails when the commits since a base change `source/` or `packages/assets/build/` and add
 * no changeset. `changeset status` cannot do this alone: `source/` is at the repository
 * root, outside the package that carries the version, so Changesets counts a change to it
 * for no package.
 *
 * A release commit passes: `pnpm changeset:version` removes the changesets and bumps the
 * version, so a changed version stands for them.
 *
 * Usage:
 *   node build/check-changeset.js <base>
 *
 * <base> is a commit or a branch, `origin/develop` for a pull request against `develop`.
 * The comparison starts at the merge base. Needs Git and the history up to the base.
 *
 * Copyright 2025-2026 Ozgur Gunes
 * Licensed under MIT
 */

import { execFileSync } from 'node:child_process'

const RELEASED_PATHS = ['source/', 'packages/assets/build/']
const PACKAGE_JSON = 'packages/assets/package.json'
const CHANGESET_RE = /^\.changeset\/(?!README\.md$)[^/]+\.md$/

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function versionAt(commit) {
  try {
    return JSON.parse(git('show', `${commit}:${PACKAGE_JSON}`)).version
  } catch {
    return null
  }
}

const base = process.argv[2]

if (!base) {
  console.error('USAGE: check-changeset <base>')
  process.exit(1)
}

const mergeBase = git('merge-base', base, 'HEAD')
const changes = git('diff', '--name-status', '--no-renames', mergeBase, 'HEAD')
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [status, file] = line.split('\t')
    return { status, file }
  })

const released = changes.filter(({ file }) => RELEASED_PATHS.some((dir) => file.startsWith(dir)))
const changesets = changes.filter(({ status, file }) => status === 'A' && CHANGESET_RE.test(file))

if (released.length === 0) {
  console.log('✅ No change to source/ or packages/assets/build/, no changeset needed')
} else if (changesets.length > 0) {
  console.log(`✅ ${released.length} released files changed, with ${changesets.length} changesets`)
} else if (versionAt(mergeBase) !== versionAt('HEAD')) {
  console.log(
    `✅ ${released.length} released files changed, in the release of ${versionAt('HEAD')}`
  )
} else {
  console.error(`❌ ${released.length} files of source/ or packages/assets/build/ changed`)
  console.error('   and no changeset was added. Run pnpm changeset and commit the file.')

  for (const { file } of released.slice(0, 10)) {
    console.error(`   ${file}`)
  }

  process.exit(1)
}
