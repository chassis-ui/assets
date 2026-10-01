/**
 * Chassis Assets Consumer Contract
 *
 * The files that the rest of the ecosystem reads from the docs output,
 * `dist/web/docs/chassis/`, as data, each with the code that reads it. The roadmap's
 * "consumer contract" lists them in prose. Checked against the sources of `chassis-website`
 * at `d83a1d6` and of `@chassis-ui/docs` 0.6.1 on 2026-09-30.
 *
 * `checkContract(options)` returns the files an output lacks; the command-line entry at the
 * bottom prints them and exits 1 when one is missing.
 *
 * @module contract
 */

import fs from 'fs'
import path from 'path'
import { isEntry, resolveRoot } from './root.js'

/** @import { ContractEntry, ContractProblem, Job } from './types.js' */

/**
 * The job whose output the sites read, and copy to `/static/`.
 * @type {Job}
 */
export const CONTRACT_JOB = { platform: 'web', app: 'docs', brand: 'chassis' }

/**
 * Write out the alternatives of a pattern: `a-{b,c}.svg` gives `a-b.svg` and `a-c.svg`.
 * An empty alternative, as in `{,@2x}`, gives the path without it.
 * @param {string} pattern
 * @returns {string[]}
 */
export function expand(pattern) {
  const group = /\{([^{}]*)\}/.exec(pattern)
  if (!group) return [pattern]
  const [whole, alternatives] = group
  return alternatives
    .split(',')
    .flatMap((alternative) => expand(pattern.replace(whole, alternative)))
}

/**
 * The files that a site reads by name, with who reads them. Paths are relative to the
 * output of `CONTRACT_JOB`.
 * @type {ContractEntry[]}
 */
export const CONTRACT = [
  {
    reader: 'Navigation.astro and Footer.astro of @chassis-ui/docs',
    files: ['images/site-logo.svg']
  },
  {
    reader: 'Favicons.astro of @chassis-ui/docs, and the aliases of the website',
    files: ['images/{favicon,favicon-16x16,favicon-32x32,apple-touch-icon}.png']
  },
  {
    reader: 'the manifest.json of each site',
    files: ['images/android-chrome-{192x192,512x512}.png']
  },
  {
    reader: 'BaseLayout.astro of @chassis-ui/docs, which fails the build of a site without it',
    files: ['images/social-image.png']
  },
  {
    reader: 'the home page of every site, which fails the build of a site without it',
    files: ['icons/cx-sprite.svg']
  },
  {
    reader: 'GalleryImage.astro of the website and ResponsiveImage.astro of chassis-tokens',
    files: ['images/home/comp-gallery-{light,dark}{,-small}{,@2x}.{png,webp}']
  },
  {
    reader: 'FigmaSection.astro of the website',
    files: ['images/home/figma-{docs,library,tokens}-{light,dark}{,@2x}.webp']
  },
  {
    reader: 'IconsSection.astro and TokensSection.astro of the website',
    files: ['images/home/icon-library-{light,dark}.svg', 'images/home/tokens-{scheme,visual}.svg']
  },
  {
    reader: 'BrandingSection.astro of the website',
    files: ['images/logo/chassis-{logo,icon}-{brand,white}-banner.svg']
  }
]

/**
 * The screenshots of the Figma components, which `ExampleImage.astro` and `CxVariant.astro`
 * of chassis-figma read by the name of the component, the mode and the image.
 */
export const SCREENSHOT = /^images\/figma\/components\/([^/]+)\/(light|dark)\/([^/@]+)(@2x)?\.png$/
const SCREENSHOT_READER = 'ExampleImage.astro and CxVariant.astro of chassis-figma'

/**
 * The name of a Figma export copy: the name of another screenshot, then an export number,
 * `-1`, or `-2x-1` for a copy of the `@2x` file. `meta-1-2x-3` is a copy of `meta-1`.
 */
const EXPORT_COPY = /^(.+?)(?:-2x)?-\d+$/

/**
 * Find the files of the consumer contract that an output does not have. Pure.
 *
 * A screenshot is read in two modes and at two densities (`ResponsiveImage.astro` writes a
 * `srcset` of the file and its `@2x`), so a screenshot that the output has in one of them
 * has to be there in all four. A Figma export copy, a screenshot's name with an export number
 * after it, is read by no page: it has to be there in both modes, and needs no `@2x`. The
 * output has to hold screenshots.
 * @param {string[]} paths - The files of the docs output, relative to it, with forward slashes
 * @returns {ContractProblem[]} The missing files, sorted by path
 */
export function missingFromContract(paths) {
  const has = new Set(paths)
  const missing = CONTRACT.flatMap(({ reader, files }) =>
    files
      .flatMap(expand)
      .filter((file) => !has.has(file))
      .map((file) => ({ path: file, reader }))
  )

  /** @type {Map<string, Set<string>>} The names of the screenshots of each component */
  const components = new Map()
  for (const file of paths) {
    const [, component, , name] = SCREENSHOT.exec(file) ?? []
    if (!component) continue
    if (!components.has(component)) components.set(component, new Set())
    components.get(component).add(name)
  }
  /** @type {Set<string>} */
  const screenshots = new Set()
  for (const [component, names] of components) {
    for (const name of names) {
      const [, original] = EXPORT_COPY.exec(name) ?? []
      const densities = original && names.has(original) ? '' : '{,@2x}'
      screenshots.add(`${component}/{light,dark}/${name}${densities}.png`)
    }
  }
  if (screenshots.size === 0) {
    missing.push({ path: 'images/figma/components/', reader: SCREENSHOT_READER })
  }
  for (const screenshot of screenshots) {
    for (const file of expand(`images/figma/components/${screenshot}`)) {
      if (!has.has(file)) missing.push({ path: file, reader: SCREENSHOT_READER })
    }
  }
  return missing.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/**
 * Every file under a folder, relative to it with forward slashes.
 * @param {string} dir
 * @returns {string[]}
 */
function listFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')
    )
}

/**
 * Check the docs output of a build against the contract.
 * @param {{ cwd?: string, out?: string }} [options] - The repository root and the output folder
 * @returns {{ dir: string, files: number, missing: ContractProblem[] }}
 *   `dir` is the folder checked, relative to `cwd`
 */
export function checkContract(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const { platform, app, brand } = CONTRACT_JOB
  const dir = path.resolve(cwd, options.out || 'dist', platform, app, brand)
  const relative = path.relative(cwd, dir) || '.'
  if (!fs.existsSync(dir)) {
    return {
      dir: relative,
      files: 0,
      missing: [{ path: '', reader: 'every Chassis site, through `chassis-docs vendor`' }]
    }
  }
  const paths = listFiles(dir)
  return { dir: relative, files: paths.length, missing: missingFromContract(paths) }
}

/**
 * Print the result of `checkContract()`.
 * @param {ReturnType<typeof checkContract>} result
 * @returns {boolean} Whether the output keeps the contract
 */
export function printContract(result) {
  if (result.missing.length === 0) {
    console.log(`✅ Consumer contract: ${result.dir}/ has every file the sites read`)
    return true
  }
  if (result.files === 0) {
    console.error(`❌ Consumer contract: ${result.dir}/ does not exist. Run \`pnpm assets:site\``)
    return false
  }
  console.error(
    `❌ Consumer contract: ${result.missing.length} file(s) missing from ${result.dir}/`
  )
  for (const { path: file, reader } of result.missing) {
    console.error(`   - ${file}, read by ${reader}`)
  }
  return false
}

const HELP = `Usage: pnpm assets:contract [options]

Checks that <out>/web/docs/chassis/ has every file the Chassis sites read from it. Exits 1
and names the files and their readers when one is missing.

Options:
  --out <dir>            Output folder to read, default dist
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --help, -h             Print this help
`

/**
 * The command line of the contract check: `pnpm assets:contract`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  const options = { cwd: undefined, out: undefined }
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--out' || argv[i] === '--cwd') && argv[i + 1]) {
      options[argv[i].slice(2)] = argv[++i]
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    }
  }
  process.exit(printContract(checkContract(options)) ? 0 : 1)
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
