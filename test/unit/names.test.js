/**
 * @file names.test.js
 * @description Tests for what takes a file name apart.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { describe, expect, test } from 'vitest'
import { byCodeUnit, isSystemFile, parseFileName } from '../../build/names.js'

describe('parseFileName', () => {
  test.each([
    ['logo.svg', { name: 'logo', density: 1, extension: '.svg' }],
    ['lego-chassis@2x.png', { name: 'lego-chassis', density: 2, extension: '.png' }],
    ['card@1.5x.webp', { name: 'card', density: 1.5, extension: '.webp' }],
    ['card@1x.png', { name: 'card', density: 1, extension: '.png' }],
    ['default.tokens.json', { name: 'default.tokens', density: 1, extension: '.json' }],
    ['Alert Window@2x.png', { name: 'Alert Window', density: 2, extension: '.png' }],
    ['LICENSE', { name: 'LICENSE', density: 1, extension: '' }]
  ])('%s', (file, parts) => {
    expect(parseFileName(file)).toEqual(parts)
  })

  test('takes an indicator only where it ends the name', () => {
    expect(parseFileName('card-top@2x-1.png')).toEqual({
      name: 'card-top@2x-1',
      density: 1,
      extension: '.png'
    })
  })
})

describe('isSystemFile', () => {
  test.each(['.DS_Store', '._logo.png', '.gitkeep', 'Thumbs.db', 'desktop.ini', 'a.svg~', 'a.swp'])(
    'leaves out %s',
    (name) => {
      expect(isSystemFile(name)).toBe(true)
    }
  )

  test.each(['logo.svg', 'fonts.json', 'template.html', 'icons'])('keeps %s', (name) => {
    expect(isSystemFile(name)).toBe(false)
  })
})

describe('byCodeUnit', () => {
  test('sorts capitals before lowercase letters, in every locale', () => {
    expect(['b', 'a', 'B', 'a@2x', 'a-small'].sort(byCodeUnit)).toEqual([
      'B',
      'a',
      'a-small',
      'a@2x',
      'b'
    ])
  })
})
