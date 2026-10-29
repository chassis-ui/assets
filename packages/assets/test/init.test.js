/**
 * @file init.test.js
 * @description `chassis-assets init`: the baseline of a repository of assets, written into a
 *              temporary folder, read back, and run through the lint, the build, the
 *              verification and the archives of this package, so that a new repository
 *              passes its own CI.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { DEFAULTS, init, parseApp, parseInitArgs, planFiles } from '../build/init.js'
import { getPlatformNames } from '../build/processors/index.js'
import { CLI, listFiles, read, removeTempDirs, ROOT, tempDir } from './helpers.js'

afterAll(removeTempDirs)

/** The version of the build, in `packages/assets/package.json`. */
const VERSION = JSON.parse(read(ROOT, 'package.json')).version

/** The files init writes, relative to the folder, in order. */
const FILES = [
  'package.json',
  'chassis.checks.json',
  '.gitattributes',
  '.gitignore',
  '.nvmrc',
  'README.md',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  'source/_default/_shared/other/readme.txt'
]

/**
 * Run a command of the CLI in a folder.
 * @param {string} cwd
 * @param {string[]} args
 */
function run(cwd, ...args) {
  const result = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf-8' })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

describe('chassis-assets init', () => {
  test('writes the files of a repository with the defaults, named after the folder', async () => {
    const dir = path.join(tempDir(), 'acme-assets')
    const result = await init({ dir })
    expect(result).toEqual({ dir, files: FILES, existing: [], written: true })
    expect(listFiles(dir)).toEqual([...FILES].sort())

    const pkg = JSON.parse(read(dir, 'package.json'))
    expect(pkg.name).toBe('acme-assets')
    expect(pkg.version).toBe('0.1.0')
    expect(pkg.private).toBe(true)
    expect(pkg.chassis).toEqual({
      defaults: { brandFolder: '_default' },
      build: { brands: DEFAULTS.brands, apps: DEFAULTS.apps }
    })
    expect(Object.keys(pkg.scripts)).toEqual(['build', 'lint', 'verify', 'archive', 'analyze'])
    expect(pkg.scripts.build).toBe('chassis-assets build')
    expect(pkg.devDependencies).toEqual({ '@chassis-ui/assets': `^${VERSION}` })

    expect(JSON.parse(read(dir, 'chassis.checks.json'))).toEqual({
      contracts: {},
      lint: { allow: [] }
    })
    expect(read(dir, '.nvmrc')).toBe('24\n')
    expect(read(dir, '.gitattributes')).toContain('*.woff2 filter=lfs diff=lfs merge=lfs -text')
    expect(read(dir, '.gitignore')).toContain('dist/')
    expect(read(dir, 'README.md')).toContain('# acme-assets')
    expect(read(dir, 'README.md')).toContain('`npm run build`')
    expect(read(dir, 'README.md')).not.toContain('__')
  })

  test('the workflows name npm by default, and pnpm with --pm pnpm', async () => {
    const npm = path.join(tempDir(), 'npm-assets')
    await init({ dir: npm })
    const ci = read(npm, '.github/workflows/ci.yml')
    expect(ci).toContain('cache: npm')
    expect(ci).toContain('run: npm ci')
    expect(ci).toContain('run: npm run verify')
    expect(ci).not.toContain('pnpm')
    expect(ci).not.toContain('__')
    const release = read(npm, '.github/workflows/release.yml')
    expect(release).toContain("tags: ['v*']")
    expect(release).toContain('npx chassis-assets archive --to')
    expect(release).toContain('gh release create "$GITHUB_REF_NAME"')
    expect(release).not.toContain('__')

    const pnpm = path.join(tempDir(), 'pnpm-assets')
    await init({ dir: pnpm, pm: 'pnpm' })
    for (const file of ['.github/workflows/ci.yml', '.github/workflows/release.yml']) {
      const text = read(pnpm, file)
      expect(text).toContain('uses: pnpm/action-setup@')
      expect(text).toContain('cache: pnpm')
      expect(text).toContain('run: pnpm install --frozen-lockfile')
      expect(text).toContain('run: pnpm verify')
      // The setup step sits before Node.js, and a blank line separates the two
      expect(text).toMatch(/version: 10\n\n {6}- name: Setup Node\.js/)
      expect(text).not.toContain('__')
    }
    expect(read(pnpm, 'README.md')).toContain('`pnpm build`')
  })

  test('--name, --brand and --app set the package and the chassis block', async () => {
    const dir = path.join(tempDir(), 'folder')
    await init({
      dir,
      name: '@acme/assets',
      brands: ['acme', 'beta'],
      apps: { docs: ['web'], mobile: ['ios', 'android'] }
    })
    const pkg = JSON.parse(read(dir, 'package.json'))
    expect(pkg.name).toBe('@acme/assets')
    expect(pkg.chassis.build).toEqual({
      brands: ['acme', 'beta'],
      apps: { docs: ['web'], mobile: ['ios', 'android'] }
    })
    expect(read(dir, 'README.md')).toContain('# @acme/assets')
  })

  test('a new repository passes the lint, the build, the verification and the archives', async () => {
    const dir = path.join(tempDir(), 'acme-assets')
    await init({
      dir,
      brands: ['acme', 'beta'],
      apps: { docs: ['web'], mobile: ['ios', 'android'] }
    })

    expect(run(dir, 'lint-source')).toMatchObject({ code: 0 })
    expect(run(dir, 'build', '--quiet')).toMatchObject({ code: 0 })
    expect(listFiles(path.join(dir, 'dist'))).toEqual([
      'android/mobile/acme/other/readme.txt',
      'android/mobile/beta/other/readme.txt',
      'ios/mobile/acme/other/readme.txt',
      'ios/mobile/beta/other/readme.txt',
      'web/docs/acme/other/readme.txt',
      'web/docs/beta/other/readme.txt'
    ])
    const verify = run(dir, 'verify')
    expect(verify).toMatchObject({ code: 0 })
    expect(verify.stdout).toContain('✅ Verify passed')
    const archive = run(dir, 'archive')
    expect(archive).toMatchObject({ code: 0 })
    expect(fs.readdirSync(path.join(dir, 'archives')).sort()).toEqual([
      'acme-assets-android-mobile-acme-0.1.0.zip',
      'acme-assets-android-mobile-beta-0.1.0.zip',
      'acme-assets-ios-mobile-acme-0.1.0.zip',
      'acme-assets-ios-mobile-beta-0.1.0.zip',
      'acme-assets-web-docs-acme-0.1.0.zip',
      'acme-assets-web-docs-beta-0.1.0.zip'
    ])
  })

  test('writes nothing when a file exists, names it, and --force writes over it', async () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'README.md'), 'mine\n')
    await expect(init({ dir })).rejects.toThrow(
      `A file to write exists in ${dir}: README.md. --force writes over it`
    )
    expect(listFiles(dir)).toEqual(['README.md'])
    expect(read(dir, 'README.md')).toBe('mine\n')

    const result = await init({ dir, force: true })
    expect(result.existing).toEqual(['README.md'])
    expect(read(dir, 'README.md')).toContain('# ')
    expect(listFiles(dir)).toEqual([...FILES].sort())
  })

  test('--dry-run writes nothing, and reports the files that exist', async () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, '.nvmrc'), '22\n')
    const result = await init({ dir, dryRun: true })
    expect(result).toEqual({ dir, files: FILES, existing: ['.nvmrc'], written: false })
    expect(listFiles(dir)).toEqual(['.nvmrc'])

    const { code, stdout } = run(dir, 'init', '--dry-run')
    expect(code).toBe(0)
    expect(stdout).toContain('📄 .nvmrc (exists)')
    expect(stdout).toContain('📄 package.json\n')
    expect(stdout).toContain('Dry run: 9 files to write in ., 1 of them exist')
    expect(listFiles(dir)).toEqual(['.nvmrc'])
  })

  test('parseApp reads <name>:<platforms>, and refuses a wrong form or an unknown platform', () => {
    expect(parseApp('docs:web')).toEqual({ app: 'docs', platforms: ['web'] })
    expect(parseApp('mobile:ios,android,ios')).toEqual({
      app: 'mobile',
      platforms: ['ios', 'android']
    })
    expect(() => parseApp('docs')).toThrow('An app is <name>:<platform>[,<platform>…]')
    expect(() => parseApp('docs:')).toThrow('An app is <name>:<platform>[,<platform>…]')
    expect(() => parseApp('docs:web:ios')).toThrow('An app is <name>:<platform>[,<platform>…]')
    expect(() => parseApp('docs:webb')).toThrow(
      `Unknown platform webb of the app docs. Platforms: ${getPlatformNames().join(', ')}`
    )
    expect(() => parseApp('Docs:web')).toThrow(
      'An app name is lowercase letters, digits and hyphens'
    )
  })

  test('a brand or app name that starts with _ or is not lowercase is refused, nothing written', async () => {
    const dir = tempDir()
    await expect(init({ dir, brands: ['_main'] })).rejects.toThrow(
      'A brand name cannot start with _: _main'
    )
    await expect(init({ dir, brands: ['Main'] })).rejects.toThrow(
      'A brand name is lowercase letters, digits and hyphens: Main'
    )
    await expect(init({ dir, apps: { _docs: ['web'] } })).rejects.toThrow(
      'An app name cannot start with _: _docs'
    )
    expect(() => planFiles({ dir, pm: /** @type {any} */ ('yarn') })).toThrow(
      'Unknown package manager yarn. One of npm, pnpm'
    )
    expect(listFiles(dir)).toEqual([])
  })

  test('parseInitArgs reads the folder, the lists and the flags', () => {
    expect(
      parseInitArgs([
        'assets',
        '--name',
        '@acme/assets',
        '--brand',
        'acme',
        'beta',
        '--app',
        'docs:web',
        'mobile:ios,android',
        '--pm',
        'pnpm',
        '--force',
        '--dry-run'
      ])
    ).toEqual({
      dir: 'assets',
      name: '@acme/assets',
      brands: ['acme', 'beta'],
      apps: { docs: ['web'], mobile: ['ios', 'android'] },
      pm: 'pnpm',
      force: true,
      dryRun: true,
      help: false
    })
    expect(parseInitArgs(['--app', 'docs:web', '--app', 'demo:ios']).apps).toEqual({
      docs: ['web'],
      demo: ['ios']
    })
    expect(() => parseInitArgs(['--brand'])).toThrow('--brand needs a value')
    expect(() => parseInitArgs(['--name', 'a', 'b'])).toThrow('--name takes one value')
    expect(() => parseInitArgs(['--pm', 'yarn'])).toThrow('Unknown package manager yarn')
    expect(() => parseInitArgs(['--app', 'docs:web', 'docs:ios'])).toThrow(
      'The app docs is given twice'
    )
    expect(() => parseInitArgs(['--brand', '_x'])).toThrow('A brand name cannot start with _')
    expect(() => parseInitArgs(['a', 'b'])).toThrow('One folder at most: a and b')
    expect(() => parseInitArgs(['--zip'])).toThrow('Unknown option --zip')
  })

  test('the command prints the files and the next steps, and exits 2 on a wrong call', () => {
    const parent = tempDir()
    const { code, stdout } = run(parent, 'init', 'acme-assets', '--brand', 'acme')
    expect(code).toBe(0)
    for (const file of FILES) expect(stdout).toContain(`📄 ${file}\n`)
    expect(stdout).toContain('✅ 9 files in acme-assets')
    expect(stdout).toContain(
      '  cd acme-assets\n  git init && git lfs install\n  npm install\n  npm run build'
    )
    expect(listFiles(path.join(parent, 'acme-assets'))).toEqual([...FILES].sort())

    expect(run(parent, 'init', '--app', 'docs')).toMatchObject({ code: 2 })
    expect(run(parent, 'init', '--help')).toMatchObject({ code: 0 })
    expect(run(parent, 'init', '--help').stdout).toContain('--app <name:platforms>')
    // The folder exists now: exit 1, and the file is named
    const again = run(parent, 'init', 'acme-assets')
    expect(again.code).toBe(1)
    expect(again.stderr).toContain('--force writes over them')
  })
})
