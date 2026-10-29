/**
 * Chassis Assets Source Lint
 *
 * Checks `source/` against the rules of the design-guidelines page: names of lowercase
 * letters, digits and hyphens, a resolution indicator only at the end of a name, every file
 * in a type folder of an app, and no Git LFS pointer in place of a file. A name that
 * `lint.allow` of `chassis.checks.json` keeps, with its reason, is a warning, not an error.
 *
 * It also checks the fonts against the fonts page: a `@font-face` rule of a stylesheet in
 * `fonts/` names the family, the weight and the style of the file it declares, read from
 * the file, and of the files of the same name in another format, which an app gets. Two
 * files of one name are one font. A font of the default brand that a brand gets beside a
 * family of its own, and that no stylesheet of the brand declares, is a warning, and so is a
 * `format()` that is not the format of its file.
 *
 * `lintSource(options)` reads the files and returns the problems; the command-line entry at
 * the bottom prints them and exits 1 on an error.
 *
 * @module lint-source
 */

import fs from 'fs'
import path from 'path'
import { assetTypes } from './asset-types.js'
import {
  SHARED_FOLDER,
  isLfsPointer,
  loadConfig,
  shouldIgnoreFile,
  sourceLayers
} from './build-assets.js'
import { findFontFaces } from './font-faces.js'
import { READABLE_FORMATS, readFont } from './font-info.js'
import { isEntry, resolveRoot } from './root.js'

/** @import { FontInfo } from './font-info.js' */
/** @import { LintProblem } from './types.js' */

/** A name or a folder: lowercase letters and digits, words joined by one hyphen. */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A brand or an app folder that is neither, such as `_default` and `_shared`: `_`, then a name. */
const RESERVED = /^_[a-z0-9]+(?:-[a-z0-9]+)*$/

/** An extension: a dot, then lowercase letters and digits. */
const EXTENSION = /^\.[a-z0-9]+$/

/** A resolution indicator at the end of a name: `@2x`, `@3x`, `@1.5x`. */
const INDICATOR = /@\d+(?:\.\d+)?x$/

/** An address that names no file beside the stylesheet: a scheme, a root, a query. */
const NOT_BESIDE = /^[a-z][a-z0-9+.-]*:|^\/|[?#$]/i

/** A value of a stylesheet that is computed, which the lint cannot compare. */
const COMPUTED = /[$#{(]/

/** The extensions of the files that a `format()` of a `src` names. */
const FORMATS = /** @type {Record<string, string[]>} */ ({
  woff2: ['.woff2'],
  woff: ['.woff'],
  truetype: ['.ttf', '.otf'],
  opentype: ['.otf', '.ttf'],
  collection: ['.ttc', '.otc'],
  'embedded-opentype': ['.eot'],
  svg: ['.svg']
})

const HELP = `Usage: pnpm assets:lint:source [options]

Checks the names and the layout of source/ against the rules of the design-guidelines page,
and the fonts against the stylesheets that declare them, as the fonts page describes them:
a rule is checked against the file it declares and against the files of the same name in
another format, and two files of one name have to be one font.
Exits 1 when a file breaks a rule. A name that \`lint.allow\` of chassis.checks.json keeps
is printed as a warning, with its reason, and so are a font of the default brand that a brand
gets and does not declare, and a format() that is not the format of its file.

Options:
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --allow-lfs-pointers   Do not report Git LFS pointer files
                         (also CHASSIS_ALLOW_LFS_POINTERS=1 in the environment)
  --help, -h             Print this help
`

/**
 * Whether a path relative to `source/` matches a pattern of `lint.allow`.
 * @param {string} file - With forward slashes
 * @param {string} pattern - With forward slashes, `*` for one folder
 * @returns {boolean}
 */
export function matchesPattern(file, pattern) {
  const parts = file.split('/')
  const expected = pattern.split('/')
  return (
    parts.length === expected.length &&
    expected.every((part, i) => part === '*' || part === parts[i])
  )
}

/**
 * The problems of the name of one file, relative to `source/`. Pure.
 * @param {string} file - `<brand>/<app>/<type>/…/<name>`, with forward slashes
 * @returns {string[]} The messages, empty when the name keeps the rules
 */
export function checkName(file) {
  const messages = []
  const parts = file.split('/')
  const name = parts.pop()

  for (const [depth, folder] of parts.entries()) {
    if (!NAME.test(folder) && !(depth < 2 && RESERVED.test(folder))) {
      messages.push(`the folder "${folder}" is not of lowercase letters, digits and hyphens`)
    }
  }

  const dot = name.lastIndexOf('.')
  const extension = dot > 0 ? name.slice(dot) : ''
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(INDICATOR, '')

  if (!extension) {
    messages.push('has no extension')
  } else if (!EXTENSION.test(extension)) {
    messages.push(`has the extension ${extension}, which is not in lowercase`)
  }

  if (!NAME.test(base)) {
    const suggestion = base
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const hint =
      NAME.test(suggestion) && suggestion !== base
        ? `, such as "${suggestion}${name.slice(base.length)}"`
        : ''
    messages.push(
      `has the name "${base}", which is not of lowercase letters, digits and hyphens${hint}`
    )
  }

  if (parts.length < 3) {
    messages.push('is not in a type folder: source/<brand>/<app>/<type>/')
  }

  return messages
}

/**
 * Whether a font is of the family a rule names. A cut of a family names itself after it, as
 * `Inter 18pt` of `Inter`, and is of the family. Pure.
 * @param {string} family - The family of the font file
 * @param {string} declared - The `font-family` of the rule
 * @returns {boolean}
 */
export function isOfFamily(family, declared) {
  const [has, wants] = [family.toLowerCase(), declared.toLowerCase()]
  return has === wants || has.startsWith(`${wants} `)
}

/**
 * The weights a `font-weight` descriptor names: one weight, or the two ends of a range.
 * Pure.
 * @param {string|undefined} value - As written: `400`, `bold`, `100 900`, or nothing
 * @returns {[number, number]|null} The ends, the same for one weight, or null for a value
 *   that is no number, such as a variable of SCSS
 */
export function declaredWeights(value) {
  if (value === undefined) return [400, 400]
  const numbers = value
    .split(/\s+/)
    .map((part) => ({ normal: 400, bold: 700 })[part.toLowerCase()] ?? Number(part))
  if (numbers.length < 1 || numbers.length > 2 || numbers.some((n) => !(n >= 1 && n <= 1000))) {
    return null
  }
  return [numbers[0], numbers.at(-1) ?? numbers[0]]
}

/**
 * What a font file is and a `@font-face` rule says otherwise. Pure.
 * @param {FontInfo} font - The font, of `readFont()`
 * @param {Record<string, string>} descriptors - The declarations of the rule
 * @returns {string[]} One phrase per difference, such as `is of the family "Inter", declared
 *   as "DM Sans"`, empty when the rule says what the file is
 */
export function checkFontFace(font, descriptors) {
  const messages = []

  const family = (descriptors['font-family'] ?? '').replace(/^["']|["']$/g, '')
  if (family && !COMPUTED.test(family) && !isOfFamily(font.family, family)) {
    messages.push(`is of the family "${font.family}", declared as "${family}"`)
  }

  const style = (descriptors['font-style'] ?? 'normal').toLowerCase()
  const italic = /^(italic|oblique)/.test(style)
  if ((italic || style === 'normal') && italic !== font.italic) {
    messages.push(
      font.italic ? 'is an italic, declared as normal' : 'is not an italic, declared as one'
    )
  }

  const weights = declaredWeights(descriptors['font-weight'])
  if (weights) {
    const [from, to] = weights
    const written = from === to ? `${from}` : `${from} to ${to}`
    const axis = font.axes.wght
    if (axis && (from < axis.min || to > axis.max)) {
      messages.push(`has the weights ${axis.min} to ${axis.max}, declared with ${written}`)
    } else if (!axis && (from !== to || from !== font.weight)) {
      messages.push(`has the weight ${font.weight}, declared with ${written}`)
    }
  }
  return messages
}

/**
 * What two font files of one name say otherwise of themselves. Pure.
 * @param {FontInfo} font - A font, of `readFont()`
 * @param {FontInfo} other - The font of the same name in another format
 * @returns {string[]} One phrase per difference, with what the font says before what the
 *   other says, such as `the weight 700 against 400`, empty when the two are one font
 */
export function compareFonts(font, other) {
  const messages = []
  const axes = (/** @type {FontInfo} */ { axes }) =>
    Object.keys(axes)
      .sort()
      .map((tag) => `${tag} ${axes[tag].min} to ${axes[tag].max}`)
      .join(', ') || 'none'

  if (font.family !== other.family) {
    messages.push(`the family "${font.family}" against "${other.family}"`)
  }
  if (font.weight !== other.weight) {
    messages.push(`the weight ${font.weight} against ${other.weight}`)
  }
  if (font.italic !== other.italic) {
    messages.push(font.italic ? 'an italic against an upright' : 'an upright against an italic')
  }
  if (axes(font) !== axes(other)) {
    messages.push(`the axes ${axes(font)} against ${axes(other)}`)
  }
  if (font.version !== other.version) {
    messages.push(`the version "${font.version}" against "${other.version}"`)
  }
  if (font.glyphs !== other.glyphs) {
    messages.push(`${font.glyphs} glyphs against ${other.glyphs}`)
  }
  return messages
}

/**
 * Whether a `format()` of a `src` is the format of the file it is written after. A format
 * the lint does not know is the format of any file, and `-variations` after a format says
 * nothing of the file. Pure.
 * @param {string} format - As written in `format()`: `woff2`, `truetype`
 * @param {string} file - The address of the file, as written in `url()`
 * @returns {boolean}
 */
export function isOfFormat(format, file) {
  const extensions = FORMATS[format.toLowerCase().replace(/-variations$/, '')]
  return !extensions || extensions.includes(path.extname(file).toLowerCase())
}

/**
 * Every file under a folder, relative to it with forward slashes, without the files and
 * folders the build ignores.
 * @param {string} dir
 * @param {string[]} [ignore] - The patterns of `chassis.ignore`
 * @returns {string[]}
 */
function listSource(dir, ignore) {
  const files = []
  const walk = (folder, prefix) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (shouldIgnoreFile(entry.name, ignore)) continue
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path.join(folder, entry.name), relative)
      else files.push(relative)
    }
  }
  walk(dir, '')
  return files.sort()
}

/**
 * Check the fonts of `source/` against the stylesheets beside them, app by app, as a brand
 * gets them: the folders of `sourceLayers()`, its own files over those of the default brand
 * and the files of an app over the shared files.
 * @param {string} sourceDir - `source/`
 * @param {string[]} files - Every file of it, of `listSource()`
 * @param {{ brandFolder: string, brands: string[], apps: Record<string, string[]> }} config
 * @returns {{ errors: LintProblem[], warnings: LintProblem[] }}
 */
function lintFonts(sourceDir, files, config) {
  const { name: type, additionalFiles: stylesheets = [] } = assetTypes.fonts
  /** @type {Map<string, LintProblem>} */
  const errors = new Map()
  /** @type {Map<string, LintProblem>} */
  const warnings = new Map()
  const add = (/** @type {Map<string, LintProblem>} */ to, file, message) =>
    to.set(`${file} ${message}`, { file, message })

  // The fonts folder of each brand folder and app: the path inside it, and the source file
  /** @type {Map<string, Map<string, string>>} */
  const folders = new Map()
  for (const file of files) {
    const [brand, app, folder, ...rest] = file.split('/')
    if (folder !== type || rest.length === 0) continue
    const key = `${brand}/${app}`
    if (!folders.has(key)) folders.set(key, new Map())
    folders.get(key)?.set(rest.join('/'), file)
  }

  /** @type {Map<string, FontInfo|Error|null>} */
  const read = new Map()
  /**
   * What a font file says of itself, an error for a file that is no font, or null for a
   * file the lint does not read: another format, or a Git LFS pointer.
   * @param {string} file - Relative to `source/`
   */
  const infoOf = (file) => {
    if (!read.has(file)) {
      const full = path.join(sourceDir, file)
      let info = null
      if (READABLE_FORMATS.includes(path.extname(file)) && !isLfsPointer(full)) {
        try {
          info = readFont(fs.readFileSync(full))
        } catch (error) {
          info = /** @type {Error} */ (error)
        }
      }
      read.set(file, info)
    }
    return read.get(file) ?? null
  }

  // The apps to check, of each brand folder with fonts of its own: the app of the folder, or
  // every app for a shared folder
  /** @type {Set<string>} */
  const views = new Set()
  for (const key of folders.keys()) {
    const [brand, app] = key.split('/')
    if (brand !== config.brandFolder && !config.brands.includes(brand)) continue
    const apps = app === SHARED_FOLDER ? Object.keys(config.apps) : [app]
    for (const each of apps) views.add(`${brand}/${each}`)
  }

  for (const key of views) {
    const [brand, app] = key.split('/')
    const ofBrand = brand !== config.brandFolder
    const layers = sourceLayers(config.brandFolder, brand, app)
    /** @type {Map<string, string>} */
    const view = new Map(layers.flatMap((layer) => [...(folders.get(layer) ?? [])]))

    // The fonts the lint reads, by their path without the extension: the files of one name,
    // in the order of the formats
    /** @type {Map<string, string[]>} */
    const names = new Map()
    const formatOf = (/** @type {string} */ name) => READABLE_FORMATS.indexOf(path.extname(name))
    const withoutExtension = (/** @type {string} */ name) =>
      name.slice(0, name.length - path.extname(name).length)
    for (const name of view.keys()) {
      if (formatOf(name) === -1) continue
      const twins = names.get(withoutExtension(name)) ?? []
      names.set(withoutExtension(name), [...twins, name])
    }
    for (const twins of names.values()) twins.sort((a, b) => formatOf(a) - formatOf(b))

    /** @type {string[]} */
    const families = []
    for (const [name, sheet] of view) {
      if (!stylesheets.includes(path.extname(name))) continue
      const css = fs.readFileSync(path.join(sourceDir, sheet), 'utf-8')
      for (const rule of findFontFaces(css, { scss: path.extname(name) === '.scss' })) {
        const family = (rule.descriptors['font-family'] ?? '').replace(/^["']|["']$/g, '')
        if (family) families.push(family)
        for (const { value, format } of rule.urls) {
          if (NOT_BESIDE.test(value)) continue
          if (format && !isOfFormat(format, value)) {
            add(warnings, sheet, `declares ${value} as format("${format}"), which the file is not`)
          }
          const declared = path.posix.join(path.posix.dirname(name), value)
          if (!view.has(declared)) {
            add(errors, sheet, `declares ${value}, which is not in the fonts folder`)
            continue
          }
          // The declared file, then the files of its name in another format: a rule declares
          // the file of the web, and an app gets the one beside it
          const twins = names.get(withoutExtension(declared)) ?? []
          for (const twin of [declared, ...twins.filter((other) => other !== declared)]) {
            const font = view.get(twin) ?? ''
            const info = infoOf(font)
            if (info instanceof Error) {
              // A file that is no font is held against the rule that declares it, and not
              // against the rule of the file beside it
              if (twin === declared) {
                add(errors, font, `is declared by ${sheet} and is no font: ${info.message}`)
              }
            } else if (info) {
              for (const message of checkFontFace(info, rule.descriptors)) {
                add(errors, font, `${message} by ${sheet}`)
              }
            }
          }
        }
      }
    }

    // Two files of one name are one font in two formats: each is compared with the first
    // of the name that is read
    for (const twins of names.values()) {
      /** @type {{ file: string, info: FontInfo }|undefined} */
      let first
      for (const twin of twins) {
        const file = view.get(twin) ?? ''
        const info = infoOf(file)
        if (!info || info instanceof Error) continue
        if (!first) {
          first = { file, info }
          continue
        }
        const differences = compareFonts(info, first.info)
        if (differences.length > 0) {
          add(errors, file, `is another font than ${first.file}: ${differences.join(', ')}`)
        }
      }
    }

    // A font of the default brand in the output of a brand, of a family the brand declares
    // nowhere: the brand replaced the family and not this file
    if (!ofBrand || families.length === 0) continue
    for (const file of view.values()) {
      if (!file.startsWith(`${config.brandFolder}/`)) continue
      const info = infoOf(file)
      if (!info || info instanceof Error) continue
      if (!families.some((family) => isOfFamily(info.family, family))) {
        add(
          warnings,
          file,
          `is in the output of the brand ${brand}, and no stylesheet of the brand declares its family, "${info.family}"`
        )
      }
    }
  }
  return { errors: [...errors.values()], warnings: [...warnings.values()] }
}

/**
 * Check `source/`.
 * @param {{ cwd?: string, allowLfsPointers?: boolean }} [options]
 * @returns {{ errors: LintProblem[], warnings: LintProblem[], files: number }}
 * @throws {Error} When `source/` or `package.json` cannot be read
 */
export function lintSource(options = {}) {
  const cwd = resolveRoot(options.cwd)
  const sourceDir = path.join(cwd, 'source')
  const allowLfsPointers =
    options.allowLfsPointers || process.env.CHASSIS_ALLOW_LFS_POINTERS === '1'
  const config = loadConfig(cwd)
  const brands = [config.brandFolder, ...config.brands]
  const apps = Object.keys(config.apps)

  /** @type {LintProblem[]} */
  const errors = []
  /** @type {LintProblem[]} */
  const warnings = []

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (shouldIgnoreFile(entry.name, config.ignore) || !entry.isDirectory()) continue
    if (!brands.includes(entry.name)) {
      warnings.push({
        file: `${entry.name}/`,
        message: `is not the default folder or a brand of chassis.build.brands (${config.brands.join(', ')}), so the build reads nothing from it`
      })
      continue
    }
    for (const app of fs.readdirSync(path.join(sourceDir, entry.name), { withFileTypes: true })) {
      if (
        shouldIgnoreFile(app.name, config.ignore) ||
        !app.isDirectory() ||
        apps.includes(app.name) ||
        app.name === SHARED_FOLDER
      ) {
        continue
      }
      warnings.push({
        file: `${entry.name}/${app.name}/`,
        message: `is not an app of chassis.build.apps (${apps.join(', ')}) or ${SHARED_FOLDER}, so the build reads nothing from it`
      })
    }
  }

  const files = listSource(sourceDir, config.ignore)
  for (const file of files) {
    const oddity = config.lintAllow.find((known) => matchesPattern(file, known.pattern))
    for (const message of checkName(file)) {
      if (oddity) warnings.push({ file, message: `${message}. Kept: ${oddity.reason}` })
      else errors.push({ file, message })
    }
    if (!allowLfsPointers && isLfsPointer(path.join(sourceDir, file))) {
      errors.push({ file, message: 'is a Git LFS pointer, not the file. Run `git lfs pull`' })
    }
  }

  const fonts = lintFonts(sourceDir, files, config)
  errors.push(...fonts.errors)
  warnings.push(...fonts.warnings)

  return { errors, warnings, files: files.length }
}

/**
 * The command line of the source lint: `pnpm assets:lint:source`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  const options = { cwd: undefined, allowLfsPointers: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cwd' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      options.cwd = argv[++i]
    } else if (argv[i] === '--allow-lfs-pointers') {
      options.allowLfsPointers = true
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    }
  }

  try {
    const { errors, warnings, files } = lintSource(options)
    const isPointer = (/** @type {LintProblem} */ e) => e.message.includes('Git LFS pointer')
    const pointers = errors.filter(isPointer)
    for (const { file, message } of warnings) console.warn(`⚠️  source/${file} ${message}`)
    for (const { file, message } of errors.filter((e) => !isPointer(e))) {
      console.error(`❌ source/${file} ${message}`)
    }
    for (const { file, message } of pointers.slice(0, 5)) {
      console.error(`❌ source/${file} ${message}`)
    }
    if (pointers.length > 0) {
      console.error(
        `\n${pointers.length} Git LFS pointer(s)${pointers.length > 5 ? ', the first five above' : ''}. Run \`git lfs pull\`, or pass --allow-lfs-pointers to check the names only.`
      )
    }
    console.log(
      `\n${files} files checked: ${errors.length} error(s), ${warnings.length} warning(s)`
    )
    process.exit(errors.length > 0 ? 1 : 0)
  } catch (error) {
    console.error(`💥 Source lint failed: ${error.message}`)
    process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
