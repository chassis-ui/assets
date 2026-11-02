/**
 * Chassis Assets Init
 *
 * Writes the baseline of a repository of assets into a folder: a `package.json` with the
 * `chassis` block, the scripts and a development dependency on this package, the Git LFS
 * attributes, a `chassis.checks.json` without a contract, a README, a changelog, the
 * instructions for agents, a CI workflow and a release workflow with the archives, and one file
 * under `source/` so that the first build has something to copy. The templates are in
 * `templates/` beside this module, and the few values that differ by repository are filled in:
 * the name, the package manager and its commands.
 *
 * The command writes outside `dist/`, the one that does, so it writes nothing when a file it
 * would write exists, unless `--force` is given, and `--dry-run` only prints the files. The
 * files that hold the data of a repository are never written over, with or without `--force`.
 *
 * A repository made earlier takes what changed with `--check`, which reports where it differs
 * from what this version writes, and `--only <file…>`, which writes those files.
 *
 * @module init
 */

import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { BRAND_FOLDER } from './build-assets.js'
import { getPlatformNames } from './processors/index.js'
import { CONVERTER_PACKAGE } from './vector-drawables.js'
import { buildVersion, isEntry, repositoryWebUrl } from './root.js'

/** The folder of the templates. */
const TEMPLATES = fileURLToPath(new URL('./templates/', import.meta.url))

/** The version of Node.js written to `.nvmrc`. */
export const NODE_VERSION = '24'

/** The first version of a repository. */
export const FIRST_VERSION = '0.1.0'

/** The package managers of `--pm`, with the commands the templates name. */
export const PACKAGE_MANAGERS = {
  // The install of the workflows is frozen, so the first install has to commit its lockfile
  npm: {
    install: 'npm install',
    ci: 'npm ci',
    run: 'npm run',
    lockfile: 'package-lock.json',
    setup: ''
  },
  pnpm: {
    install: 'pnpm install',
    ci: 'pnpm install --frozen-lockfile',
    run: 'pnpm',
    lockfile: 'pnpm-lock.yaml',
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
export const DEFAULTS = { brands: ['main'], apps: { site: ['web'] }, pm: 'npm', license: 'MIT' }

/** The platforms with a compiler to check an output with, each a job of `native.yml`. */
const NATIVE_PLATFORMS = ['ios', 'android']

/** The files that hold the data of a repository: written when missing, never over one. */
export const DATA_FILES = ['package.json', 'chassis.checks.json', 'CHANGELOG.md']

/** The files a repository makes its own: `--check` asks only that they exist. */
const OWN_FILES = [...DATA_FILES, 'README.md']

/** A brand or app name: lowercase letters, digits and single hyphens, as the source lint wants. */
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * @typedef {object} InitOptions
 * @property {string} [dir] - The folder to write into. Default: the working directory
 * @property {string} [name] - The name of the package. Default: the name of the folder
 * @property {string[]} [brands] - The brands of `chassis.build`. Default `['main']`
 * @property {Record<string, string[]>} [apps] - The apps of `chassis.build`, each with its
 *   platforms. Default `{ site: ['web'] }`
 * @property {string} [version] - The version of the first entry of the changelog. Default `0.1.0`
 * @property {'npm' | 'pnpm'} [pm] - The package manager the README and the workflows name.
 *   Default `npm`
 * @property {string} [repository] - The repository: `owner/name`, or an address. Default: the
 *   `origin` remote of the folder, when it is the root of a git repository
 * @property {string} [license] - The license. Default `MIT`
 * @property {string} [author] - The author. Default: `user.name` of the git configuration
 * @property {string[]} [only] - Write these files of the plan only
 * @property {boolean} [force] - Write over a file that exists, but never one of `DATA_FILES`
 * @property {boolean} [dryRun] - Print the files, write nothing
 */

/**
 * What git knows of a folder: the author, by name only, and the `origin` remote, when the folder
 * is the root of a repository and not a folder inside one.
 * @param {string} dir
 * @returns {{ repository?: string, author?: string }} Without what git does not know
 */
export function gitDefaults(dir) {
  const inDir = fs.existsSync(dir)
  const git = (cwd, ...args) => {
    try {
      const output = execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] })
      return output.toString().trim() || undefined
    } catch {
      return undefined
    }
  }
  const author = git(inDir ? dir : os.homedir(), 'config', 'user.name')
  const top = inDir ? git(dir, 'rev-parse', '--show-toplevel') : undefined
  const isRoot = top !== undefined && top === fs.realpathSync(dir)
  const repository = isRoot ? git(dir, 'remote', 'get-url', 'origin') : undefined
  return {
    ...(author && { author }),
    ...(repositoryWebUrl(repository) && { repository })
  }
}

/**
 * What a folder that already holds a repository says of itself: its name, version, brands and
 * apps in `package.json`, and the package manager of its lockfile.
 * @param {string} dir
 * @returns {{ name?: string, version?: string, brands?: string[],
 *   apps?: Record<string, string[]>, pm?: 'npm' | 'pnpm' }}
 */
export function repositoryDefaults(dir) {
  let pkg = {}
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
  } catch {
    // No package.json here, or one that cannot be read: nothing to say
  }
  const lockfile = Object.keys(PACKAGE_MANAGERS).find((pm) =>
    fs.existsSync(path.join(dir, PACKAGE_MANAGERS[pm].lockfile))
  )
  return {
    ...(typeof pkg.name === 'string' && { name: pkg.name }),
    ...(typeof pkg.version === 'string' && { version: pkg.version }),
    ...(Array.isArray(pkg.chassis?.build?.brands) && { brands: pkg.chassis.build.brands }),
    ...(pkg.chassis?.build?.apps && { apps: pkg.chassis.build.apps }),
    ...(lockfile && { pm: /** @type {'npm' | 'pnpm'} */ (lockfile) })
  }
}

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
  const platforms = new Set(Object.values(apps).flat())
  const pm = options.pm || DEFAULTS.pm
  if (!Object.hasOwn(PACKAGE_MANAGERS, pm)) {
    throw new Error(
      `Unknown package manager ${pm}. One of ${Object.keys(PACKAGE_MANAGERS).join(', ')}`
    )
  }
  const repository = options.repository && repositoryWebUrl(options.repository)
  if (options.repository && !repository) {
    throw new Error(`A repository is owner/name or an address: ${options.repository}`)
  }
  const commands = PACKAGE_MANAGERS[pm]
  const values = {
    NAME: name,
    VERSION: options.version || FIRST_VERSION,
    INSTALL: commands.install,
    INSTALL_CI: commands.ci,
    RUN: commands.run,
    LOCKFILE: commands.lockfile,
    PM: pm,
    PNPM_SETUP: commands.setup
  }
  const template = (file) => render(fs.readFileSync(path.join(TEMPLATES, file), 'utf-8'), values)

  const packageJson = {
    name,
    version: FIRST_VERSION,
    private: true,
    description: `The assets of ${name}, built with @chassis-ui/assets`,
    ...(repository && { repository: { type: 'git', url: `git+${repository}.git` } }),
    license: options.license || DEFAULTS.license,
    ...(options.author && { author: options.author }),
    chassis: {
      defaults: { brandFolder: BRAND_FOLDER },
      build: { brands, apps }
    },
    scripts: {
      build: 'chassis-assets build',
      'build:release': `chassis-assets build --asset-catalog --icon-catalog${platforms.has('android') ? ' --res --vector-drawables' : ''}`,
      lint: 'chassis-assets lint-source',
      verify: 'chassis-assets verify',
      archive: 'chassis-assets archive',
      analyze: 'chassis-assets analyze',
      'release-notes': 'chassis-assets release-notes'
    },
    engines: { node: '>=22.12.0' },
    devDependencies: {
      '@chassis-ui/assets': `^${buildVersion()}`,
      ...(platforms.has('android') && {
        [CONVERTER_PACKAGE]: JSON.parse(
          fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
        ).peerDependencies[CONVERTER_PACKAGE]
      })
    }
  }
  const checks = { contracts: {}, lint: { allow: [] } }
  const nativeJobs = NATIVE_PLATFORMS.filter((platform) => platforms.has(platform)).map(
    (platform) => template(`workflows/native-${platform}.yml`)
  )

  return new Map([
    ['package.json', `${JSON.stringify(packageJson, null, 2)}\n`],
    ['chassis.checks.json', `${JSON.stringify(checks, null, 2)}\n`],
    ['.gitattributes', template('gitattributes')],
    ['.gitignore', template('gitignore')],
    ['.nvmrc', `${NODE_VERSION}\n`],
    ['README.md', template('README.md')],
    ['CHANGELOG.md', template('CHANGELOG.md')],
    ['AGENTS.md', template('AGENTS.md')],
    ['CLAUDE.md', template('CLAUDE.md')],
    ['.github/workflows/ci.yml', template('workflows/ci.yml')],
    ['.github/workflows/release.yml', template('workflows/release.yml')],
    ...(nativeJobs.length > 0
      ? /** @type {[string, string][]} */ ([
          ['.github/workflows/native.yml', template('workflows/native.yml') + nativeJobs.join('\n')]
        ])
      : []),
    [`source/${BRAND_FOLDER}/_shared/other/readme.txt`, template('readme.txt')]
  ])
}

/**
 * The plan of a folder: the options over what the folder and git say of it, and the files of
 * `only`.
 * @param {InitOptions} options
 * @param {string} dir
 * @returns {Map<string, string>}
 * @throws {Error} As `planFiles`, or when `only` names a file init does not write
 */
function planFor(options, dir) {
  // The command line gives empty lists of what it was not told, which say nothing of a repository
  const given = { ...options }
  if (!given.brands?.length) delete given.brands
  if (!Object.keys(given.apps ?? {}).length) delete given.apps
  const plan = planFiles({ ...gitDefaults(dir), ...repositoryDefaults(dir), ...given, dir })
  if (!options.only?.length) return plan
  for (const file of options.only) {
    if (!plan.has(file)) {
      throw new Error(`init does not write ${file}. It writes ${[...plan.keys()].join(', ')}`)
    }
  }
  return new Map([...plan].filter(([file]) => options.only?.includes(file)))
}

/**
 * Write the baseline of a repository of assets. A file of `DATA_FILES` that exists stays, with
 * or without `force`.
 * @param {InitOptions} [options]
 * @returns {Promise<{ dir: string, files: string[], existing: string[], kept: string[], written: boolean }>}
 *   The folder, the files to write relative to it, the ones of them that existed before, the
 *   data files `force` left alone, and whether the files were written (not on a dry run)
 * @throws {Error} When a file exists and neither `force` nor `dryRun` is given, or on an
 *   option that is not accepted. Nothing is written then
 */
export async function init(options = {}) {
  const dir = path.resolve(options.dir || '.')
  const plan = planFor(options, dir)
  const exists = (file) => fs.existsSync(path.join(dir, file))

  const kept = options.force ? DATA_FILES.filter((file) => plan.has(file) && exists(file)) : []
  for (const file of kept) plan.delete(file)
  const files = [...plan.keys()]

  const existing = files.filter((file) => exists(file))
  if (options.dryRun) return { dir, files, existing, kept, written: false }
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
  return { dir, files, existing, kept, written: true }
}

/**
 * Where a repository differs from what this version of init writes. A file of a repository's own
 * only has to exist, the sample under `source/` is not looked at, and of `package.json` the
 * scripts of the plan have to be there.
 * @param {InitOptions} [options]
 * @returns {{ missing: string[], differs: string[], scripts: string[] }}
 */
export function checkBaseline(options = {}) {
  const dir = path.resolve(options.dir || '.')
  const plan = planFor(options, dir)
  /** @type {{ missing: string[], differs: string[], scripts: string[] }} */
  const report = { missing: [], differs: [], scripts: [] }
  for (const [file, content] of plan) {
    if (file.startsWith('source/')) continue
    const target = path.join(dir, file)
    if (!fs.existsSync(target)) report.missing.push(file)
    else if (!OWN_FILES.includes(file) && fs.readFileSync(target, 'utf-8') !== content) {
      report.differs.push(file)
    }
  }
  if (plan.has('package.json') && fs.existsSync(path.join(dir, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8'))
    report.scripts = Object.keys(JSON.parse(plan.get('package.json') ?? '{}').scripts).filter(
      (script) => !pkg.scripts?.[script]
    )
  }
  return report
}

const HELP = `Usage: chassis-assets init [dir] [options]

Writes the baseline of a repository of assets into dir, the working directory by default:
package.json with the chassis block and the scripts, chassis.checks.json, .gitattributes
with the Git LFS rules, .gitignore, .nvmrc, README.md, CHANGELOG.md, AGENTS.md, CLAUDE.md, a
CI and a release workflow, a workflow of the native checks for iOS or Android, and one file under
source/ for the first build. Writes nothing when a file exists. package.json, chassis.checks.json and CHANGELOG.md are never written over.

Options:
  --name <name>          The package name, default the name of the folder
  --brand <name…>        The brands, default main
  --app <name:platforms> An app and its platforms, such as docs:web or mobile:ios,android,
                         one or more times; default site:web. Platforms: ${getPlatformNames().join(', ')}
  --pm <npm|pnpm>        The package manager the README and the workflows name, default npm
  --repository <repo>    The repository, owner/name or an address; default the origin remote
                         of the folder, or left out
  --license <license>    The license, default MIT
  --author <author>      The author; default user.name of git, or left out
  --only <file…>         Write these files only, for a repository made earlier
  --check                Report where the repository differs from what this version writes,
                         and exit 1 when it does. Writes nothing
  --force                Write over the files that exist, but never the three above
  --dry-run              Print the files, write nothing
  --help, -h             Print this help
`

/**
 * Parse the arguments of the command.
 * @param {string[]} argv
 * @returns {InitOptions & { help: boolean, check?: boolean }}
 * @throws {Error} On an unknown option, or an option without its value
 */
export function parseInitArgs(argv) {
  /** @type {InitOptions & { help: boolean, check?: boolean }} */
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
    } else if (arg === '--check') {
      options.check = true
    } else if (arg === '--only') {
      const { list, i: next } = values(i)
      options.only = [...(options.only ?? []), ...list]
      i = next
    } else if (['--repository', '--license', '--author'].includes(arg)) {
      const { list, i: next } = values(i)
      options[arg.slice(2)] = list.join(' ')
      i = next
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
  if (options.check) {
    try {
      const { missing, differs, scripts } = checkBaseline(options)
      for (const file of missing) console.log(`➕ ${file}: missing`)
      for (const file of differs) console.log(`✏️  ${file}: differs`)
      for (const script of scripts) console.log(`➕ package.json: no script ${script}`)
      if (missing.length + differs.length + scripts.length === 0) {
        console.log(`✅ The repository has what this version of init writes`)
        return
      }
      console.log(`\nchassis-assets init --only <file…> writes a missing file, and with --force`)
      console.log(`one that differs. A repository may differ on purpose.`)
      process.exit(1)
    } catch (error) {
      console.error(`❌ ${error.message}`)
      process.exit(1)
    }
  }
  init(options)
    .then(({ files, existing, kept, written }) => {
      const shown = options.dir || '.'
      for (const file of files) {
        console.log(`📄 ${file}${!written && existing.includes(file) ? ' (exists)' : ''}`)
      }
      for (const file of kept) console.log(`🔒 Kept ${file}: it holds the data of the repository`)
      if (!written) {
        console.log(
          `\n🔍 Dry run: ${files.length} files to write in ${shown}${existing.length > 0 ? `, ${existing.length} of them exist` : ''}`
        )
        return
      }
      if (options.only?.length) {
        console.log(`\n✅ ${files.length} files in ${shown}`)
        return
      }
      const run = PACKAGE_MANAGERS[options.pm || DEFAULTS.pm]
      console.log(`\n✅ ${files.length} files in ${shown}\n\nNext:`)
      if (shown !== '.') console.log(`  cd ${shown}`)
      console.log(`  git init && git lfs install\n  ${run.install}\n  ${run.run} build`)
      console.log(`  git add . (with ${run.lockfile}, which the workflows install from)`)
    })
    .catch((error) => {
      console.error(`❌ ${error.message}`)
      process.exit(1)
    })
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
