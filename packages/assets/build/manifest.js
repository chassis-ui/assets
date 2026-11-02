/**
 * Chassis Assets Manifest
 *
 * Writes the list of the files of an existing build, for the release of a version:
 * `<prefix>-manifest-<version>.json`, with the size and the SHA-256 of every file by job, and
 * the version of the build that wrote them. `dist/` is not committed, so the manifest of a
 * release is what the next version compares against, with `chassis-assets diff`, and what a
 * consumer of an archive checks its files against. The names follow the archives.
 *
 * `buildManifest(options)` reads the output; `writeManifest(options)` writes the file; the
 * command-line entry at the bottom prints it and exits 1 when the output has no job.
 *
 * @module manifest
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { ARCHIVES_DIR, archiveNames, folders, listFiles } from './archive.js'
import { buildVersion, isEntry, resolveRoot } from './root.js'

/**
 * @typedef {object} ManifestFile
 * @property {number} size - Its size in bytes
 * @property {string} sha256 - The SHA-256 of its content, in hexadecimal
 */

/**
 * @typedef {object} Manifest
 * @property {string} name - The prefix of the archives of the version
 * @property {string} version - The version of the repository
 * @property {string} builder - The version of `@chassis-ui/assets` that made the manifest
 * @property {Record<string, Record<string, ManifestFile>>} jobs - The files by
 *   `<platform>/<app>/<brand>`, sorted, each path relative to its job
 */

/**
 * @typedef {object} ManifestOptions
 * @property {string} [cwd] - The repository root. Default: the nearest with a `chassis` block
 * @property {string} [out] - The output folder to read, relative to the root. Default `dist`
 * @property {string} [to] - The folder to write to, relative to the root. Default `archives`
 * @property {string} [prefix] - The start of the name, instead of that of `package.json`
 * @property {string} [release] - The version, instead of that of `package.json`
 */

/**
 * The files of every job of an output. A pure read of the output and of `package.json`.
 * @param {ManifestOptions} [options]
 * @returns {Manifest} `jobs` is empty when the output has no job
 */
export function buildManifest(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const out = path.resolve(cwd, options.out || 'dist')
  const { prefix, version } = archiveNames(cwd, options)

  /** @type {Manifest['jobs']} */
  const jobs = {}
  for (const platform of folders(out)) {
    for (const app of folders(path.join(out, platform))) {
      for (const brand of folders(path.join(out, platform, app))) {
        const dir = path.join(out, platform, app, brand)
        /** @type {Record<string, ManifestFile>} */
        const files = {}
        for (const name of listFiles(dir)) {
          const data = fs.readFileSync(path.join(dir, name))
          files[name] = {
            size: data.length,
            sha256: crypto.createHash('sha256').update(data).digest('hex')
          }
        }
        jobs[`${platform}/${app}/${brand}`] = files
      }
    }
  }
  return { name: prefix, version, builder: buildVersion(), jobs }
}

/**
 * Write the manifest of an output. A manifest of the same prefix already in the folder is
 * removed first, as the archives are.
 * @param {ManifestOptions} [options]
 * @returns {{ manifest: Manifest, file: string }}
 */
export function writeManifest(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const to = path.resolve(cwd, options.to || ARCHIVES_DIR)
  const manifest = buildManifest(options)
  fs.mkdirSync(to, { recursive: true })
  const start = `${manifest.name}-manifest-`
  for (const name of fs.readdirSync(to)) {
    if (name.startsWith(start) && name.endsWith('.json')) fs.rmSync(path.join(to, name))
  }
  const file = path.join(to, `${start}${manifest.version}.json`)
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
  return { manifest, file }
}

const HELP = `Usage: chassis-assets manifest [options]

Writes the list of the files of an existing output, with the size and the SHA-256 of each by
platform, app and brand, for a release: <prefix>-manifest-<version>.json. chassis-assets diff
compares the output of the next version against it. Exits 1 when the output has no job.

Options:
  --out <dir>            Output folder to read, default dist
  --to <dir>             Folder to write the manifest to, default archives
  --prefix <name>        Start of the name, default the name of package.json without its
                         scope and without -workspace
  --release <version>    Version in the name, default the version of package.json
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --help, -h             Print this help
`

/**
 * The command line of the manifest: `chassis-assets manifest`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  /** @type {ManifestOptions} */
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
  try {
    const { manifest, file } = writeManifest(options)
    const jobs = Object.keys(manifest.jobs)
    if (jobs.length === 0) {
      fs.rmSync(file)
      console.error(`❌ No <platform>/<app>/<brand> folder in the output. Run the build first.`)
      process.exit(1)
    }
    const files = jobs.reduce((sum, job) => sum + Object.keys(manifest.jobs[job]).length, 0)
    console.log(`✅ ${path.basename(file)}: ${files} files of ${jobs.length} jobs`)
  } catch (error) {
    console.error(`💥 Manifest failed: ${error.message}`)
    process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
