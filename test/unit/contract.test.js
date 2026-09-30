/**
 * @file contract.test.js
 * @description Tests for the consumer contract: the files it names, and what it finds
 *              missing in an output.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { CONTRACT, CONTRACT_JOB, expand, missingFromContract } from '../../build/contract.js'

const named = CONTRACT.flatMap(({ files }) => files.flatMap(expand))
const screenshots = expand('images/figma/components/alert/{light,dark}/alert-window{,@2x}.png')

describe('expand', () => {
  test('writes out the alternatives of a pattern', () => {
    expect(expand('images/site-logo.svg')).toEqual(['images/site-logo.svg'])
    expect(expand('images/logo/chassis-{logo,icon}-{brand,white}-banner.svg')).toEqual([
      'images/logo/chassis-logo-brand-banner.svg',
      'images/logo/chassis-logo-white-banner.svg',
      'images/logo/chassis-icon-brand-banner.svg',
      'images/logo/chassis-icon-white-banner.svg'
    ])
    expect(expand('a{,-small}{,@2x}.png')).toEqual([
      'a.png',
      'a@2x.png',
      'a-small.png',
      'a-small@2x.png'
    ])
  })
})

describe('the contract', () => {
  test('is about the docs output of the brand chassis', () => {
    expect(CONTRACT_JOB).toEqual({ platform: 'web', app: 'docs', brand: 'chassis' })
  })

  test('names the files that docs/architecture.md lists', () => {
    expect(named).toHaveLength(1 + 4 + 2 + 1 + 1 + 16 + 12 + 4 + 4)
    expect(new Set(named).size).toBe(named.length)
    expect(named).toContain('icons/cx-sprite.svg')
    expect(named).toContain('images/social-image.png')
    expect(named).toContain('images/favicon-16x16.png')
    expect(named).toContain('images/android-chrome-512x512.png')
    expect(named).toContain('images/home/comp-gallery-dark-small@2x.webp')
    expect(named).toContain('images/home/comp-gallery-light.png')
    expect(named).toContain('images/home/figma-tokens-dark@2x.webp')
    expect(named).toContain('images/home/icon-library-light.svg')
    expect(named).toContain('images/home/tokens-visual.svg')
    expect(named).toContain('images/logo/chassis-icon-white-banner.svg')
    expect(named).not.toContain('images/home/figma-docs-light.png')
  })
})

describe('missingFromContract', () => {
  test('finds nothing in an output that has every file', () => {
    expect(missingFromContract([...named, ...screenshots, 'chassis-assets.json'])).toEqual([])
  })

  test('finds a file that the output lacks, with who reads it', () => {
    const paths = [...named, ...screenshots].filter(
      (path) => path !== 'images/social-image.png' && !path.startsWith('images/logo/chassis-icon')
    )
    expect(missingFromContract(paths)).toEqual([
      {
        path: 'images/logo/chassis-icon-brand-banner.svg',
        reader: 'BrandingSection.astro of the website'
      },
      {
        path: 'images/logo/chassis-icon-white-banner.svg',
        reader: 'BrandingSection.astro of the website'
      },
      {
        path: 'images/social-image.png',
        reader: 'BaseLayout.astro of @chassis-ui/docs, which fails the build of a site without it'
      }
    ])
  })

  test('finds the files of a screenshot that is not there in both modes and densities', () => {
    const paths = [
      ...named,
      ...screenshots.slice(0, 1),
      'images/figma/components/card/dark/card@2x.png'
    ]
    expect(missingFromContract(paths).map((file) => file.path)).toEqual([
      'images/figma/components/alert/dark/alert-window.png',
      'images/figma/components/alert/dark/alert-window@2x.png',
      'images/figma/components/alert/light/alert-window@2x.png',
      'images/figma/components/card/dark/card.png',
      'images/figma/components/card/light/card.png',
      'images/figma/components/card/light/card@2x.png'
    ])
  })

  test('finds that the output holds no screenshot', () => {
    expect(missingFromContract(named)).toEqual([
      {
        path: 'images/figma/components/',
        reader: 'ExampleImage.astro and CxVariant.astro of chassis-figma'
      }
    ])
  })
})
