/**
 * @file lint.js
 * @description The rules of the source lint: each a function from what was read of
 *              `source/` to a list of problems. They read no file.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { compose } from './assets.js'
import { BuildError } from './errors.js'
import { FONT_EXTENSIONS } from './manifests/fonts.js'
import { derives, matches, ruleOf } from './manifests/images.js'
import { DEFAULT_LAYER, SHARED_LAYER, SOURCE, byCodeUnit } from './names.js'
import { variantsOf } from './rules/variants.js'

/** @import { Layer, Problem, Source, SourceFile } from './types.js' */

const NAME = /^[a-z][a-z0-9-]*$/
const EXTENSION = /^\.[a-z0-9]+$/
const INDICATOR = /@[^/]*?x(?=\.[^.]+$)/
const INDICATORS = ['@2x', '@3x', '@4x']
const RASTER = ['.png', '.jpg', '.webp', '.gif', '.avif']
const GENERATED = ['.woff', '.woff2', '.eot', '.css', '.scss']

/** The extensions that a type folder takes. `other/` takes every file. */
const EXTENSIONS = {
  images: ['.png', '.jpg', '.webp', '.svg', '.gif'],
  icons: ['.svg'],
  fonts: FONT_EXTENSIONS
}

/**
 * The layers of the source, each once.
 * @param {Source} source
 * @returns {Layer[]}
 */
function layersOf(source) {
  /** @type {Map<string, Layer>} */
  const layers = new Map()
  for (const stack of source.stacks) {
    for (const layer of stack.layers) layers.set(layer.path, layer)
  }
  return [...layers.values()]
}

/**
 * Whether a file is a license of `fonts/licenses/`.
 * @param {SourceFile} file
 * @returns {boolean}
 */
function isLicense(file) {
  return file.type === 'fonts' && file.folder === 'licenses' && file.extension === '.txt'
}

/**
 * Whether a file is one that the build writes, and that has no place in `fonts/`.
 * @param {SourceFile} file
 * @returns {boolean}
 */
function isGenerated(file) {
  return file.type === 'fonts' && GENERATED.includes(file.extension.toLowerCase())
}

/**
 * The name of a file, without its folders.
 * @param {SourceFile} file
 * @returns {string}
 */
function fileName(file) {
  return file.path.slice(file.path.lastIndexOf('/') + 1)
}

/**
 * Names: lowercase letters, digits and hyphens, with a letter first. A resolution
 * indicator only on a raster image, and only `@2x`, `@3x` or `@4x`.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function names(source) {
  /** @type {Problem[]} */
  const problems = []
  /** @type {Set<string>} */
  const folders = new Set()
  for (const layer of layersOf(source)) {
    for (const file of layer.files) {
      let folder = `${layer.path}/${file.type}`
      for (const name of file.folder.split('/').filter(Boolean)) {
        folder += `/${name}`
        if (NAME.test(name) || folders.has(folder)) continue
        folders.add(folder)
        problems.push({
          rule: 'names',
          file: `${folder}/`,
          message:
            'is not a name of lowercase letters, digits and hyphens that starts with a letter'
        })
      }

      const name = fileName(file)
      const [indicator] = INDICATOR.exec(name) ?? []
      const extension = file.extension.toLowerCase()
      /** @type {(message: string) => number} */
      const fail = (message) => problems.push({ rule: 'names', file: file.path, message })

      if (file.extension === '.jpeg') fail('is a JPEG file, which has the extension .jpg')
      else if (!EXTENSION.test(file.extension)) {
        fail(
          file.extension
            ? `has the extension ${file.extension}, which is not in lowercase`
            : 'has no extension'
        )
      }
      if (indicator && !RASTER.includes(extension)) {
        fail(`has the resolution indicator ${indicator}, which only a raster image has`)
      } else if (indicator && !INDICATORS.includes(indicator)) {
        fail(
          `has the resolution indicator ${indicator}, which is not ${INDICATORS.join(', ')}. ` +
            'A file at 1x has none'
        )
      }
      if (!NAME.test(file.name)) {
        const suggestion = file.name
          .replace(/([a-z])([A-Z])/g, '$1-$2')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^[^a-z]+|-+$/g, '')
        const hint = NAME.test(suggestion) ? `, as ${suggestion}` : ''
        fail(
          `has the name "${file.name}", which is not of lowercase letters, digits and ` +
            `hyphens with a letter first${hint}`
        )
      }
    }
  }
  return problems
}

/**
 * Known types: a file is in a type folder, and has an extension that the folder takes.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function knownTypes(source) {
  const problems = layersOf(source).flatMap((layer) =>
    layer.problems.filter((problem) => problem.rule === 'known-types')
  )
  for (const layer of layersOf(source)) {
    for (const file of layer.files) {
      const extensions = EXTENSIONS[file.type]
      const extension = file.extension.toLowerCase()
      // The name of a JPEG file and a file that the build writes have their own rules
      if (!extensions || extensions.includes(extension) || extension === '.jpeg') continue
      if (isLicense(file) || isGenerated(file)) continue
      problems.push({
        rule: 'known-types',
        file: file.path,
        message:
          `is a ${file.extension || 'file without extension'} in ${file.type}/, which takes ` +
          `${extensions.join(', ')}${file.type === 'fonts' ? ', and licenses/*.txt' : ''}`
      })
    }
  }
  return problems
}

/**
 * Real files, and manifests that parse: what the reading of a layer found.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function realFiles(source) {
  return [
    ...layersOf(source).flatMap((layer) => layer.problems),
    ...source.stacks.flatMap((stack) => stack.problems)
  ].filter((problem) => problem.rule !== 'known-types')
}

/**
 * One master, and no derived variant: an image has one file, unless a rule says
 * `committed`, and no committed file has the name of a variant that the build derives.
 * No scaling up: no variant is larger than its master.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function images(source) {
  /** @type {Problem[]} */
  const problems = []
  for (const stack of source.stacks) {
    const { assets } = compose(stack.layers)
    const pictures = assets.filter((asset) => asset.type === 'images')
    /** @type {Map<string, SourceFile>} */
    const byOutput = new Map()
    for (const asset of pictures) {
      for (const file of asset.files) {
        byOutput.set(`${asset.folder}/${fileName(file)}`, file)
      }
    }

    for (const asset of pictures) {
      if (asset.rule?.committed) continue
      const [master, ...others] = asset.files
      if (others.length > 0) {
        const names = asset.files.map(fileName).join(', ')
        problems.push({
          rule: 'one-master',
          file: master.path,
          message:
            `is one of ${asset.files.length} files of the image ${asset.id} (${names}). ` +
            'Keep the master, the file at the highest density, or give the image a rule ' +
            'that says "committed"'
        })
        continue
      }
      if (!derives(asset.rule)) continue

      try {
        for (const variant of variantsOf(asset)) {
          const committed = byOutput.get(`${asset.folder}/${variant.name}`)
          if (!committed || committed === master) continue
          problems.push({
            rule: 'no-derived-variant',
            file: committed.path,
            message: `has the name of a variant that the build derives from ${master.path}`
          })
        }
      } catch (error) {
        if (!(error instanceof BuildError)) throw error
        problems.push({
          rule: error.rule,
          file: error.file,
          message: error.message.replace(`${error.file}: `, '')
        })
      }
    }
  }
  return problems
}

/**
 * Manifest: every rule of an image manifest matches an image, in a job that reads it.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function manifests(source) {
  /** @type {Map<string, { file: string, match: string, matched: boolean }>} */
  const rules = new Map()
  for (const stack of source.stacks) {
    const { assets } = compose(stack.layers)
    const pictures = assets
      .filter((asset) => asset.type === 'images')
      .map((asset) => asset.id.slice('images/'.length))
    for (const layer of stack.layers) {
      for (const [index, rule] of layer.rules.entries()) {
        const key = `${rule.file} ${index}`
        const matched = pictures.some((image) => matches(rule.match, image))
        const before = rules.get(key)
        rules.set(key, {
          file: rule.file,
          match: rule.match,
          matched: matched || before?.matched === true
        })
      }
    }
  }
  return [...rules.values()]
    .filter((rule) => !rule.matched)
    .map((rule) => ({
      rule: 'manifest',
      file: rule.file,
      message: `the rule "${rule.match}" matches no image`
    }))
}

/**
 * Fonts: every font file is in the font manifest, and `fonts/` holds no file that the
 * build writes.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function fonts(source) {
  /** @type {Problem[]} */
  const problems = []
  for (const layer of layersOf(source)) {
    const { unlisted, problems: missing } = compose([{ ...layer, problems: [] }])
    problems.push(...missing)
    for (const file of unlisted) {
      if (isGenerated(file)) {
        problems.push({
          rule: 'no-generated-file',
          file: file.path,
          message:
            'is a file that the build writes. fonts/ holds one OTF or TTF file per face, ' +
            'and the build writes the WOFF2 files and the stylesheet'
        })
      } else if (FONT_EXTENSIONS.includes(file.extension.toLowerCase())) {
        problems.push({
          rule: 'fonts',
          file: file.path,
          message: 'is in no family of fonts/fonts.json'
        })
      } else if (isLicense(file)) {
        problems.push({
          rule: 'fonts',
          file: file.path,
          message: 'is the license of no family of fonts/fonts.json'
        })
      }
    }
  }
  return problems
}

/**
 * No duplicate: no two files of one folder have the same content, unless they are
 * images of a rule that says `committed`.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function duplicates(source) {
  /** @type {Problem[]} */
  const problems = []
  for (const stack of source.stacks) {
    const rules = stack.layers.flatMap((layer) => layer.rules)
    const isCommitted = (/** @type {SourceFile} */ file) =>
      file.type === 'images' &&
      ruleOf([file.folder, file.name].filter(Boolean).join('/'), rules)?.committed === true

    /** @type {Map<string, SourceFile[]>} */
    const groups = new Map()
    for (const file of stack.layers.flatMap((layer) => layer.files)) {
      if (!file.sha256) continue
      const key = `${file.layer}/${file.type}/${file.folder} ${file.sha256}`
      groups.set(key, [...(groups.get(key) ?? []), file])
    }
    for (const [first, ...others] of groups.values()) {
      if (others.length === 0 || [first, ...others].every(isCommitted)) continue
      problems.push({
        rule: 'no-duplicate',
        file: first.path,
        message: `has the same content as ${others.map(fileName).join(', ')} of its folder`
      })
    }
  }
  return problems
}

/**
 * Reserved names: a folder of `source/` is `default` or a brand of the configuration,
 * and a folder of a brand is `shared` or an app of the configuration.
 * @param {Source} source
 * @returns {Problem[]}
 */
export function reservedNames(source) {
  const { brands, apps } = source.config
  /** @type {Problem[]} */
  const problems = []
  for (const [folder, entries] of Object.entries(source.folders)) {
    const known =
      folder === SOURCE ? [DEFAULT_LAYER, ...brands] : [SHARED_LAYER, ...Object.keys(apps)]
    const expected =
      folder === SOURCE
        ? `${DEFAULT_LAYER} or a brand of the configuration (${brands.join(', ')})`
        : `${SHARED_LAYER} or an app of the configuration (${Object.keys(apps).join(', ')})`
    for (const entry of entries) {
      if (entry.directory && known.includes(entry.name)) continue
      problems.push({
        rule: 'reserved-names',
        file: `${folder}/${entry.name}${entry.directory ? '/' : ''}`,
        message: entry.directory
          ? `is not ${expected}`
          : `is a file. The folder holds folders only: ${expected}`
      })
    }
  }
  return problems
}

/** The rules of the lint, in the order of the source contract. */
export const RULES = [
  names,
  knownTypes,
  realFiles,
  images,
  manifests,
  fonts,
  duplicates,
  reservedNames
]

/**
 * Checks the source against the source contract.
 * @param {Source} source - What was read of `source/`.
 * @returns {Problem[]} Every problem once, sorted by file.
 */
export function lintSource(source) {
  /** @type {Map<string, Problem>} */
  const problems = new Map()
  for (const rule of RULES) {
    for (const problem of rule(source)) {
      problems.set(`${problem.file}\n${problem.rule}\n${problem.message}`, problem)
    }
  }
  return [...problems.values()].sort(
    (a, b) => byCodeUnit(a.file, b.file) || byCodeUnit(a.rule, b.rule)
  )
}
