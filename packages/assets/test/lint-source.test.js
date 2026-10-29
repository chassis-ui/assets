/**
 * @file lint-source.test.js
 * @description The source lint of `build/lint-source.js`: the naming rules of the
 *              design-guidelines page as a table, the names `lint.allow` of `chassis.checks.json` keeps, and `lintSource()` on
 *              the fixture and on copies of it that break a rule. The fonts of the fixture
 *              are lines of text, so the rules of the fonts are tried on copies with the
 *              fonts of the dev dependency `inter-ui`, as WOFF2, and as TrueType, which
 *              `beforeAll()` writes of them.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import subsetFont from 'subset-font'
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import {
  checkFontFace,
  checkName,
  compareFonts,
  declaredWeights,
  isOfFamily,
  isOfFormat,
  lintSource,
  matchesPattern
} from '../build/lint-source.js'
import { FIXTURE, copyFixture, removeTempDirs } from './helpers.js'

const INTER = path.dirname(createRequire(import.meta.url).resolve('inter-ui/package.json'))

afterAll(removeTempDirs)
afterEach(() => vi.unstubAllEnvs())

describe('checkName()', () => {
  test.each([
    '_default/docs/images/hero-background.jpg',
    '_default/docs/images/illustration-onboarding-step-1.svg',
    '_default/docs/images/logo-light.svg',
    '_default/docs/images/hero-image@2x.png',
    '_default/docs/images/hero-image@3x.png',
    '_default/docs/images/badge@1.5x.png',
    'brand-a/docs/images/logo/mark.svg',
    'brand-a/_shared/images/logo/mark.svg',
    '_default/docs/images/figma/components/card/light/card-orientation-top-2x-1.png',
    '_default/docs/fonts/text-license.txt'
  ])('%s keeps the rules', (file) => {
    expect(checkName(file)).toEqual([])
  })

  test.each([
    [
      '_default/docs/images/Hero Background.jpg',
      'has the name "Hero Background"',
      'hero-background.jpg'
    ],
    [
      '_default/docs/images/hero_background.jpg',
      'has the name "hero_background"',
      'hero-background.jpg'
    ],
    [
      '_default/docs/images/hero@background.jpg',
      'has the name "hero@background"',
      'hero-background.jpg'
    ],
    ['_default/docs/images/HeroBanner.png', 'has the name "HeroBanner"', 'hero-banner.png'],
    ['_default/docs/images/card@2x-1.png', 'has the name "card@2x-1"', 'card-2x-1.png'],
    ['_default/docs/images/logo.min.svg', 'has the name "logo.min"', 'logo-min.svg'],
    ['_default/docs/images/logo--dark.svg', 'has the name "logo--dark"', 'logo-dark.svg']
  ])('%s', (file, message, suggestion) => {
    const [problem] = checkName(file)
    expect(problem).toContain(message)
    expect(problem).toContain(`such as "${suggestion}"`)
  })

  test.each([
    ['_default/docs/images/logo.SVG', 'has the extension .SVG, which is not in lowercase'],
    ['_default/docs/images/logo', 'has no extension'],
    ['_default/docs/Images/logo.svg', 'the folder "Images" is not of lowercase letters'],
    ['_default/docs/images/Logos/logo.svg', 'the folder "Logos" is not of lowercase letters'],
    ['_default/docs/_images/logo.svg', 'the folder "_images" is not of lowercase letters'],
    ['_default/docs/logo.svg', 'is not in a type folder'],
    ['_default/logo.svg', 'is not in a type folder']
  ])('%s: %s', (file, message) => {
    expect(checkName(file).join('\n')).toContain(message)
  })
})

describe('matchesPattern()', () => {
  test.each([
    ['_default/docs/other/default.tokens.json', '*/*/other/default.tokens.json', true],
    [
      '_default/demo/icons/icons/chassis-icons.min.css',
      '*/*/icons/icons/chassis-icons.min.css',
      true
    ],
    ['_default/docs/other/nested/default.tokens.json', '*/*/other/default.tokens.json', false],
    ['_default/docs/images/default.tokens.json', '*/*/other/default.tokens.json', false]
  ])('%s matches %s: %s', (file, pattern, expected) => {
    expect(matchesPattern(file, pattern)).toBe(expected)
  })
})

describe('lintSource()', () => {
  test('finds the names of the fixture that break the rules', () => {
    const { errors, warnings, files } = lintSource({ cwd: FIXTURE })
    expect(files).toBe(45)
    expect(warnings).toEqual([])
    expect(errors.map((e) => e.file)).toEqual([
      '_default/mobile/data/brand.tokens.json',
      '_default/mobile/icons/ic_close.svg',
      '_default/mobile/icons/svgs/check_mark.svg',
      '_default/mobile/images/HeroBanner.png',
      '_default/site/data/brand.tokens.json',
      '_default/site/icons/svgs/check_mark.svg',
      '_default/site/images/HeroBanner.png'
    ])
  })

  /** A copy of the fixture with a file whose name has a dot, and `lint.allow` set. */
  function withTokensFile(allow) {
    const root = copyFixture()
    fs.mkdirSync(path.join(root, 'source/_default/site/other'))
    fs.writeFileSync(path.join(root, 'source/_default/site/other/default.tokens.json'), '{}')
    fs.writeFileSync(path.join(root, 'chassis.checks.json'), JSON.stringify({ lint: { allow } }))
    return root
  }

  test('a name that breaks a rule is an error', () => {
    const { errors } = lintSource({ cwd: withTokensFile([]) })
    expect(errors.map((e) => e.file)).toContain('_default/site/other/default.tokens.json')
  })

  test('warns about a name of lint.allow instead of failing, with its reason', () => {
    const root = withTokensFile([
      { pattern: '*/*/other/default.tokens.json', reason: 'a Figma variables export' }
    ])
    const { errors, warnings } = lintSource({ cwd: root })
    expect(errors.map((e) => e.file)).not.toContain('_default/site/other/default.tokens.json')
    expect(warnings).toEqual([
      {
        file: '_default/site/other/default.tokens.json',
        message: expect.stringContaining('Kept: a Figma variables export')
      }
    ])
  })

  test('warns about a brand or an app the build does not read', () => {
    const root = copyFixture()
    fs.mkdirSync(path.join(root, 'source/gamma/site/images'), { recursive: true })
    fs.mkdirSync(path.join(root, 'source/alpha/docs/images'), { recursive: true })
    fs.mkdirSync(path.join(root, 'source/alpha/_common/images'), { recursive: true })
    fs.mkdirSync(path.join(root, 'source/_shared/site/images'), { recursive: true })
    const { warnings } = lintSource({ cwd: root })
    // _shared is a folder of a brand, not of source/
    expect(warnings.map((w) => w.file)).toEqual([
      '_shared/',
      'alpha/_common/',
      'alpha/docs/',
      'gamma/'
    ])
  })

  test('the ignored files are left out', () => {
    const root = copyFixture()
    fs.writeFileSync(path.join(root, 'source/_default/site/images/.DS_Store'), '')
    fs.writeFileSync(path.join(root, 'source/_default/site/images/Thumbs.db'), '')
    const before = lintSource({ cwd: FIXTURE })
    expect(lintSource({ cwd: root })).toEqual(before)
  })

  test('a Git LFS pointer is an error, unless allowed', () => {
    vi.stubEnv('CHASSIS_ALLOW_LFS_POINTERS', '')
    const root = copyFixture()
    fs.writeFileSync(
      path.join(root, 'source/_default/site/images/pointer.png'),
      'version https://git-lfs.github.com/spec/v1\noid sha256:0\nsize 1\n'
    )
    expect(lintSource({ cwd: root }).errors).toContainEqual({
      file: '_default/site/images/pointer.png',
      message: expect.stringContaining('is a Git LFS pointer')
    })
    const allowed = lintSource({ cwd: root, allowLfsPointers: true })
    expect(allowed.errors.map((e) => e.file)).not.toContain('_default/site/images/pointer.png')
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

describe('compareFonts()', () => {
  const regular = {
    family: 'Inter',
    weight: 400,
    italic: false,
    axes: {},
    version: 'Version 4.001',
    glyphs: 2937
  }
  const variable = {
    ...regular,
    axes: { wght: { min: 100, max: 900 }, opsz: { min: 14, max: 32 } }
  }

  test('a font is the font it is, and the order of its axes says nothing', () => {
    expect(compareFonts(regular, { ...regular })).toEqual([])
    expect(
      compareFonts(variable, {
        ...regular,
        axes: { opsz: { min: 14, max: 32 }, wght: { min: 100, max: 900 } }
      })
    ).toEqual([])
  })

  test.each([
    [{ family: 'Inter 18pt' }, 'the family "Inter 18pt" against "Inter"'],
    [{ family: 'inter' }, 'the family "inter" against "Inter"'],
    [{ weight: 700 }, 'the weight 700 against 400'],
    [{ italic: true }, 'an italic against an upright'],
    [{ axes: variable.axes }, 'the axes opsz 14 to 32, wght 100 to 900 against none'],
    [{ version: 'Version 4.000' }, 'the version "Version 4.000" against "Version 4.001"'],
    [{ version: '' }, 'the version "" against "Version 4.001"'],
    [{ glyphs: 950 }, '950 glyphs against 2937']
  ])('a font with %o: %s', (change, message) => {
    expect(compareFonts({ ...regular, ...change }, regular)).toEqual([message])
  })

  test('says what the font is before what the other is, and names every difference', () => {
    expect(compareFonts(regular, { ...regular, italic: true })).toEqual([
      'an upright against an italic'
    ])
    expect(compareFonts(variable, { ...variable, axes: { wght: { min: 300, max: 700 } } })).toEqual(
      ['the axes opsz 14 to 32, wght 100 to 900 against wght 300 to 700']
    )
    expect(
      compareFonts(regular, {
        family: 'Fira Code',
        weight: 700,
        italic: true,
        axes: variable.axes,
        version: 'Version 6.002',
        glyphs: 2030
      })
    ).toEqual([
      'the family "Inter" against "Fira Code"',
      'the weight 400 against 700',
      'an upright against an italic',
      'the axes none against opsz 14 to 32, wght 100 to 900',
      'the version "Version 4.001" against "Version 6.002"',
      '2937 glyphs against 2030'
    ])
  })
})

describe('isOfFormat()', () => {
  test.each([
    ['woff2', 'text.woff2', true],
    ['WOFF2', 'fonts/Text.WOFF2', true],
    ['woff2-variations', 'text.woff2', true],
    ['woff', 'text.woff', true],
    ['truetype', 'text.ttf', true],
    ['opentype', 'text.otf', true],
    // A browser reads the two as one format
    ['opentype', 'text.ttf', true],
    ['truetype', 'text.otf', true],
    ['collection', 'text.ttc', true],
    ['embedded-opentype', 'text.eot', true],
    // A format the lint does not know
    ['future', 'text.woff2', true],
    ['woff', 'text.woff2', false],
    ['woff2', 'text.woff', false],
    ['woff2', 'text.ttf', false],
    ['truetype', 'text.woff2', false],
    ['truetype-variations', 'text.woff2', false],
    ['woff2', 'text', false]
  ])('format("%s") of %s: %s', (format, file, expected) => {
    expect(isOfFormat(format, file)).toBe(expected)
  })
})

describe('lintSource() on fonts', () => {
  const rule = (/** @type {string} */ body) => `@font-face {\n${body}\n}\n`
  const TEXT = rule(
    '  font-family: "Inter";\n  font-weight: 400;\n  src: url("text.woff2") format("woff2");'
  )

  /**
   * Fonts of `inter-ui` with three letters, as TrueType and as WOFF2, written by
   * `beforeAll()`: the package has its fonts as WOFF2 alone.
   */
  const made = /** @type {Record<string, Buffer>} */ ({})

  beforeAll(async () => {
    const inter = (/** @type {string} */ file) => fs.readFileSync(path.join(INTER, file))
    const regular = inter('web/Inter-Regular.woff2')
    const bold = inter('web/Inter-Bold.woff2')
    made['regular.ttf'] = await subsetFont(regular, 'abc', { targetFormat: 'sfnt' })
    made['regular.woff2'] = await subsetFont(regular, 'abc', { targetFormat: 'woff2' })
    made['bold.ttf'] = await subsetFont(bold, 'abc', { targetFormat: 'sfnt' })
    made['bold.woff2'] = await subsetFont(bold, 'abc', { targetFormat: 'woff2' })
    made['more.woff2'] = await subsetFont(regular, 'abcd', { targetFormat: 'woff2' })
  }, 30_000)

  /**
   * A copy of the fixture with real fonts in the `fonts/` folder of an app of a brand.
   * @param {string} root - The copy
   * @param {string} folder - `<brand>/<app>`
   * @param {Record<string, string|Buffer>} files - The files: the name of a stylesheet with
   *   its text, the name of a font with the file of `inter-ui` it is a copy of, or with the
   *   font itself
   */
  function fonts(root, folder, files) {
    const dir = path.join(root, 'source', folder, 'fonts')
    fs.mkdirSync(dir, { recursive: true })
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
      if (/\.s?css$/.test(name) || Buffer.isBuffer(content)) {
        fs.writeFileSync(path.join(dir, name), content)
      } else fs.copyFileSync(path.join(INTER, content), path.join(dir, name))
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
    const root = fonts(copyFixture(), '_default/site', {
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
    const root = fonts(copyFixture(), '_default/site', {
      'text.css': TEXT,
      'text.woff2': 'web/Inter-BoldItalic.woff2'
    })
    expect(problems(root).errors).toEqual([
      {
        file: '_default/site/fonts/text.woff2',
        message: 'is an italic, declared as normal by _default/site/fonts/text.css'
      },
      {
        file: '_default/site/fonts/text.woff2',
        message: 'has the weight 700, declared with 400 by _default/site/fonts/text.css'
      }
    ])
  })

  test('names a font of another family than its rule says', () => {
    const root = fonts(copyFixture(), '_default/site', {
      'text.scss': `// The text font\n${TEXT.replace('"Inter"', '"DM Sans"')}`,
      'text.woff2': 'web/Inter-Regular.woff2'
    })
    expect(problems(root).errors).toEqual([
      {
        file: '_default/site/fonts/text.woff2',
        message: 'is of the family "Inter", declared as "DM Sans" by _default/site/fonts/text.scss'
      }
    ])
  })

  test('names a file that a rule declares and the folder has not, or that is no font', () => {
    const root = fonts(copyFixture(), '_default/site', {
      'display.css': rule(
        '  font-family: "Display";\n  src: url("display.woff2"), url("text.woff");'
      )
    })
    expect(problems(root).errors).toEqual([
      {
        file: '_default/site/fonts/display.css',
        message: 'declares display.woff2, which is not in the fonts folder'
      },
      {
        file: '_default/site/fonts/text.woff',
        message: expect.stringContaining(
          'is declared by _default/site/fonts/display.css and is no font: the file is not a TrueType'
        )
      }
    ])
  })

  test('a rule is checked against the files of its name in another format', () => {
    // The fixture has `text.ttf`, `text.otf` and `text.woff` as lines of text: a file
    // beside the declared one that is no font is not held against the rule
    const root = fonts(copyFixture(), '_default/site', {
      'text.css': TEXT,
      'text.woff2': made['regular.woff2']
    })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })

    fonts(root, '_default/site', { 'text.ttf': made['regular.ttf'] })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })

    // The file an app gets is another weight than the rule of the web file says
    fonts(root, '_default/site', { 'text.ttf': made['bold.ttf'] })
    expect(problems(root).errors).toEqual([
      {
        file: '_default/site/fonts/text.ttf',
        message: 'has the weight 700, declared with 400 by _default/site/fonts/text.css'
      },
      {
        file: '_default/site/fonts/text.woff2',
        message: 'is another font than _default/site/fonts/text.ttf: the weight 400 against 700'
      }
    ])
  })

  test('a rule that declares a format the lint does not read checks the files it reads', () => {
    const root = fonts(copyFixture(), '_default/site', {
      'strong.css': rule('  font-family: "Inter";\n  font-weight: 700;\n  src: url(strong.eot);'),
      'strong.eot': 'web/Inter-Bold.woff2',
      'strong.ttf': made['regular.ttf']
    })
    expect(problems(root).errors).toEqual([
      {
        file: '_default/site/fonts/strong.ttf',
        message: 'has the weight 400, declared with 700 by _default/site/fonts/strong.css'
      }
    ])
  })

  test('names two files of one name that are not one font, with what differs', () => {
    // No rule declares them: the fonts of an app have no stylesheet
    const root = fonts(copyFixture(), '_default/mobile', {
      'strong.ttf': made['regular.ttf'],
      'strong.woff2': 'web/Inter-SemiBoldItalic.woff2',
      'nested/more.ttf': made['regular.ttf'],
      'nested/more.woff2': made['more.woff2'],
      'same.ttf': made['bold.ttf'],
      'same.woff2': made['bold.woff2'],
      // One name in two folders is two names
      'other/same.woff2': made['regular.woff2']
    })
    expect(problems(root)).toEqual({
      errors: [
        {
          file: '_default/mobile/fonts/nested/more.woff2',
          message:
            'is another font than _default/mobile/fonts/nested/more.ttf: 15 glyphs against 12'
        },
        {
          file: '_default/mobile/fonts/strong.woff2',
          message:
            'is another font than _default/mobile/fonts/strong.ttf: the weight 600 against 400, an italic against an upright, 2901 glyphs against 12'
        }
      ],
      warnings: []
    })
  })

  test('a brand that replaces one file of a name is checked with the file it keeps', () => {
    const root = fonts(copyFixture(), '_default/site', {
      'text.css': TEXT,
      'text.woff2': made['regular.woff2'],
      'text.ttf': made['regular.ttf']
    })
    fonts(root, 'alpha/site', { 'text.woff2': made['bold.woff2'] })
    expect(problems(root).errors).toEqual([
      {
        file: 'alpha/site/fonts/text.woff2',
        message: 'has the weight 700, declared with 400 by _default/site/fonts/text.css'
      },
      {
        file: 'alpha/site/fonts/text.woff2',
        message: 'is another font than _default/site/fonts/text.ttf: the weight 700 against 400'
      }
    ])
    // With every file of the name and the stylesheet, the brand has a font of its own
    fonts(root, 'alpha/site', {
      'text.css': TEXT.replace('400', '700'),
      'text.ttf': made['bold.ttf']
    })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })
  })

  test('warns about a format() that is not the format of its file', () => {
    const root = fonts(copyFixture(), '_default/site', {
      'text.css': rule(
        '  font-family: "Inter";\n  src: url("text.woff2") format("truetype"),\n    url(text.ttf) format(opentype),\n    url("https://example.com/far.woff2") format("woff");'
      ),
      'text.woff2': made['regular.woff2'],
      'text.ttf': made['regular.ttf']
    })
    expect(problems(root)).toEqual({
      errors: [],
      warnings: [
        {
          file: '_default/site/fonts/text.css',
          message: 'declares text.woff2 as format("truetype"), which the file is not'
        }
      ]
    })
  })

  test('a brand is checked with the files of the default brand it does not replace', () => {
    // The brand replaces the font and keeps the stylesheet of the default brand
    const root = fonts(copyFixture(), '_default/site', {
      'text.css': TEXT,
      'text.woff2': 'web/Inter-Regular.woff2'
    })
    fonts(root, 'alpha/site', { 'text.woff2': 'web/Inter-Bold.woff2' })
    expect(problems(root).errors).toEqual([
      {
        file: 'alpha/site/fonts/text.woff2',
        message: 'has the weight 700, declared with 400 by _default/site/fonts/text.css'
      }
    ])
    // With a stylesheet of its own, the brand says what its font is
    fonts(root, 'alpha/site', { 'text.css': TEXT.replace('400', '700') })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })
  })

  test('a stylesheet of an app is checked with the fonts of the shared folder', () => {
    // The fonts are shared by the apps of the brand, and each app has its stylesheet
    const root = fonts(copyFixture(), 'alpha/_shared', {
      'text.woff2': 'web/Inter-Bold.woff2'
    })
    fonts(root, 'alpha/site', { 'text.css': TEXT })
    fonts(root, 'alpha/mobile', { 'text.css': TEXT.replace('400', '700') })
    expect(problems(root).errors).toEqual([
      {
        file: 'alpha/_shared/fonts/text.woff2',
        message: 'has the weight 700, declared with 400 by alpha/site/fonts/text.css'
      }
    ])
    // A font of the app wins over the shared one
    fonts(root, 'alpha/site', { 'text.woff2': 'web/Inter-Regular.woff2' })
    expect(problems(root)).toEqual({ errors: [], warnings: [] })
  })

  test('warns about a font of the default brand that a brand gets and does not declare', () => {
    const root = fonts(copyFixture(), '_default/site', {
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
          file: '_default/site/fonts/text-display.woff2',
          message:
            'is in the output of the brand alpha, and no stylesheet of the brand declares its family, "Inter Display"'
        },
        {
          file: '_default/site/fonts/text.woff2',
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
    const root = fonts(copyFixture(), '_default/site', { 'text.css': TEXT })
    fs.writeFileSync(
      path.join(root, 'source/_default/site/fonts/text.woff2'),
      'version https://git-lfs.github.com/spec/v1\noid sha256:0\nsize 1\n'
    )
    // The pointer is the one problem: the rule that declares it is not held against it
    expect(problems(root).errors).toEqual([
      {
        file: '_default/site/fonts/text.woff2',
        message: expect.stringContaining('is a Git LFS pointer')
      }
    ])
    const allowed = lintSource({ cwd: root, allowLfsPointers: true })
    expect(allowed.errors.map((e) => e.file)).not.toContain('_default/site/fonts/text.woff2')
  })

  test('a brand the build does not read is not checked', () => {
    const root = fonts(copyFixture(), 'gamma/site', {
      'text.css': TEXT,
      'text.woff2': 'web/Inter-Bold.woff2'
    })
    expect(problems(root).errors).toEqual([])
  })
})
