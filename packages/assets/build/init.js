/**
 * Chassis Assets Init
 *
 * Writes the baseline of a repository of assets into a folder: a `package.json` with the
 * `chassis` block, the scripts and a development dependency on this package, the Git LFS
 * attributes, a `chassis.checks.json` without a contract, a README, a CI workflow and a
 * tag-driven release workflow with the archives, and one file under `source/` so that the
 * first build has something to copy. The templates are in `templates/` beside this module,
 * and the few values that differ by repository are filled in: the name, the package manager
 * and its commands.
 *
 * The command writes outside `dist/`, the one that does, so it writes nothing when a file it
 * would write exists, unless `--force` is given, and `--dry-run` only prints the files.
 *
 * @module init
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { BRAND_FOLDER } from './build-assets.js'
import { getPlatformNames } from './processors/index.js'
import { buildVersion, isEntry } from './root.js'

/** The folder of the templates. */
const TEMPLATES = fileURLToPath(new URL('./templates/', import.meta.url))

/** The version of Node.js written to `.nvmrc`. */
export const NODE_VERSION = '24'

/** The first version of a repository. */
export const FIRST_VERSION = '0.1.0'

/** The package managers of `--pm`, with the commands the templates name. */
export const PACKAGE_MANAGERS = {
  // The install of the workflows is the plain one: a new repository has no lockfile until
  // its first install is committed, and `npm ci`, `--frozen-lockfile` and the cache of
  // setup-node fail without one. With a lockfile, pnpm freezes it in CI by itself
  npm: { install: 'npm install', ci: 'npm install', run: 'npm run', setup: '' },
  pnpm: {
    install: 'pnpm install',
    ci: 'pnpm install',
    run: 'pnpm',
    setup: [
      '      - name: Setup pnpm',
      '        uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0',
      '        with:',
      '          version: 10',
      '',
      ''
    ].join('\n')
  }
}

/** The brand and the app a repository starts with, when none is given. */
export const DEFAULTS = { brands: ['main'], apps: { site: ['web'] }, pm: 'npm' }

/** A brand or app name: lowercase letters, digits and single hyphens, as the source lint wants. */
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * @typedef {object} InitOptions
 * @property {string} [dir] - The folder to write into. Default: the working directory
 * @property {string} [name] - The name of the package. Default: the name of the folder
 * @property {string[]} [brands] - The brands of `chassis.build`. Default `['main']`
 * @property {Record<string, string[]>} [apps] - The apps of `chassis.build`, each with its
 *   platforms. Default `{ site: ['web'] }`
 * @property {'npm' | 'pnpm'} [pm] - The package manager the README and the workflows name.
 *   Default `npm`
 * @property {boolean} [force] - Write over a file that exists
 * @property {boolean} [dryRun] - Print the files, write nothing
 */

/**
 * Check a brand or app name.
 * @param {string} kind - `brand` or `app`, for the message
 * @param {string} name
 * @returns {string} The name
 * @throws {Error} When the name starts with `_`, or is not lowercase letters, digits and hyphens
 */
export function checkName(kind, name) {
  if (name.startsWith('_')) {
    throw new Error(
      `${kind === 'app' ? 'An' : 'A'} ${kind} name cannot start with _: ${name}. Such a folder is no brand and no app`
    )
  }
  if (!NAME_RE.test(name)) {
    throw new Error(
      `${kind === 'app' ? 'An' : 'A'} ${kind} name is lowercase letters, digits and hyphens: ${name}`
    )
  }
  return name
}

/**
 * Parse an app of `--app`: `<name>:<platform>[,<platform>…]`.
 * @param {string} spec
 * @returns {{ app: string, platforms: string[] }}
 * @throws {Error} When the form is wrong, or a platform has no processor
 */
export function parseApp(spec) {
  const [app, list, ...more] = spec.split(':')
  if (!app || !list || more.length > 0) {
    throw new Error(
      `An app is <name>:<platform>[,<platform>…], such as docs:web or mobile:ios,android: ${spec}`
    )
  }
  checkName('app', app)
  const platforms = [...new Set(list.split(',').filter(Boolean))]
  const known = getPlatformNames()
  for (const platform of platforms) {
    if (!known.includes(platform)) {
      throw new Error(
        `Unknown platform ${platform} of the app ${app}. Platforms: ${known.join(', ')}`
      )
    }
  }
  return { app, platforms }
}

/**
 * Fill a template: the placeholders, and the line of the pnpm setup step.
 * @param {string} text
 * @param {Record<string, string>} values - By placeholder, without the underscores
 * @returns {string}
 */
function render(text, values) {
  return text
    .replace(/^[ \t]*# __PNPM_SETUP__\n/m, values.PNPM_SETUP)
    .replace(/__([A-Z_]+?)__/g, (match, key) => (key in values ? values[key] : match))
}

/**
 * The files of a repository, by path relative to its root, with their content. Pure, apart
 * from reading the templates.
 * @param {InitOptions} [options]
 * @returns {Map<string, string>}
 * @throws {Error} On a name, an app or a package manager that is not accepted
 */
export function planFiles(options = {}) {
  const dir = path.resolve(options.dir || '.')
  const name = options.name || path.basename(dir)
  const brands = (options.brands?.length ? options.brands : DEFAULTS.brands).map((brand) =>
    checkName('brand', brand)
  )
  const apps = options.apps && Object.keys(options.apps).length > 0 ? options.apps : DEFAULTS.apps
  for (const app of Object.keys(apps)) checkName('app', app)
  const pm = options.pm || DEFAULTS.pm
  if (!Object.hasOwn(PACKAGE_MANAGERS, pm)) {
    throw new Error(
      `Unknown package manager ${pm}. One of ${Object.keys(PACKAGE_MANAGERS).join(', ')}`
    )
  }
  const commands = PACKAGE_MANAGERS[pm]
  const values = {
    NAME: name,
    INSTALL: commands.install,
    INSTALL_CI: commands.ci,
    RUN: commands.run,
    PNPM_SETUP: commands.setup
  }
  const template = (file) => render(fs.readFileSync(path.join(TEMPLATES, file), 'utf-8'), values)

  const packageJson = {
    name,
    version: FIRST_VERSION,
    private: true,
    description: `The assets of ${name}, built with @chassis-ui/assets`,
    chassis: {
      defaults: { brandFolder: BRAND_FOLDER },
      build: { brands, apps }
    },
    scripts: {
      build: 'chassis-assets build',
      lint: 'chassis-assets lint-source',
      verify: 'chassis-assets verify',
      archive: 'chassis-assets archive',
      analyze: 'chassis-assets analyze'
    },
    engines: { node: '>=22.12.0' },
    devDependencies: { '@chassis-ui/assets': `^${buildVersion()}` }
  }
  const checks = { contracts: {}, lint: { allow: [] } }

  return new Map([
    ['package.json', `${JSON.stringify(packageJson, null, 2)}\n`],
    ['chassis.checks.json', `${JSON.stringify(checks, null, 2)}\n`],
    ['.gitattributes', template('gitattributes')],
    ['.gitignore', template('gitignore')],
    ['.nvmrc', `${NODE_VERSION}\n`],
    ['README.md', template('README.md')],
    ['.github/workflows/ci.yml', template('workflows/ci.yml')],
    ['.github/workflows/release.yml', template('workflows/release.yml')],
    [`source/${BRAND_FOLDER}/_shared/other/readme.txt`, template('readme.txt')]
  ])
}

/**
 * Write the baseline of a repository of assets.
 * @param {InitOptions} [options]
 * @returns {Promise<{ dir: string, files: string[], existing: string[], written: boolean }>}
 *   The folder, the files relative to it, the ones of them that existed before, and whether
 *   they were written (not on a dry run)
 * @throws {Error} When a file exists and neither `force` nor `dryRun` is given, or on an
 *   option that is not accepted. Nothing is written then
 */
export async function init(options = {}) {
  const dir = path.resolve(options.dir || '.')
  const plan = planFiles({ ...options, dir })
  const files = [...plan.keys()]

  const existing = files.filter((file) => fs.existsSync(path.join(dir, file)))
  if (options.dryRun) return { dir, files, existing, written: false }
  if (existing.length > 0 && !options.force) {
    throw new Error(
      `${existing.length === 1 ? 'A file' : 'Files'} to write exist${existing.length === 1 ? 's' : ''} in ${dir}: ${existing.join(', ')}. --force writes over ${existing.length === 1 ? 'it' : 'them'}`
    )
  }

  for (const [file, content] of plan) {
    const target = path.join(dir, file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
  return { dir, files, existing, written: true }
}

const HELP = `Usage: chassis-assets init [dir] [options]

Writes the baseline of a repository of assets into dir, the working directory by default:
package.json with the chassis block and the scripts, chassis.checks.json, .gitattributes
with the Git LFS rules, .gitignore, .nvmrc, README.md, a CI and a release workflow, and
one file under source/ for the first build. Writes nothing when a file exists.

Options:
  --name <name>          The package name, default the name of the folder
  --brand <name…>        The brands, default main
  --app <name:platforms> An app and its platforms, such as docs:web or mobile:ios,android,
                         one or more times; default site:web. Platforms: ${getPlatformNames().join(', ')}
  --pm <npm|pnpm>        The package manager the README and the workflows name, default npm
  --force                Write over the files that exist
  --dry-run              Print the files, write nothing
  --help, -h             Print this help
`

/**
 * Parse the arguments of the command.
 * @param {string[]} argv
 * @returns {InitOptions & { help: boolean }}
 * @throws {Error} On an unknown option, or an option without its value
 */
export function parseInitArgs(argv) {
  /** @type {InitOptions & { help: boolean }} */
  const options = { brands: [], apps: {}, help: false }
  const values = (i) => {
    const list = []
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) list.push(argv[++i])
    if (list.length === 0) throw new Error(`${argv[i]} needs a value`)
    return { list, i }
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      options.help = true
    } else if (arg === '--force') {
      options.force = true
    } else if (arg === '--dry-run') {
      options.dryRun = true
    } else if (arg === '--name' || arg === '--pm') {
      const { list, i: next } = values(i)
      if (list.length > 1) throw new Error(`${arg} takes one value`)
      if (arg === '--pm' && !Object.hasOwn(PACKAGE_MANAGERS, list[0])) {
        throw new Error(
          `Unknown package manager ${list[0]}. One of ${Object.keys(PACKAGE_MANAGERS).join(', ')}`
        )
      }
      options[arg === '--name' ? 'name' : 'pm'] = /** @type {any} */ (list[0])
      i = next
    } else if (arg === '--brand') {
      const { list, i: next } = values(i)
      options.brands.push(...list.map((brand) => checkName('brand', brand)))
      i = next
    } else if (arg === '--app') {
      const { list, i: next } = values(i)
      for (const spec of list) {
        const { app, platforms } = parseApp(spec)
        if (app in options.apps) throw new Error(`The app ${app} is given twice`)
        options.apps[app] = platforms
      }
      i = next
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option ${arg}. Run with --help for the options.`)
    } else if (options.dir === undefined) {
      options.dir = arg
    } else {
      throw new Error(`One folder at most: ${options.dir} and ${arg}`)
    }
  }
  return options
}

/**
 * The command line of init: `chassis-assets init`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  let options
  try {
    options = parseInitArgs(argv)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(2)
  }
  if (options.help) {
    console.log(HELP)
    process.exit(0)
  }
  init(options)
    .then(({ files, existing, written }) => {
      const shown = options.dir || '.'
      for (const file of files) {
        console.log(`📄 ${file}${!written && existing.includes(file) ? ' (exists)' : ''}`)
      }
      if (!written) {
        console.log(
          `\n🔍 Dry run: ${files.length} files to write in ${shown}${existing.length > 0 ? `, ${existing.length} of them exist` : ''}`
        )
        return
      }
      const run = PACKAGE_MANAGERS[options.pm || DEFAULTS.pm]
      console.log(`\n✅ ${files.length} files in ${shown}\n\nNext:`)
      if (shown !== '.') console.log(`  cd ${shown}`)
      console.log(`  git init && git lfs install\n  ${run.install}\n  ${run.run} build`)
    })
    .catch((error) => {
      console.error(`❌ ${error.message}`)
      process.exit(1)
    })
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
