/**
 * @file contract.js
 * @description The consumer contract as data: the files that the Chassis sites read from
 *              the docs output, as `docs/architecture.md` lists them.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { byCodeUnit } from './names.js'

/** @import { Job } from './types.js' */

/**
 * The job whose output the sites read: `dist/web/docs/chassis/`.
 * @type {Pick<Job, 'platform' | 'app' | 'brand'>}
 */
export const CONTRACT_JOB = { platform: 'web', app: 'docs', brand: 'chassis' }

/**
 * Writes out the alternatives of a pattern: `a-{b,c}.svg` gives `a-b.svg` and `a-c.svg`.
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

/** The files that a site reads by name, with who reads them. */
export const CONTRACT = [
  {
    reader: 'Navigation.astro and Footer.astro of @chassis-ui/docs',
    files: ['images/site-logo.svg']
  },
  {
    reader: 'Favicons.astro of @chassis-ui/docs',
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
 * Finds the files of the consumer contract that an output does not have.
 *
 * A screenshot is read in two modes and at two densities, so a screenshot that the output
 * has in one of them has to be there in all four. The output has to hold screenshots.
 * @param {string[]} paths - The paths of the files of the docs output.
 * @returns {Array<{ path: string, reader: string }>} The missing files, sorted by path.
 */
export function missingFromContract(paths) {
  const has = new Set(paths)
  const missing = CONTRACT.flatMap(({ reader, files }) =>
    files
      .flatMap(expand)
      .filter((path) => !has.has(path))
      .map((path) => ({ path, reader }))
  )

  /** @type {Set<string>} */
  const screenshots = new Set()
  for (const path of paths) {
    const [, component, , name] = SCREENSHOT.exec(path) ?? []
    if (component) screenshots.add(`${component}/{light,dark}/${name}{,@2x}.png`)
  }
  if (screenshots.size === 0) {
    missing.push({ path: 'images/figma/components/', reader: SCREENSHOT_READER })
  }
  for (const screenshot of screenshots) {
    for (const path of expand(`images/figma/components/${screenshot}`)) {
      if (!has.has(path)) missing.push({ path, reader: SCREENSHOT_READER })
    }
  }
  return missing.sort((a, b) => byCodeUnit(a.path, b.path))
}
