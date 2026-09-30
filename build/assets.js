/**
 * @file assets.js
 * @description Puts the assets of a job together from its layers: what a later layer
 *              overrides, the rule of an image, and the files of a font family.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { ruleOf } from './manifests/images.js'
import { byCodeUnit } from './names.js'

/** @import { Asset, Layer, Problem, SourceFile } from './types.js' */

/**
 * The font families of a layer, as assets: the faces of each in the order of the
 * manifest, then its license.
 * @param {Layer} layer
 * @returns {{ assets: Asset[], problems: Problem[], unlisted: SourceFile[] }} `unlisted`
 *   has the files of `fonts/` that no family names.
 */
function fontsOf(layer) {
  const fonts = layer.files.filter((file) => file.type === 'fonts')
  const byPath = new Map(fonts.map((file) => [file.path, file]))
  /** @type {Set<string>} */
  const listed = new Set()
  /** @type {Asset[]} */
  const assets = []
  /** @type {Problem[]} */
  const problems = []

  for (const family of layer.families) {
    const names = [...family.faces.map((face) => face.file), family.license]
    const files = []
    for (const name of names) {
      const file = byPath.get(`${layer.path}/fonts/${name}`)
      if (file) {
        files.push(file)
        listed.add(file.path)
      } else {
        const what = name === family.license ? 'license' : 'file'
        problems.push({
          rule: 'fonts',
          file: family.manifest,
          message: `the family "${family.id}" names the ${what} ${name}, which does not exist`
        })
      }
    }
    assets.push({
      type: 'fonts',
      id: `fonts/${family.id}`,
      folder: '',
      name: family.id,
      files,
      family
    })
  }
  return { assets, problems, unlisted: fonts.filter((file) => !listed.has(file.path)) }
}

/**
 * Puts the assets of a job together from its layers. A later layer overrides an asset of
 * an earlier one, with every file of it: the job takes the files of the last layer that
 * has the asset. The rules of the image manifests are read in the order of the layers.
 * @param {Layer[]} layers - The layers of a job that exist, in override order.
 * @returns {{ assets: Asset[], problems: Problem[], unlisted: SourceFile[] }} The assets,
 *   sorted by id. `problems` has what is wrong with the layers and with the families.
 *   `unlisted` has the font files that no family names: the build leaves them out.
 */
export function compose(layers) {
  /** @type {Map<string, Asset>} */
  const assets = new Map()
  const problems = layers.flatMap((layer) => layer.problems)
  /** @type {SourceFile[]} */
  const unlisted = []

  for (const layer of layers) {
    /** @type {Map<string, Asset>} */
    const ofLayer = new Map()
    for (const file of layer.files) {
      if (file.type === 'fonts') continue
      const { type, folder, name } = file
      const id = [type, folder, name].filter(Boolean).join('/')
      if (!ofLayer.has(id)) ofLayer.set(id, { type, id, folder, name, files: [] })
      ofLayer.get(id).files.push(file)
    }
    const fonts = fontsOf(layer)
    problems.push(...fonts.problems)
    unlisted.push(...fonts.unlisted)
    for (const asset of fonts.assets) ofLayer.set(asset.id, asset)
    for (const [id, asset] of ofLayer) assets.set(id, asset)
  }

  const rules = layers.flatMap((layer) => layer.rules)
  const taken = [...assets.values()].sort((a, b) => byCodeUnit(a.id, b.id))
  for (const asset of taken) {
    if (asset.type !== 'images') continue
    const rule = ruleOf(asset.id.slice('images/'.length), rules)
    if (rule) asset.rule = rule
  }
  return { assets: taken, problems, unlisted }
}
