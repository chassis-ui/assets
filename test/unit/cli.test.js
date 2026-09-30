/**
 * @file cli.test.js
 * @description Tests for the command line: what it parses, what it prints, and its exit
 *              code. It builds a tree in a scratch folder.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, test } from 'vitest'
import { HELP, parseCli, run } from '../../build/cli.js'
import { BuildError } from '../../build/errors.js'
import { listTree, packageJson, png, scratch } from './helpers/tree.js'

const CLI = fileURLToPath(new URL('../../build/cli.js', import.meta.url))

const tree = {
  'package.json': packageJson({
    brands: ['chassis', 'example'],
    apps: { docs: ['web'], demo: ['ios', 'android'] }
  }),
  'source/default/docs/images/home/lego@2x.png': png(200, 100),
  'source/default/demo/images/logo.svg': '<svg/>',
  'source/example/docs/images/home/lego@2x.png': png(20, 10)
}

/**
 * Runs the command line in a scratch folder, and keeps what it prints.
 * @param {string[]} args
 * @param {Record<string, string | Uint8Array | object>} [files]
 */
async function cli(args, files = tree) {
  const root = await scratch(files)
  /** @type {string[]} */
  const log = []
  /** @type {string[]} */
  const errors = []
  const console = {
    log: (/** @type {unknown} */ message) => log.push(String(message)),
    warn: (/** @type {unknown} */ message) => log.push(String(message)),
    error: (/** @type {unknown} */ message) => errors.push(String(message))
  }
  const code = await run(args, { root, console })
  return { code, root, log: log.join('\n'), errors: errors.join('\n') }
}

describe('parseCli', () => {
  test('returns the defaults of a command without options', () => {
    expect(parseCli(['build'])).toEqual({
      command: 'build',
      brands: [],
      apps: [],
      platforms: [],
      out: undefined,
      config: undefined,
      optimize: undefined,
      dryRun: false,
      quiet: false,
      help: false,
      version: false
    })
  })

  test.each([
    ['values after the option', ['build', '--brand', 'chassis', 'example']],
    ['the option for every value', ['build', '--brand', 'chassis', '--brand', 'example']],
    ['values with commas', ['build', '--brand', 'chassis,example']],
    ['a value after the equals sign', ['build', '--brand=chassis', 'example']]
  ])('takes the values of a filter as %s', (_, args) => {
    expect(parseCli(args).brands).toEqual(['chassis', 'example'])
  })

  test('takes the three filters, each with its values', () => {
    const args = ['build', '--platform', 'ios', 'android', '--app', 'demo', '--brand', 'chassis']
    expect(parseCli(args)).toMatchObject({
      command: 'build',
      brands: ['chassis'],
      apps: ['demo'],
      platforms: ['ios', 'android']
    })
  })

  test('takes the other options', () => {
    const args = ['build', '--out', 'tmp/out', '--config', 'build.json', '--dry-run', '--quiet']
    expect(parseCli(args)).toMatchObject({
      out: 'tmp/out',
      config: 'build.json',
      dryRun: true,
      quiet: true
    })
    expect(parseCli(['build', '--optimize']).optimize).toBe(true)
    expect(parseCli(['build', '--no-optimize']).optimize).toBe(false)
    expect(parseCli(['-h']).help).toBe(true)
    expect(parseCli(['-v']).version).toBe(true)
  })

  test('reads the options after the -- that pnpm passes on', () => {
    expect(parseCli(['build', '--', '--quiet', '--brand', 'chassis'])).toMatchObject({
      command: 'build',
      quiet: true,
      brands: ['chassis']
    })
  })

  test('does not take what follows another option as the value of a filter', () => {
    expect(() => parseCli(['build', '--brand', 'chassis', '--quiet', 'example'])).toThrow(
      'Unexpected argument "example"'
    )
  })

  test.each([
    ['an unknown option', ['build', '--theme', 'dark'], "Unknown option '--theme'"],
    ['a filter without a value', ['build', '--brand'], '--brand'],
    ['an empty value', ['build', '--brand', 'chassis,'], '--brand has an empty value'],
    ['an unknown command', ['publish'], 'Unknown command "publish". The commands are: build'],
    ['a second command', ['build', 'build'], 'Unexpected argument "build"']
  ])('fails on %s', (_, args, message) => {
    expect(() => parseCli(args)).toThrow(BuildError)
    expect(() => parseCli(args)).toThrow(message)
  })

  test.each(['--clean', '--no-clean'])('says that %s is gone', (option) => {
    expect(() => parseCli(['build', option, '--brand', 'chassis'])).toThrow(
      `${option} is gone: a job removes the files of its folder that it did not write`
    )
  })
})

describe('run', () => {
  test('prints the help and the version', async () => {
    const help = await cli(['--help'])
    expect(help).toMatchObject({ code: 0, log: HELP, errors: '' })

    const version = await cli(['build', '--version'])
    expect(version).toMatchObject({ code: 0, log: 'v1.2.3' })
  })

  test('names every option that it parses in the help', () => {
    for (const option of ['brand', 'app', 'platform', 'out', 'config', 'dry-run', 'quiet']) {
      expect(HELP).toContain(`--${option}`)
    }
    expect(HELP).toContain('--optimize, --no-optimize')
  })

  test('fails without a command', async () => {
    const { code, errors } = await cli([])
    expect(code).toBe(1)
    expect(errors).toContain('A command is missing: build. See --help')
  })

  test('builds every job, and prints what each did', async () => {
    const { code, root, log, errors } = await cli(['build'])
    expect({ code, errors }).toEqual({ code: 0, errors: '' })
    expect(log).toContain('📦 Building 6 job(s)...')
    expect(log).toContain('[1/6] web/docs/chassis')
    expect(log).toContain('✔︎ dist/web/docs/chassis: 1 files, 33 B')
    expect(log).toContain('✅ 6 succeeded')
    expect(await listTree(`${root}/dist`)).toEqual([
      'android/demo/chassis/chassis-assets.json',
      'android/demo/chassis/images/drawable/logo.svg',
      'android/demo/example/chassis-assets.json',
      'android/demo/example/images/drawable/logo.svg',
      'ios/demo/chassis/chassis-assets.json',
      'ios/demo/chassis/images/logo.svg',
      'ios/demo/example/chassis-assets.json',
      'ios/demo/example/images/logo.svg',
      'web/docs/chassis/chassis-assets.json',
      'web/docs/chassis/images/home/lego@2x.png',
      'web/docs/example/chassis-assets.json',
      'web/docs/example/images/home/lego@2x.png'
    ])
  })

  test('builds the jobs of the filters into the folder of --out', async () => {
    const { code, root } = await cli(['build', '--brand', 'chassis', '--app', 'docs', '--out', 'o'])
    expect(code).toBe(0)
    expect(await listTree(`${root}/o`)).toEqual([
      'web/docs/chassis/chassis-assets.json',
      'web/docs/chassis/images/home/lego@2x.png'
    ])
  })

  test('prints the plan of a dry run, and writes nothing', async () => {
    const { code, root, log } = await cli(['build', '--dry-run', '--app', 'docs'])
    expect(code).toBe(0)
    expect(log).toContain('Dry run - showing 2 job(s) that would run')
    expect(log).toContain('• dist/web/docs/example (1 files)')
    expect(log).toContain('images/home/lego@2x.png ← source/example/docs/images/home/lego@2x.png')
    expect(await listTree(root)).not.toContain('dist/web/docs/chassis/chassis-assets.json')
    expect((await listTree(root)).filter((file) => file.startsWith('dist'))).toEqual([])
  })

  test('prints errors only with --quiet', async () => {
    const { code, log } = await cli(['build', '--quiet'])
    expect({ code, log }).toEqual({ code: 0, log: '' })
  })

  test('fails on a filter value that the configuration does not have', async () => {
    const { code, errors } = await cli(['build', '--brand', 'chasis'])
    expect(code).toBe(1)
    expect(errors).toContain('Build failed')
    expect(errors).toContain('--brand chasis (the configuration has chassis, example)')
    expect(errors).not.toMatch(/\n\s+at /)
  })

  test('fails when a job fails, and builds the others', async () => {
    const files = {
      ...tree,
      'source/default/docs/images/Alert Window.png': png(1, 1),
      'source/default/docs/images/alert-window.png': png(1, 1)
    }
    const { code, root, log, errors } = await cli(['build', '--brand', 'chassis'], files)
    expect(code).toBe(1)
    expect(errors).toContain('Failed: web/docs/chassis')
    expect(errors).toContain('two files would get one path')
    expect(log).toContain('✅ 2 succeeded, ❌ 1 failed')
    expect(await listTree(`${root}/dist`)).toEqual([
      'android/demo/chassis/chassis-assets.json',
      'android/demo/chassis/images/drawable/logo.svg',
      'ios/demo/chassis/chassis-assets.json',
      'ios/demo/chassis/images/logo.svg'
    ])
  })

  test('sets the exit code of the process', async () => {
    const root = await scratch(tree)
    const node = promisify(execFile)
    const built = await node(process.execPath, [CLI, 'build', '--app', 'docs'], { cwd: root })
    expect(built.stdout).toContain('✅ 2 succeeded')

    const failed = node(process.execPath, [CLI, 'build', '--clean'], { cwd: root })
    await expect(failed).rejects.toMatchObject({ code: 1 })
    await expect(failed).rejects.toMatchObject({
      stderr: expect.stringContaining('--clean is gone')
    })
  })
})
