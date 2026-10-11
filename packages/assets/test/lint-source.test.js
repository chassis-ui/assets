/**
 * @file lint-source.test.js
 * @description The source lint of `build/lint-source.js`: the naming rules of the
 *              design-guidelines page as a table, the names `lint.allow` of `chassis.checks.json` keeps, and `lintSource()` on
 *              the fixture and on copies of it that break a rule. The fonts of the fixture
 *              are lines of text, so the rules of the fonts are tried on copies with the
 *              fonts of the dev dependency `inter-ui`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest'
import {
  checkFontFace,
  checkName,
  declaredWeights,
  isOfFamily,
  lintSource,
  matchesPattern
} from '../build/lint-source.js'
import { FIXTURE, copyFixture, removeTempDirs } from './helpers.js'

const INTER = path.dirname(createRequire(import.meta.url).resolve('inter-ui/package.json'))

afterAll(removeTempDirs)
afterEach(() => vi.unstubAllEnvs())

describe('checkName()', () => {
  test.each([
    'default/docs/images/hero-background.jpg',
    'default/docs/images/illustration-onboarding-step-1.svg',
    'default/docs/images/logo-light.svg',
    'default/docs/images/hero-image@2x.png',
    'default/docs/images/hero-image@3x.png',
    'default/docs/images/badge@1.5x.png',
    'brand-a/docs/images/logo/mark.svg',
    'default/docs/images/figma/components/card/light/card-orientation-top-2x-1.png',
    'default/docs/fonts/text-license.txt'
  ])('%s keeps the rules', (file) => {
    expect(checkName(file)).toEqual([])
  })

  test.each([
    [
      'default/docs/images/Hero Background.jpg',
      'has the name "Hero Background"',
      'hero-background.jpg'
    ],
    [
      'default/docs/images/hero_background.jpg',
      'has the name "hero_background"',
      'hero-background.jpg'
    ],
    [
      'default/docs/images/hero@background.jpg',
      'has the name "hero@background"',
      'hero-background.jpg'
    ],
    ['default/docs/images/HeroBanner.png', 'has the name "HeroBanner"', 'hero-banner.png'],
    ['default/docs/images/card@2x-1.png', 'has the name "card@2x-1"', 'card-2x-1.png'],
    ['default/docs/images/logo.min.svg', 'has the name "logo.min"', 'logo-min.svg'],
    ['default/docs/images/logo--dark.svg', 'has the name "logo--dark"', 'logo-dark.svg']
  ])('%s', (file, message, suggestion) => {
    const [problem] = checkName(file)
    expect(problem).toContain(message)
    expect(problem).toContain(`such as "${suggestion}"`)
  })

  test.each([
    ['default/docs/images/logo.SVG', 'has the extension .SVG, which is not in lowercase'],
    ['default/docs/images/logo', 'has no extension'],
    ['default/docs/Images/logo.svg', 'the folder "Images" is not of lowercase letters'],
    ['default/docs/images/Logos/logo.svg', 'the folder "Logos" is not of lowercase letters'],
    ['default/docs/logo.svg', 'is not in a type folder'],
    ['default/logo.svg', 'is not in a type folder']
  ])('%s: %s', (file, message) => {
    expect(checkName(file).join('\n')).toContain(message)
  })
})

describe('matchesPattern()', () => {
  test.each([
    ['default/docs/other/default.tokens.json', '*/*/other/default.tokens.json', true],
    [
      'default/demo/icons/icons/chassis-icons.min.css',
      '*/*/icons/icons/chassis-icons.min.css',
      true
    ],
    ['default/docs/other/nested/default.tokens.json', '*/*/other/default.tokens.json', false],
    ['default/docs/images/default.tokens.json', '*/*/other/default.tokens.json', false]
  ])('%s matches %s: %s', (file, pattern, expected) => {
    expect(matchesPattern(file, pattern)).toBe(expected)
  })
})

describe('lintSource()', () => {
  test('finds the names of the fixture that break the rules', () => {
    const { errors, warnings, files } = lintSource({ cwd: FIXTURE })
    expect(files).toBe(42)
    expect(warnings).toEqual([])
    expect(errors.map((e) => e.file)).toEqual([
      'default/mobile/data/brand.tokens.json',
      'default/mobile/icons/ic_close.svg',
      'default/mobile/icons/svgs/check_mark.svg',
      'default/mobile/images/HeroBanner.png',
      'default/site/data/brand.tokens.json',
      'default/site/icons/svgs/check_mark.svg',
      'default/site/images/HeroBanner.png'
    ])
  })

  /** A copy of the fixture with a file whose name has a dot, and `lint.allow` set. */
  function withTokensFile(allow) {
    const root = copyFixture()
    fs.mkdirSync(path.join(root, 'source/default/site/other'))
    fs.writeFileSync(path.join(root, 'source/default/site/other/default.tokens.json'), '{}')
    fs.writeFileSync(path.join(root, 'chassis.checks.json'), JSON.stringify({ lint: { allow } }))
    return root
  }

  test('a name that breaks a rule is an error', () => {
    const { errors } = lintSource({ cwd: withTokensFile([]) })
    expect(errors.map((e) => e.file)).toContain('default/site/other/default.tokens.json')
  })

  test('warns about a name of lint.allow instead of failing, with its reason', () => {
    const root = withTokensFile([
      { pattern: '*/*/other/default.tokens.json', reason: 'a Figma variables export' }
    ])
    const { errors, warnings } = lintSource({ cwd: root })
    expect(errors.map((e) => e.file)).not.toContain('default/site/other/default.tokens.json')
    expect(warnings).toEqual([
      {
        file: 'default/site/other/default.tokens.json',
        message: expect.stringContaining('Kept: a Figma variables export')
      }
    ])
  })

  test('warns about a brand or an app the build does not read', () => {
    const root = copyFixture()
    fs.mkdirSync(path.join(root, 'source/gamma/site/images'), { recursive: true })
    fs.mkdirSync(path.join(root, 'source/alpha/docs/images'), { recursive: true })
    const { warnings } = lintSource({ cwd: root })
    expect(warnings.map((w) => w.file)).toEqual(['alpha/docs/', 'gamma/'])
  })

  test('the ignored files are left out', () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/default/site/images/.DS_Store'), '')
    fs.writeFileSync(path.join(root, 'source/default/site/images/Thumbs.db'), '')
    const before = lintSource({ cwd: FIXTURE })
    expect(lintSource({ cwd: root })).toEqual(before)
  })

  test('a Git LFS pointer is an error, unless allowed', () => {
    vi.stubEnv('CHASSIS_ALLOW_LFS_POINTERS', '')
    const root = copyFixture()
    fs.writeFileSync(
      path.join(root, 'source/default/site/images/pointer.png'),
      'version https://git-lfs.github.com/spec/v1\noid sha256:0\nsize 1\n'
    )
    expect(lintSource({ cwd: root }).errors).toContainEqual({
      file: 'default/site/images/pointer.png',
      message: expect.stringContaining('is a Git LFS pointer')
    })
    const allowed = lintSource({ cwd: root, allowLfsPointers: true })
    expect(allowed.errors.map((e) => e.file)).not.toContain('default/site/images/pointer.png')
  })
})

describe('isOfFamily()', () => {
  test.each([
    ['Inter', 'Inter', true],
    ['inter', 'INTER', true],
    ['Inter 18pt', 'Inter', true],
    ['Source Serif 4 Display', 'Source Serif 4', true],
    ['Inter', 'Inter 18pt', false],
    ['Interstate', 'Inter', false],
    ['Fira Code', 'IBM Plex Mono', false]
  ])('a font of %s, declared as %s: %s', (family, declared, expected) => {
    expect(isOfFamily(family, declared)).toBe(expected)
  })
})

describe('declaredWeights()', () => {
  test.each([
    ['400', [400, 400]],
    ['100 900', [100, 900]],
    ['normal', [400, 400]],
    ['Bold', [700, 700]],
    ['normal bold', [400, 700]],
    [undefined, [400, 400]],
    ['$weight', null],
    ['100 400 900', null],
    ['', null]
  ])('%s', (value, expected) => {
    expect(declaredWeights(value)).toEqual(expected)
  })
})

describe('checkFontFace()', () => {
  const regular = { family: 'Inter', weight: 400, italic: false, axes: {} }
  const italic = { ...regular, weight: 600, italic: true }
  const variable = { ...regular, axes: { wght: { min: 300, max: 700 } } }

  test.each([
    [regular, { 'font-family': '"Inter"', 'font-weight': '400', 'font-style': 'normal' }],
    [regular, { 'font-family': "'inter'" }],
    [regular, { 'font-family': 'Inter', 'font-weight': 'normal' }],
    [italic, { 'font-family': '"Inter"', 'font-weight': '600', 'font-style': 'italic' }],
    [italic, { 'font-weight': '600', 'font-style': 'oblique 10deg' }],
    [variable, { 'font-family': '"Inter"', 'font-weight': '300 700' }],
    [variable, { 'font-weight': '400 600' }],
    [variable, { 'font-weight': '700' }],
    [variable, {}],
    // What is computed is not compared
    [italic, { 'font-family': '$family', 'font-weight': '$weight', 'font-style': '$style' }],
    [regular, { 'font-family': 'var(--family)' }]
  ])('%o is what %o says', (font, descriptors) => {
    expect(checkFontFace(font, descriptors)).toEqual([])
  })

  test.each([
    [regular, { 'font-family': '"DM Sans"' }, 'is of the family "Inter", declared as "DM Sans"'],
    [regular, { 'font-weight': '700' }, 'has the weight 400, declared with 700'],
    [italic, { 'font-style': 'italic' }, 'has the weight 600, declared with 400'],
    [regular, { 'font-weight': '100 900' }, 'has the weight 400, declared with 100 to 900'],
    [regular, { 'font-style': 'italic' }, 'is not an italic, declared as one'],
    [italic, { 'font-weight': '600' }, 'is an italic, declared as normal'],
    [
      variable,
      { 'font-weight': '100 900' },
      'has the weights 300 to 700, declared with 100 to 900'
    ],
    [variable, { 'font-weight': '800' }, 'has the weights 300 to 700, declared with 800']
  ])('%o is not what %o says', (font, descriptors, message) => {
    expect(checkFontFace(font, descriptors)).toEqual([message])
  })

  test('names every difference', () => {
    expect(
      checkFontFace(italic, {
        'font-family': 'Other',
        'font-weight': '400',
        'font-style': 'normal'
      })
    ).toEqual([
      'is of the family "Inter", declared as "Other"',
      'is an italic, declared as normal',
      'has the weight 600, declared with 400'
    ])
  })
})

describe('lintSource() on fonts', () => {
  const rule = (/** @type {string} */ body) => `@font-face {\n${body}\n}\n`
  const TEXT = rule(
    '  font-family: "Inter";\n  font-weight: 400;\n  src: url("text.woff2") format("woff2");'
  )

  /**
   * A copy of the fixture with real fonts in the `fonts/` folder of an app of a brand.
   * @param {string} root - The copy
   * @param {string} folder - `<brand>/<app>`
   * @param {Record<string, string>} files - The files: the name of a stylesheet with its
   *   text, the name of a font with the file of `inter-ui` it is a copy of
   */
  function fonts(root, folder, files) {
    const dir = path.join(root, 'source', folder, 'fonts')
    fs.mkdirSync(dir, { recursive: true })
    for (const [name, content] of Object.entries(files)) {
      if (/\.s?css$/.test(name)) fs.writeFileSync(path.join(dir, name), content)
      else fs.copyFileSync(path.join(INTER, content), path.join(dir, name))
    }
    return root
  }
  /** The problems of the fonts: those of the names of the fixture are left out. */
  const problems = (/** @type {string} */ root) => {
    const before = lintSource({ cwd: FIXTURE })
    const { errors, warnings } = lintSource({ cwd: root })
    return {
      errors: errors.filter((e) => !before.errors.some((b) => b.file === e.file)),
      warnings: warnings.filter((w) => !before.warnings.some((b) => b.file === w.file))
    }
  }

  test('the fonts of the fixture are lines of text, and no rule declares them', () => {
    expect(problems(FIXTURE)).toEqual({ errors: [], warnings: [] })
  })

  test('passes a stylesheet that says what its fonts are', () => {
    const root = fonts(copyFixture(), 'default/site', {
      'text.css':
        TEXT +
        rule(
          '  font-family: "Inter";\n  font-style: italic;\n  font-weight: 600;\n  src: url(strong-italic.woff2);'
        ) +
        rule(
          '  font-family: "Inter Variable";\n  font-weight: 100 900;\n  src: url(variable.woff2);'
        ) +
        rule('  font-family: "Far";\n  src: url("https://example.com/far.woff2");'),
      'text.woff2': 'web/Inter-Regular.woff2',
      'strong-italic.woff2': 'web/Inter-SemiBoldItalic.woff2',
      'variable.woff2': 'variable/InterVariable.woff2'
    })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })
  })

  test('names a font that is not what its rule says, with the stylesheet', () => {
    const root = fonts(copyFixture(), 'default/site', {
      'text.css': TEXT,
      'text.woff2': 'web/Inter-BoldItalic.woff2'
    })
    expect(problems(root).errors).toEqual([
      {
        file: 'default/site/fonts/text.woff2',
        message: 'is an italic, declared as normal by default/site/fonts/text.css'
      },
      {
        file: 'default/site/fonts/text.woff2',
        message: 'has the weight 700, declared with 400 by default/site/fonts/text.css'
      }
    ])
  })

  test('names a font of another family than its rule says', () => {
    const root = fonts(copyFixture(), 'default/site', {
      'text.scss': `// The text font\n${TEXT.replace('"Inter"', '"DM Sans"')}`,
      'text.woff2': 'web/Inter-Regular.woff2'
    })
    expect(problems(root).errors).toEqual([
      {
        file: 'default/site/fonts/text.woff2',
        message: 'is of the family "Inter", declared as "DM Sans" by default/site/fonts/text.scss'
      }
    ])
  })

  test('names a file that a rule declares and the folder has not, or that is no font', () => {
    const root = fonts(copyFixture(), 'default/site', {
      'display.css': rule(
        '  font-family: "Display";\n  src: url("display.woff2"), url("text.woff");'
      )
    })
    expect(problems(root).errors).toEqual([
      {
        file: 'default/site/fonts/display.css',
        message: 'declares display.woff2, which is not in the fonts folder'
      },
      {
        file: 'default/site/fonts/text.woff',
        message: expect.stringContaining(
          'is declared by default/site/fonts/display.css and is no font: the file is not a TrueType'
        )
      }
    ])
  })

  test('a brand is checked with the files of the default brand it does not replace', () => {
    // The brand replaces the font and keeps the stylesheet of the default brand
    const root = fonts(copyFixture(), 'default/site', {
      'text.css': TEXT,
      'text.woff2': 'web/Inter-Regular.woff2'
    })
    fonts(root, 'alpha/site', { 'text.woff2': 'web/Inter-Bold.woff2' })
    expect(problems(root).errors).toEqual([
      {
        file: 'alpha/site/fonts/text.woff2',
        message: 'has the weight 700, declared with 400 by default/site/fonts/text.css'
      }
    ])
    // With a stylesheet of its own, the brand says what its font is
    fonts(root, 'alpha/site', { 'text.css': TEXT.replace('400', '700') })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })
  })

  test('warns about a font of the default brand that a brand gets and does not declare', () => {
    const root = fonts(copyFixture(), 'default/site', {
      'text.css': TEXT,
      'text.woff2': 'web/Inter-Regular.woff2',
      'text-display.woff2': 'display/InterDisplay-Regular.woff2',
      'variable.woff2': 'variable/InterVariable.woff2'
    })
    // The brand has another family, from a service, and replaces the stylesheet alone
    fonts(root, 'alpha/site', {
      'text.css': rule(
        '  font-family: "Inter Variable";\n  src: url("https://example.com/v.woff2");'
      )
    })
    expect(problems(root)).toEqual({
      errors: [],
      warnings: [
        {
          file: 'default/site/fonts/text-display.woff2',
          message:
            'is in the output of the brand alpha, and no stylesheet of the brand declares its family, "Inter Display"'
        },
        {
          file: 'default/site/fonts/text.woff2',
          message:
            'is in the output of the brand alpha, and no stylesheet of the brand declares its family, "Inter"'
        }
      ]
    })
    // The default brand itself has the fonts it has: no warning without the brand
    fs.rmSync(path.join(root, 'source/alpha/site/fonts'), { recursive: true })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })
  })

  test('a Git LFS pointer in the place of a font is not read as one', () => {
    vi.stubEnv('CHASSIS_ALLOW_LFS_POINTERS', '')
    const root = fonts(copyFixture(), 'default/site', { 'text.css': TEXT })
    fs.writeFileSync(
      path.join(root, 'source/default/site/fonts/text.woff2'),
      'version https://git-lfs.github.com/spec/v1\noid sha256:0\nsize 1\n'
    )
    // The pointer is the one problem: the rule that declares it is not held against it
    expect(problems(root).errors).toEqual([
      {
        file: 'default/site/fonts/text.woff2',
        message: expect.stringContaining('is a Git LFS pointer')
      }
    ])
    const allowed = lintSource({ cwd: root, allowLfsPointers: true })
    expect(allowed.errors.map((e) => e.file)).not.toContain('default/site/fonts/text.woff2')
  })

  test('a brand the build does not read is not checked', () => {
    const root = fonts(copyFixture(), 'gamma/site', {
      'text.css': TEXT,
      'text.woff2': 'web/Inter-Bold.woff2'
    })
    expect(problems(root).errors).toEqual([])
  })
})
