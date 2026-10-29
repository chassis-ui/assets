/**
 * Chassis Assets Archive
 *
 * Writes one archive per platform, app and brand of an existing build, for the release of
 * a version: `<prefix>-<platform>-<app>-<brand>-<version>.zip`, with the content of
 * `dist/<platform>/<app>/<brand>/` at its top level. The prefix is the name of the
 * `package.json` of the repository root without its scope and without `-workspace`, and
 * the version is the one of the same file; `--prefix` and `--release` name them instead.
 *
 * The archives are written with `node:zlib`, not with a `zip` command, so the command runs
 * wherever Node.js does. Every file is deflated, and stored as it is when that is not
 * smaller, as fonts and images mostly are. The format is the plain ZIP format: an archive
 * holds up to 65,535 files of up to 4 GB, which no job of assets reaches.
 *
 * `archive(options)` writes the archives and returns them; the command-line entry at the
 * bottom prints them and exits 1 when the output has no job.
 *
 * @module archive
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { isEntry, resolveRoot } from './root.js'

/** The folder the archives are written to, under the repository root, unless `--to` names one. */
export const ARCHIVES_DIR = 'archives'

/** The most files an archive of the plain ZIP format holds. */
const MAX_ENTRIES = 0xff_ff

/** The largest size and offset of the plain ZIP format. */
const MAX_SIZE = 0xff_ff_ff_ff

/** The files macOS adds to a folder, left out of every archive. */
const EXCLUDED_NAMES = new Set(['.DS_Store'])

/** @type {Uint32Array | undefined} */
let crcTable

/**
 * The CRC-32 of a buffer, as the ZIP format wants it.
 * @param {Buffer} data
 * @returns {number}
 */
export function crc32(data) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xff_ff_ff_ff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xff_ff_ff_ff) >>> 0
}

/**
 * A date as the time and the date fields of the ZIP format, in local time with a precision
 * of two seconds. A date before 1980 becomes the first day of 1980, the earliest the format
 * holds.
 * @param {Date} date
 * @returns {{ time: number, date: number }}
 */
export function dosDateTime(date) {
  if (date.getFullYear() < 1980) return { time: 0, date: (1 << 5) | 1 }
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  }
}

/**
 * Every file under a folder, as sorted paths relative to it with forward slashes, without
 * the files macOS adds.
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && !EXCLUDED_NAMES.has(entry.name))
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
    )
    .sort()
}

/**
 * The content of a folder as a ZIP archive, the files at its top level.
 * @param {string} dir - The folder
 * @returns {{ zip: Buffer, files: number }} The archive and how many files it holds
 * @throws {Error} When the folder has more files, or a larger file, than the format holds
 */
export function zipFolder(dir) {
  const names = listFiles(dir)
  if (names.length > MAX_ENTRIES) {
    throw new Error(
      `${dir} has ${names.length} files, more than the ${MAX_ENTRIES} an archive holds`
    )
  }

  /** @type {Buffer[]} */
  const locals = []
  /** @type {Buffer[]} */
  const centrals = []
  let offset = 0

  for (const name of names) {
    const file = path.join(dir, name)
    const data = fs.readFileSync(file)
    const { mtime, mode } = fs.statSync(file)
    const deflated = zlib.deflateRawSync(data, { level: 9 })
    const stored = deflated.length >= data.length
    const content = stored ? data : deflated
    if (data.length > MAX_SIZE || offset > MAX_SIZE) {
      throw new Error(`${file} is larger than the 4 GB an archive holds`)
    }

    const nameBytes = Buffer.from(name, 'utf-8')
    const { time, date } = dosDateTime(mtime)
    const crc = crc32(data)

    // The local file header, then the content. Bit 11 of the flags: the name is UTF-8
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04_03_4b_50, 0)
    local.writeUInt16LE(20, 4) // version needed: 2.0, deflate
    local.writeUInt16LE(0x08_00, 6)
    local.writeUInt16LE(stored ? 0 : 8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(content.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBytes, content)

    // The central directory entry: the same fields, the Unix mode of the file as its
    // external attributes, and where its local header is
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02_01_4b_50, 0)
    central.writeUInt16LE(0x03_1e, 4) // made by: Unix, 3.0
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x08_00, 8)
    central.writeUInt16LE(stored ? 0 : 8, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(content.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt16LE(0, 30) // extra
    central.writeUInt16LE(0, 32) // comment
    central.writeUInt16LE(0, 34) // disk
    central.writeUInt16LE(0, 36) // internal attributes
    central.writeUInt32LE((((mode & 0o7777) | 0o100000) * 0x1_00_00) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBytes)

    offset += local.length + nameBytes.length + content.length
  }

  const directory = Buffer.concat(centrals)
  if (offset + directory.length > MAX_SIZE) {
    throw new Error(`${dir} is larger than the 4 GB an archive holds`)
  }

  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06_05_4b_50, 0)
  end.writeUInt16LE(0, 4) // this disk
  end.writeUInt16LE(0, 6) // the disk of the directory
  end.writeUInt16LE(names.length, 8)
  end.writeUInt16LE(names.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20) // comment

  return { zip: Buffer.concat([...locals, directory, end]), files: names.length }
}

/**
 * The folders of a folder, sorted, without the hidden ones.
 * @param {string} dir
 * @returns {string[]}
 */
function folders(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
}

/**
 * @typedef {object} ArchiveOptions
 * @property {string} [cwd] - The repository root. Default: `findRoot()`
 * @property {string} [out] - The output to read, relative to the root. Default `dist`
 * @property {string} [to] - The folder the archives are written to, relative to the root.
 *   Default `archives`. The archives of the prefix already in it are removed first
 * @property {string} [prefix] - The start of the names. Default: the name of the
 *   `package.json` of the root without its scope and without `-workspace`
 * @property {string} [release] - The version in the names. Default: the version of the
 *   `package.json` of the root
 */

/**
 * @typedef {object} Archive
 * @property {string} name - The file name, `<prefix>-<platform>-<app>-<brand>-<version>.zip`
 * @property {string} file - Its absolute path
 * @property {string} job - `<platform>/<app>/<brand>`
 * @property {number} files - How many files it holds
 * @property {number} size - Its size in bytes
 */

/**
 * The prefix and the version of the names, from the options or the `package.json` of the root.
 * @param {string} cwd
 * @param {ArchiveOptions} options
 * @returns {{ prefix: string, version: string }}
 * @throws {Error} When `package.json` cannot be read, or gives no name or version
 */
export function archiveNames(cwd, options) {
  let pkg = {}
  if (!options.prefix || !options.release) {
    const file = path.join(cwd, 'package.json')
    try {
      pkg = JSON.parse(fs.readFileSync(file, 'utf-8'))
    } catch (error) {
      throw new Error(`Cannot read ${file}: ${error.message}`, { cause: error })
    }
  }
  const prefix =
    options.prefix ||
    (typeof pkg.name === 'string' && pkg.name.replace(/^@[^/]+\//, '').replace(/-workspace$/, ''))
  if (!prefix) throw new Error(`The package.json of ${cwd} has no name. Give --prefix <name>`)
  const version = options.release || pkg.version
  if (typeof version !== 'string' || version === '') {
    throw new Error(`The package.json of ${cwd} has no version. Give --release <version>`)
  }
  return { prefix, version }
}

/**
 * Write one archive per platform, app and brand of an existing output.
 * @param {ArchiveOptions} [options]
 * @returns {Promise<{ archives: Archive[], to: string }>} The archives, and the folder they
 *   are in. `archives` is empty when the output has no job
 */
export async function archive(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const out = path.resolve(cwd, options.out || 'dist')
  const to = path.resolve(cwd, options.to || ARCHIVES_DIR)
  const { prefix, version } = archiveNames(cwd, options)

  fs.mkdirSync(to, { recursive: true })
  for (const name of fs.readdirSync(to)) {
    if (name.startsWith(`${prefix}-`) && name.endsWith('.zip')) fs.rmSync(path.join(to, name))
  }

  /** @type {Archive[]} */
  const archives = []
  for (const platform of folders(out)) {
    for (const app of folders(path.join(out, platform))) {
      for (const brand of folders(path.join(out, platform, app))) {
        const name = `${prefix}-${platform}-${app}-${brand}-${version}.zip`
        const file = path.join(to, name)
        const { zip, files } = zipFolder(path.join(out, platform, app, brand))
        fs.writeFileSync(file, zip)
        archives.push({ name, file, job: `${platform}/${app}/${brand}`, files, size: zip.length })
      }
    }
  }
  return { archives, to }
}

const HELP = `Usage: pnpm assets:archive [options]

Writes one archive per platform, app and brand of an existing output, for a release:
<prefix>-<platform>-<app>-<brand>-<version>.zip, with the content of
<out>/<platform>/<app>/<brand>/ at its top level. Exits 1 when the output has no job.

Options:
  --out <dir>            Output folder to read, default dist
  --to <dir>             Folder to write the archives to, default archives. The archives
                         of the prefix already in it are removed first
  --prefix <name>        Start of the names, default the name of package.json without
                         its scope and without -workspace
  --release <version>    Version in the names, default the version of package.json
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --help, -h             Print this help
`

/**
 * The command line of the archives: `pnpm assets:archive`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  /** @type {ArchiveOptions} */
  const options = {}
  const valued = ['--out', '--to', '--prefix', '--release', '--cwd']
  for (let i = 0; i < argv.length; i++) {
    if (valued.includes(argv[i]) && argv[i + 1] !== undefined) {
      options[argv[i].slice(2)] = argv[++i]
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    }
  }
  archive(options)
    .then(({ archives, to }) => {
      const cwd = process.cwd()
      for (const { name, files, size } of archives) {
        console.log(`📦 ${name}: ${files} files (${(size / 1024 / 1024).toFixed(1)} MB)`)
      }
      if (archives.length === 0) {
        console.error(
          `❌ No <platform>/<app>/<brand> folder in ${path.relative(cwd, path.resolve(resolveRoot(options.cwd), options.out || 'dist')) || '.'}. Run the build first.`
        )
        process.exit(1)
      }
      console.log(`✅ ${archives.length} archives in ${path.relative(cwd, to) || '.'}`)
    })
    .catch((error) => {
      console.error(`💥 Archive failed: ${error.message}`)
      process.exit(1)
    })
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
