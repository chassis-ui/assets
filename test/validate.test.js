/**
 * @file validate.test.js
 * @description `DistValidator` of `build/validate-assets.js` against the golden output: it
 *              passes on the baseline, and each of its checks fails, naming the problem, on a
 *              copy of the baseline that breaks it.
 */

import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest'
import DistValidator from '../build/validate-assets.js'
import { FIXTURE, GOLDEN, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

/** A copy of the golden output, to break. */
function goldenCopy() {
  const out = tempDir()
  fs.cpSync(GOLDEN, out, { recursive: true })
  return out
}

/**
 * Validate an output of the fixture.
 * @param {string} out
 */
async function validate(out) {
  const validator = new DistValidator({ cwd: FIXTURE, out })
  const ok = await validator.runValidation()
  const failed = validator.validationResults.filter((r) => !r.passed).map((r) => r.checkName)
  return { ok, failed, errors: validator.errors, warnings: validator.warnings }
}

describe('DistValidator', () => {
  test('passes on the golden output, with the eight checks', async () => {
    const validator = new DistValidator({ cwd: FIXTURE, out: '../golden' })
    expect(await validator.runValidation()).toBe(true)
    expect(validator.validationResults.map((r) => r.checkName)).toEqual([
      'Dist Exists',
      'Source Exists',
      'All Combinations Exist',
      'Asset Types Complete',
      'All Source Files Present',
      'Asset Expansion',
      'No Empty Directories',
      'Platform Naming Conventions'
    ])
    expect(validator.errors).toEqual([])
    expect(validator.warnings).toEqual([])
  })

  test('fails on a missing file and names it', async () => {
    const out = goldenCopy()
    fs.rmSync(path.join(out, 'web/site/alpha/images/hero-banner.png'))
    fs.rmSync(path.join(out, 'android/mobile/beta/images/drawable/hero_banner.png'))
    const { ok, failed, errors } = await validate(out)
    expect(ok).toBe(false)
    expect(failed).toEqual(['All Source Files Present'])
    expect(errors).toEqual([
      'web/site/alpha: images/hero-banner.png',
      'android/mobile/beta: images/drawable/hero_banner.png'
    ])
  })

  test('fails on a missing job', async () => {
    const out = goldenCopy()
    fs.rmSync(path.join(out, 'ios/mobile/beta'), { recursive: true })
    const { ok, failed, errors } = await validate(out)
    expect(ok).toBe(false)
    expect(failed).toContain('All Combinations Exist')
    expect(errors).toContain('Missing: ios/mobile/beta')
  })

  test('fails on a missing type folder', async () => {
    const out = goldenCopy()
    fs.rmSync(path.join(out, 'web/site/beta/fonts'), { recursive: true })
    const { failed, errors } = await validate(out)
    expect(failed).toContain('Asset Types Complete')
    expect(errors).toContain('web/site/beta missing fonts/')
  })

  test('fails on a folder a missing file leaves empty', async () => {
    const out = goldenCopy()
    fs.rmSync(path.join(out, 'android/mobile/beta/images/logo/drawable-xhdpi/mark.png'))
    const { failed, errors } = await validate(out)
    expect(failed).toEqual(['All Source Files Present', 'No Empty Directories'])
    expect(errors).toEqual(['android/mobile/beta: images/logo/drawable-xhdpi/mark.png'])
  })

  test('fails on an empty folder', async () => {
    const out = goldenCopy()
    fs.mkdirSync(path.join(out, 'web/site/alpha/videos'))
    const { failed } = await validate(out)
    expect(failed).toEqual(['No Empty Directories'])
  })

  test.each([
    ['web/site/alpha/icons/arrow_left.svg', 'Web file uses underscores'],
    ['ios/mobile/alpha/icons/arrow-left.svg', 'ios file uses hyphens'],
    ['android/mobile/alpha/icons/arrow_left.svg', 'Android icon missing ic_ prefix']
  ])('fails on a name against the rules: %s', async (file, warning) => {
    const out = goldenCopy()
    fs.writeFileSync(path.join(out, file), 'wrong name')
    const { failed, warnings } = await validate(out)
    expect(failed).toEqual(['Platform Naming Conventions'])
    expect(warnings.some((w) => w.startsWith(warning))).toBe(true)
  })

  test('leaves hidden files out of the naming check (T13)', async () => {
    const out = goldenCopy()
    fs.writeFileSync(path.join(out, 'web/site/alpha/images/.DS_Store'), '')
    fs.writeFileSync(path.join(out, 'ios/mobile/alpha/._Icon_file'), '')
    const { ok, failed } = await validate(out)
    expect(failed).toEqual([])
    expect(ok).toBe(true)
  })

  test('fails when the output does not exist', async () => {
    const { ok, failed } = await validate(path.join(tempDir(), 'missing'))
    expect(ok).toBe(false)
    expect(failed).toContain('Dist Exists')
  })
})
