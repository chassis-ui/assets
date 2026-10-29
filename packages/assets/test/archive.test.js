/**
 * @file archive.test.js
 * @description `pnpm assets:archive`: one zip per platform, app and brand of an output, read
 *              back entry by entry. The archives of the golden output are written to a
 *              temporary folder, and each entry is inflated and compared with its file.
 */

import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { afterAll, describe, expect, test } from 'vitest'
import { archive, crc32, dosDateTime, zipFolder } from '../build/archive.js'
import { CLI, FIXTURE, GOLDEN, listFiles, removeTempDirs, tempDir } from './helpers.js'

afterAll(removeTempDirs)

/** The six jobs of the fixture, as the folders of the golden output. */
const JOBS = [
  'android/mobile/alpha',
  'android/mobile/beta',
  'ios/mobile/alpha',
  'ios/mobile/beta',
  'web/site/alpha',
  'web/site/beta'
]

/**
 * The entries of a ZIP archive, read from its central directory, each with its content
 * inflated. A reader of the plain format only, enough for the archives the build writes.
 * @param {string} file
 * @returns {Array<{ name: string, size: number, crc: number, method: number, content: Buffer }>}
 */
function readZip(file) {
  const zip = fs.readFileSync(file)
  const end = zip.length - 22
  expect(zip.readUInt32LE(end)).toBe(0x06_05_4b_50)
  const count = zip.readUInt16LE(end + 10)
  let offset = zip.readUInt32LE(end + 16)
  const entries = []
  for (let n = 0; n < count; n++) {
    expect(zip.readUInt32LE(offset)).toBe(0x02_01_4b_50)
    const method = zip.readUInt16LE(offset + 10)
    const crc = zip.readUInt32LE(offset + 16)
    const compressed = zip.readUInt32LE(offset + 20)
    const size = zip.readUInt32LE(offset + 24)
    const nameLength = zip.readUInt16LE(offset + 28)
    const extraLength = zip.readUInt16LE(offset + 30)
    const commentLength = zip.readUInt16LE(offset + 32)
    const local = zip.readUInt32LE(offset + 42)
    const name = zip.toString('utf-8', offset + 46, offset + 46 + nameLength)

    expect(zip.readUInt32LE(local)).toBe(0x04_03_4b_50)
    const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
    const data = zip.subarray(dataStart, dataStart + compressed)
    const content = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data)
    entries.push({ name, size, crc, method, content })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

describe('pnpm assets:archive', () => {
  const run = (...args) =>
    spawnSync(process.execPath, [CLI, 'archive', ...args], { cwd: FIXTURE, encoding: 'utf-8' })

  test('writes one archive per job of the golden output, named by the fixture', async () => {
    const to = tempDir()
    const { archives } = await archive({ cwd: FIXTURE, out: '../golden', to })
    expect(archives.map((entry) => entry.job)).toEqual(JOBS)
    expect(archives.map((entry) => entry.name)).toEqual(
      JOBS.map((job) => `chassis-assets-fixture-${job.replaceAll('/', '-')}-0.0.0-fixture.zip`)
    )
    expect(fs.readdirSync(to).sort()).toEqual(archives.map((entry) => entry.name))
    for (const entry of archives) expect(fs.statSync(entry.file).size).toBe(entry.size)
  })

  test('an archive holds every file of its job at its top level, with its content and CRC', async () => {
    const to = tempDir()
    const { archives } = await archive({ cwd: FIXTURE, out: '../golden', to })
    for (const entry of archives) {
      const dir = path.join(GOLDEN, entry.job)
      const files = listFiles(dir)
      const entries = readZip(entry.file)
      expect(entry.files).toBe(files.length)
      expect(entries.map((item) => item.name)).toEqual(files)
      for (const item of entries) {
        const expected = fs.readFileSync(path.join(dir, item.name))
        expect(item.content.equals(expected)).toBe(true)
        expect(item.size).toBe(expected.length)
        expect(item.crc).toBe(crc32(expected))
      }
    }
  })

  test('leaves out .DS_Store, and stores a file that deflate does not make smaller', () => {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, '.DS_Store'), 'mac')
    fs.writeFileSync(path.join(dir, 'random.bin'), crypto.randomBytes(512))
    fs.writeFileSync(path.join(dir, 'text.txt'), 'the same line again\n'.repeat(50))
    const file = path.join(tempDir(), 'test.zip')
    const { zip, files } = zipFolder(dir)
    fs.writeFileSync(file, zip)
    expect(files).toBe(2)
    const entries = readZip(file)
    expect(entries.map((item) => [item.name, item.method])).toEqual([
      ['random.bin', 0],
      ['text.txt', 8]
    ])
    expect(entries[1].content.toString()).toBe('the same line again\n'.repeat(50))
  })

  test('crc32 and the DOS date are the ones the format defines', () => {
    expect(crc32(Buffer.from('123456789'))).toBe(0xcb_f4_39_26)
    expect(crc32(Buffer.alloc(0))).toBe(0)
    // 2026-10-29 20:56:30: day 29, month 10, year 2026 - 1980 = 46
    expect(dosDateTime(new Date(2026, 9, 29, 20, 56, 30))).toEqual({
      date: (46 << 9) | (10 << 5) | 29,
      time: (20 << 11) | (56 << 5) | 15
    })
    expect(dosDateTime(new Date(1970, 0, 1))).toEqual({ date: (1 << 5) | 1, time: 0 })
  })

  test('--prefix and --release name the archives instead of package.json', async () => {
    const to = tempDir()
    const { archives } = await archive({
      cwd: FIXTURE,
      out: '../golden',
      to,
      prefix: 'acme-assets',
      release: '1.2.3'
    })
    expect(archives[0].name).toBe('acme-assets-android-mobile-alpha-1.2.3.zip')
  })

  test('removes the archives of the prefix already in the folder, and no other file', async () => {
    const to = tempDir()
    fs.writeFileSync(path.join(to, 'chassis-assets-fixture-web-site-alpha-0.0.1.zip'), '')
    fs.writeFileSync(path.join(to, 'other-web-site-alpha-0.0.1.zip'), '')
    fs.writeFileSync(path.join(to, 'notes.txt'), '')
    await archive({ cwd: FIXTURE, out: '../golden', to })
    const names = fs.readdirSync(to)
    expect(names).not.toContain('chassis-assets-fixture-web-site-alpha-0.0.1.zip')
    expect(names).toContain('other-web-site-alpha-0.0.1.zip')
    expect(names).toContain('notes.txt')
  })

  test('fails on a package.json without a version, unless --release is given', async () => {
    const cwd = tempDir()
    fs.writeFileSync(
      path.join(cwd, 'package.json'),
      JSON.stringify({ name: '@acme/assets-workspace' })
    )
    fs.mkdirSync(path.join(cwd, 'dist/web/site/alpha'), { recursive: true })
    fs.writeFileSync(path.join(cwd, 'dist/web/site/alpha/a.txt'), 'a')
    await expect(archive({ cwd })).rejects.toThrow('has no version. Give --release <version>')
    const { archives } = await archive({ cwd, release: '2.0.0' })
    expect(archives.map((entry) => entry.name)).toEqual(['assets-web-site-alpha-2.0.0.zip'])
  })

  test('the command prints each archive and exits 0', () => {
    const to = tempDir()
    const { status, stdout } = run('--out', '../golden', '--to', to)
    expect(status).toBe(0)
    for (const job of JOBS) {
      expect(stdout).toContain(
        `📦 chassis-assets-fixture-${job.replaceAll('/', '-')}-0.0.0-fixture.zip`
      )
    }
    expect(stdout).toContain('✅ 6 archives in')
  })

  test('the command exits 1 when the output has no job', () => {
    const { status, stderr } = run('--out', 'nothing', '--to', tempDir())
    expect(status).toBe(1)
    expect(stderr).toContain('No <platform>/<app>/<brand> folder')
  })

  test('--help exits 0, and an unknown option exits 2', () => {
    expect(run('--help')).toMatchObject({ status: 0 })
    expect(run('--help').stdout).toContain('--release <version>')
    expect(run('--zip')).toMatchObject({ status: 2 })
  })
})
