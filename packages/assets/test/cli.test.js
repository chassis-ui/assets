/**
 * @file cli.test.js
 * @description The command-line entries of the build and its checks, run as
 *              `node build/<entry>.js` the way the `pnpm assets*` scripts run them: the
 *              flags of the build-system page, the exit codes, and the messages of a wrong
 *              call. Every run reads the fixture and writes to a temporary folder.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import {
  ANALYZE_CLI,
  BUILD_CLI,
  CLI,
  CONTRACT_CLI,
  FIXTURE,
  GOLDEN,
  LINT_SOURCE_CLI,
  VALIDATE_CLI,
  VERIFY_CLI,
  compareDirs,
  listFiles,
  read,
  removeTempDirs,
  ROOT,
  tempDir
} from './helpers.js'

afterAll(removeTempDirs)

/** The version of the build, in `packages/assets/package.json`. */
const VERSION = JSON.parse(read(ROOT, 'package.json')).version

/**
 * Run an entry with Node.js, in the fixture unless another folder is given.
 * @param {string} entry
 * @param {string[]} args
 * @param {string} [cwd]
 */
function run(entry, args, cwd = FIXTURE) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, CHASSIS_ALLOW_LFS_POINTERS: '' }
  })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

const assets = (...args) => run(BUILD_CLI, args)

describe('pnpm assets', () => {
  test('--help prints every option and exits 0', () => {
    const { code, stdout } = assets('--help')
    expect(code).toBe(0)
    for (const flag of [
      '--brand',
      '--app',
      '--platform',
      '--type',
      '--include',
      '--clean',
      '--no-clean',
      '--out',
      '--cwd',
      '--watch',
      '--dry-run',
      '--allow-lfs-pointers',
      '--vector-drawables',
      '--asset-catalog',
      '--res',
      '--optimize',
      '--webp',
      '--avif',
      '--quiet',
      '--help',
      '--version'
    ]) {
      expect(stdout).toContain(flag)
    }
  })

  test('--version prints the version of the build, not that of package.json in cwd', () => {
    expect(assets('--version')).toMatchObject({ code: 0, stdout: `${VERSION}\n` })
    expect(assets('-v', '--cwd', FIXTURE).stdout).toBe(`${VERSION}\n`)
  })

  test('the repository root is found from a folder below it', () => {
    const below = path.join(FIXTURE, 'source', 'alpha', 'site')
    const { code, stdout } = run(BUILD_CLI, ['--dry-run'], below)
    expect(code).toBe(0)
    expect(stdout).toContain('6 jobs')
  })

  test('a full build writes the golden output and exits 0', () => {
    const out = tempDir()
    const { code, stdout } = assets('--out', out)
    expect(code).toBe(0)
    expect(stdout).toContain('Assets build completed successfully')
    expect(compareDirs(GOLDEN, out)).toEqual({ missing: [], extra: [], changed: [] })
  })

  test('--quiet prints nothing on success', () => {
    const { code, stdout, stderr } = assets('--out', tempDir(), '--quiet')
    expect(code).toBe(0)
    expect(stdout).toBe('')
    expect(stderr).toBe('')
  })

  test.each([
    [
      ['--brand', 'beta'],
      ['android/mobile/beta', 'ios/mobile/beta', 'web/site/beta']
    ],
    [
      ['--app', 'site'],
      ['web/site/alpha', 'web/site/beta']
    ],
    [
      ['--platform', 'ios', 'android', '--brand', 'alpha'],
      ['android/mobile/alpha', 'ios/mobile/alpha']
    ]
  ])('%j writes the selected jobs only', (args, jobs) => {
    const out = tempDir()
    expect(assets('--out', out, '--quiet', ...args).code).toBe(0)
    const written = [...new Set(listFiles(out).map((f) => f.split('/').slice(0, 3).join('/')))]
    expect(written.sort()).toEqual(jobs)
  })

  test('--clean with filters removes the selected jobs only, --no-clean keeps all', () => {
    const out = tempDir()
    assets('--out', out, '--quiet')
    fs.writeFileSync(path.join(out, 'web/site/alpha/stray.txt'), 'x')
    fs.writeFileSync(path.join(out, 'web/site/beta/stray.txt'), 'x')

    expect(assets('--out', out, '--quiet', '--no-clean').code).toBe(0)
    expect(fs.existsSync(path.join(out, 'web/site/alpha/stray.txt'))).toBe(true)

    expect(assets('--out', out, '--quiet', '--clean', '--brand', 'alpha').code).toBe(0)
    expect(fs.existsSync(path.join(out, 'web/site/alpha/stray.txt'))).toBe(false)
    expect(fs.existsSync(path.join(out, 'web/site/beta/stray.txt'))).toBe(true)
  })

  test('--dry-run prints the jobs and writes nothing', () => {
    const out = path.join(tempDir(), 'out')
    const { code, stdout } = assets('--out', out, '--dry-run')
    expect(code).toBe(0)
    expect(fs.existsSync(out)).toBe(false)
    expect(stdout).toContain('alpha - site - web: ')
    expect(stdout).toContain('beta - mobile - android: ')
    expect(stdout).toMatch(/\d+ files in 6 jobs/)
  })

  test('an unknown value exits 1 and names the configured values', () => {
    const { code, stderr } = assets('--out', tempDir(), '--brand', 'nope')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown brand "nope". Configured: alpha, beta')
  })

  test('filters that select no job exit 1', () => {
    const { code, stderr } = assets('--out', tempDir(), '--app', 'site', '--platform', 'ios')
    expect(code).toBe(1)
    expect(stderr).toContain('The filters select no job')
  })

  test.each([
    [['--nope'], 'Unknown option --nope'],
    [['--brand'], '--brand needs at least one value'],
    [['--out'], '--out needs a value']
  ])('%j exits 2', (args, message) => {
    const { code, stderr } = assets(...args)
    expect(code).toBe(2)
    expect(stderr).toContain(message)
  })
})

describe('pnpm assets:analyze', () => {
  test('reports the duplicate of the fixture and exits 0', () => {
    const { code, stdout } = run(ANALYZE_CLI, ['--out', '../golden'])
    expect(code).toBe(0)
    expect(stdout).toContain('In Source (1 groups)')
    expect(stdout).toContain('Platform Distribution')
  })

  test('--help prints every option and exits 0', () => {
    const { code, stdout } = run(ANALYZE_CLI, ['--help'])
    expect(code).toBe(0)
    for (const flag of ['--brand', '--app', '--platform', '--out', '--cwd', '--quiet', '--help']) {
      expect(stdout).toContain(flag)
    }
  })

  test('an unknown option exits 1', () => {
    const { code, stderr } = run(ANALYZE_CLI, ['--nope'])
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown option --nope')
  })
})

describe('pnpm assets:validate', () => {
  test('exits 0 on the golden output', () => {
    const { code, stdout } = run(VALIDATE_CLI, ['--out', '../golden'])
    expect(code).toBe(0)
    expect(stdout).toContain('Overall: 8/8 checks passed')
  })

  test('exits 1 on an output with a file missing, and names it', () => {
    const out = tempDir()
    fs.cpSync(GOLDEN, out, { recursive: true })
    fs.rmSync(path.join(out, 'ios/mobile/alpha/fonts/display.ttf'))
    const { code, stdout } = run(VALIDATE_CLI, ['--out', out])
    expect(code).toBe(1)
    expect(stdout).toContain('ios/mobile/alpha: fonts/display.ttf')
  })

  test.each([
    ['validate', VALIDATE_CLI],
    ['contract', CONTRACT_CLI],
    ['verify', VERIFY_CLI]
  ])('%s --help prints every option and exits 0', (_name, entry) => {
    const { code, stdout } = run(entry, ['--help'])
    expect(code).toBe(0)
    for (const flag of ['--out', '--cwd', '--help']) {
      expect(stdout).toContain(flag)
    }
  })

  test('an unknown option exits 2', () => {
    const { code, stderr } = run(VALIDATE_CLI, ['--nope'])
    expect(code).toBe(2)
    expect(stderr).toContain('Unknown option --nope')
  })
})

describe('pnpm assets:lint:source', () => {
  test('exits 1 on the fixture, whose names break the rules on purpose, and names them', () => {
    const { code, stdout, stderr } = run(LINT_SOURCE_CLI, [])
    expect(code).toBe(1)
    expect(stderr).toContain('source/default/site/images/HeroBanner.png has the name "HeroBanner"')
    expect(stdout).toContain('42 files checked: 7 error(s), 0 warning(s)')
  })

  test('exits 0 on a source that keeps the rules', () => {
    const root = tempDir()
    fs.copyFileSync(path.join(FIXTURE, 'package.json'), path.join(root, 'package.json'))
    fs.mkdirSync(path.join(root, 'source/default/site/images'), { recursive: true })
    fs.writeFileSync(path.join(root, 'source/default/site/images/hero-banner@2x.png'), 'png')
    const { code, stdout } = run(LINT_SOURCE_CLI, ['--cwd', root])
    expect(code).toBe(0)
    expect(stdout).toContain('1 files checked: 0 error(s), 0 warning(s)')
  })

  test('--help exits 0, an unknown option exits 2', () => {
    expect(run(LINT_SOURCE_CLI, ['--help'])).toMatchObject({ code: 0 })
    expect(run(LINT_SOURCE_CLI, ['--nope'])).toMatchObject({ code: 2 })
  })
})

describe('pnpm assets:contract and assets:verify', () => {
  /** The golden output without a file of the fixture's contract, in a temporary folder. */
  function brokenOutput() {
    const out = tempDir()
    fs.cpSync(GOLDEN, out, { recursive: true })
    fs.rmSync(path.join(out, 'web/site/alpha/images/hero-banner.png'))
    return out
  }

  test('the contract check exits 0 on the golden output, by the contracts of chassis.checks.json', () => {
    const { code, stdout } = run(CONTRACT_CLI, ['--out', '../golden'])
    expect(code).toBe(0)
    expect(stdout).toContain('../golden/web/site/alpha/ has every file its consumers read')
  })

  test('the contract check exits 1 on an output without a file, and names it and its reader', () => {
    const { code, stderr } = run(CONTRACT_CLI, ['--out', brokenOutput()])
    expect(code).toBe(1)
    expect(stderr).toContain('images/hero-banner.png, read by the layout of the fixture site')
  })

  test('the contract check exits 0 in a repository without chassis.checks.json', () => {
    const root = tempDir()
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ chassis: { build: { brands: ['alpha'], apps: { site: ['web'] } } } })
    )
    const { code, stdout } = run(CONTRACT_CLI, ['--cwd', root])
    expect(code).toBe(0)
    expect(stdout).toContain('nothing to check')
  })

  test('verify runs the validator and the contract check, and exits 0 when both pass', () => {
    const { code, stdout } = run(VERIFY_CLI, ['--out', '../golden'])
    expect(code).toBe(0)
    expect(stdout).toContain('Overall: 8/8 checks passed')
    expect(stdout).toContain('Verify passed')
  })

  test('verify exits 1 when the contract check fails', () => {
    const { code, stderr } = run(VERIFY_CLI, ['--out', brokenOutput()])
    expect(code).toBe(1)
    expect(stderr).toContain('Verify failed')
    expect(stderr).toContain('the consumer contract')
  })

  test('an unknown option exits 2', () => {
    expect(run(CONTRACT_CLI, ['--nope'])).toMatchObject({ code: 2 })
    expect(run(VERIFY_CLI, ['--nope'])).toMatchObject({ code: 2 })
  })
})

describe('cli.js', () => {
  const cli = (...args) => run(CLI, args)

  test('build runs the build with its options', () => {
    const out = tempDir()
    expect(cli('build', '--out', out, '--quiet').code).toBe(0)
    expect(compareDirs(GOLDEN, out)).toEqual({ missing: [], extra: [], changed: [] })
  })

  test.each([
    ['analyze', ['--quiet', '--out', '../golden']],
    ['validate', ['--out', '../golden']],
    ['contract', ['--out', '../golden']],
    ['verify', ['--out', '../golden']],
    ['lint-source', ['--help']]
  ])('%s runs its module', (command, args) => {
    expect(cli(command, ...args).code).toBe(0)
  })

  test('--version prints the version of the build', () => {
    expect(cli('--version')).toMatchObject({ code: 0, stdout: `${VERSION}\n` })
    expect(cli('build', '--version').stdout).toBe(`${VERSION}\n`)
  })

  test('--help names every command and exits 0', () => {
    const { code, stdout } = cli('--help')
    expect(code).toBe(0)
    for (const command of ['build', 'analyze', 'validate', 'contract', 'verify', 'lint-source']) {
      expect(stdout).toContain(`  ${command} `)
    }
  })

  test('no command prints the help and exits 2', () => {
    const { code, stdout } = cli()
    expect(code).toBe(2)
    expect(stdout).toContain('Usage: chassis-assets <command>')
  })

  test('an unknown command exits 2 and names the commands', () => {
    const { code, stderr } = cli('bulid')
    expect(code).toBe(2)
    expect(stderr).toContain('Unknown command bulid')
    expect(stderr).toContain('build, analyze')
  })
})
