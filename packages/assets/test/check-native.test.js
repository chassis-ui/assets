/**
 * @file check-native.test.js
 * @description `chassis-assets check-native`: what it runs on an output. The compilers need
 *              Xcode and the Android SDK, so the Native iOS and Native Android jobs of CI run the
 *              checks themselves, on `test/native/fixture/`.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, test } from 'vitest'
import { planChecks } from '../build/check-native.js'
import { CLI, removeTempDirs, ROOT, tempDir } from './helpers.js'

afterAll(removeTempDirs)

describe('planChecks', () => {
  test('takes the platforms with a folder in the output, in order, and web has no check', () => {
    const cwd = tempDir()
    for (const platform of ['web', 'android', 'ios']) {
      fs.mkdirSync(path.join(cwd, 'dist', platform), { recursive: true })
    }
    const { output, checks } = planChecks({ cwd })
    expect(output).toBe(path.join(cwd, 'dist'))
    expect(checks.map(({ platform }) => platform)).toEqual(['ios', 'android'])
    for (const { script } of checks) expect(fs.existsSync(script)).toBe(true)
  })

  test('the platforms given win, a platform without a check and an empty output are refused', () => {
    const cwd = tempDir()
    expect(planChecks({ cwd, platforms: ['android'] }).checks).toHaveLength(1)
    expect(() => planChecks({ cwd, platforms: ['web'] })).toThrow('No check of web')
    expect(() => planChecks({ cwd })).toThrow('Run the build first')
  })
})

describe('the command', () => {
  test('is published: the scripts are under build/, which files of the package names', () => {
    const { files } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
    expect(files).toContain('build')
    expect(fs.existsSync(path.join(ROOT, 'build/native/ios.sh'))).toBe(true)
  })

  test('a new repository has nothing to compile, and an image without res/ is a wrong build', () => {
    const cwd = tempDir()
    const job = path.join(cwd, 'dist', 'android', 'site', 'main')
    fs.mkdirSync(path.join(job, 'other'), { recursive: true })
    fs.writeFileSync(path.join(job, 'other', 'readme.txt'), 'text\n')
    const empty = spawnSync(
      process.execPath,
      [CLI, 'check-native', '--platform', 'android', '--cwd', cwd],
      { encoding: 'utf-8', env: { ...process.env, AAPT2: '/bin/true', ANDROID_JAR: '/bin/true' } }
    )
    expect(empty.status).toBe(0)
    expect(empty.stdout).toContain('Nothing to compile')

    fs.mkdirSync(path.join(job, 'images'))
    fs.writeFileSync(path.join(job, 'images', 'a.png'), 'x')
    const result = spawnSync(
      process.execPath,
      [CLI, 'check-native', '--platform', 'android', '--cwd', cwd],
      { encoding: 'utf-8', env: { ...process.env, AAPT2: '/bin/true', ANDROID_JAR: '/bin/true' } }
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('no res/ folder')
  })

  test('without the Android SDK, it says what is missing', () => {
    const cwd = tempDir()
    fs.mkdirSync(path.join(cwd, 'dist', 'android'), { recursive: true })
    const run = (env) =>
      spawnSync(process.execPath, [CLI, 'check-native', '--platform', 'android', '--cwd', cwd], {
        encoding: 'utf-8',
        env: { PATH: '/usr/bin:/bin', ...env }
      })

    const noSdk = run({})
    expect(noSdk.status).toBe(1)
    expect(noSdk.stderr).toContain('no aapt2')

    const noPlatform = run({ ANDROID_HOME: tempDir(), AAPT2: '/bin/true' })
    expect(noPlatform.status).toBe(1)
    expect(noPlatform.stderr).toContain('no android.jar')
  })

  test('exits 2 on a wrong call', () => {
    const result = spawnSync(process.execPath, [CLI, 'check-native', '--zip'], {
      encoding: 'utf-8'
    })
    expect(result.status).toBe(2)
  })
})
