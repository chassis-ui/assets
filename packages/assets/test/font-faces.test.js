/**
 * @file font-faces.test.js
 * @description The `@font-face` rules of a stylesheet: finding them, and writing a rule once
 *              per range, which `split` of `chassis.subset` does with the stylesheets of a
 *              fonts folder. The functions are pure, and the stylesheets here are text.
 */

import { describe, expect, test } from 'vitest'
import { findFontFaces, splitFontFaces } from '../build/font-faces.js'

const SHEET = `/* Text, the "text" family. */

@font-face {
  font-family: "Text";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("text.woff2") format("woff2");
}

@font-face {
  font-family: "Text";
  font-style: italic;
  font-weight: 100 900;
  font-display: swap;
  src: url("text-italic.woff2") format("woff2");
}
`

/** The `url()` values of the rules of a stylesheet, rule by rule. */
const urls = (/** @type {string} */ css, options = {}) =>
  findFontFaces(css, options).map((rule) => rule.urls.map((url) => url.value))

/** Two ranges, as `split` gives them: the file name gets the name of the range. */
const ranges = [
  { name: 'latin-ext', unicodeRange: 'U+0100-02BA' },
  { name: 'latin', unicodeRange: 'U+0000-00FF, U+0131' }
].map(({ name, unicodeRange }) => ({
  rename: (/** @type {string} */ url) => url.replace(/(\.[^.]+)$/, `-${name}$1`),
  unicodeRange
}))

describe('findFontFaces()', () => {
  test('finds the rules in their order, with the files of their src', () => {
    const rules = findFontFaces(SHEET)
    expect(rules.map((rule) => rule.urls.map((url) => url.value))).toEqual([
      ['text.woff2'],
      ['text-italic.woff2']
    ])
    expect(SHEET.slice(rules[0].start, rules[0].start + 10)).toBe('@font-face')
    expect(SHEET[rules[0].open]).toBe('{')
    expect(SHEET[rules[0].end - 1]).toBe('}')
    expect(rules.every((rule) => !rule.ranged && rule.closed)).toBe(true)
  })

  test('says where a url value is, whatever its quotes', () => {
    const css = `@font-face { src: url(a.woff2), url( 'b.woff' ) format('woff'), url("c d.woff"); }`
    const [rule] = findFontFaces(css)
    expect(rule.urls.map((url) => url.value)).toEqual(['a.woff2', 'b.woff', 'c d.woff'])
    for (const url of rule.urls) expect(css.slice(url.start, url.end)).toBe(url.value)
  })

  test('reads every src of a rule, and no other declaration', () => {
    const css = `@font-face { font-family: "url(no.woff2)"; src: url(old.woff); src: local("Text"), url(new.woff2) format("woff2"); }`
    expect(urls(css)).toEqual([['old.woff', 'new.woff2']])
  })

  test('gives the declarations of a rule by name, without comments', () => {
    const css = `@font-face {
  Font-Family: "Text"; /* the family */
  font-weight: /* light to bold */ 300 700;
  font-style: italic;
  font-style: normal;
  src: url(a.woff2) format("woff2")
}`
    expect(findFontFaces(css)[0].descriptors).toEqual({
      'font-family': '"Text"',
      'font-weight': '300 700',
      'font-style': 'normal',
      src: 'url(a.woff2) format("woff2")'
    })
    expect(findFontFaces('@font-face {}')[0].descriptors).toEqual({})
  })

  test('says whether a rule has a unicode-range of its own', () => {
    const css = `@font-face { src: url(a.woff2); UNICODE-RANGE: U+0041 } @font-face { src: url(b.woff2) }`
    expect(findFontFaces(css).map((rule) => rule.ranged)).toEqual([true, false])
  })

  test('says whether the last declaration ends with a semicolon', () => {
    const closed = (/** @type {string} */ css) => findFontFaces(css)[0].closed
    expect(closed('@font-face { src: url(a.woff2); }')).toBe(true)
    expect(closed('@font-face { src: url(a.woff2) }')).toBe(false)
    expect(closed('@font-face { src: url(a.woff2); /* the end */ }')).toBe(true)
    expect(closed('@font-face { src: url(a.woff2) /* the end */ }')).toBe(false)
    expect(closed('@font-face { font-family: "Text" }')).toBe(false)
    expect(closed('@font-face {}')).toBe(true)
  })

  test('a comment or a string is no rule, and no declaration', () => {
    const css = `/* @font-face { src: url(comment.woff2) } */
a::before { content: "@font-face { src: url(string.woff2) }"; }
@font-face { /* src: url(inside.woff2); note: this */ src: url(real.woff2); }`
    expect(urls(css)).toEqual([['real.woff2']])
  })

  test('finds a rule inside another rule, in any case, without spaces', () => {
    const css = `@media print { @FONT-FACE{font-family:X;src:url(a.woff2)} } @supports (x: y) { @font-face { src: url(b.woff2); } }`
    expect(urls(css)).toEqual([['a.woff2'], ['b.woff2']])
  })

  test('another at-rule is not one, nor is a rule that never closes', () => {
    expect(urls('@font-face-not { src: url(a.woff2) }')).toEqual([])
    expect(urls('@font-feature-values Text { @styleset { a: 1 } }')).toEqual([])
    expect(urls('@font-face { src: url(a.woff2);')).toEqual([])
    expect(urls('@font-face; @font-face { src: url(b.woff2) }')).toEqual([['b.woff2']])
  })

  test('a line comment is one in SCSS only, and never inside an address', () => {
    const css = `// @font-face { src: url(comment.woff2) }
@font-face {
  // src: url(inside.woff2);
  src: url(//host/real.woff2); // the font
}`
    expect(urls(css, { scss: true })).toEqual([['//host/real.woff2']])
    expect(urls(css)).toEqual([['comment.woff2'], ['//host/real.woff2']])
  })

  test('a stylesheet without a rule has none', () => {
    expect(findFontFaces('')).toEqual([])
    expect(findFontFaces('body { font-family: "Text"; }')).toEqual([])
  })
})

describe('splitFontFaces()', () => {
  test('writes a rule once per range, with its files and its unicode-range', () => {
    const css = splitFontFaces(SHEET, (rule) =>
      rule.urls[0].value === 'text.woff2' ? ranges : null
    )
    expect(css).toBe(`/* Text, the "text" family. */

@font-face {
  font-family: "Text";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("text-latin-ext.woff2") format("woff2");
  unicode-range: U+0100-02BA;
}

@font-face {
  font-family: "Text";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("text-latin.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+0131;
}

@font-face {
  font-family: "Text";
  font-style: italic;
  font-weight: 100 900;
  font-display: swap;
  src: url("text-italic.woff2") format("woff2");
}
`)
  })

  test('every descriptor of a rule is in each of its rules', () => {
    const css = splitFontFaces(SHEET, () => ranges)
    const rules = findFontFaces(css)
    expect(rules).toHaveLength(4)
    expect(rules.every((rule) => rule.ranged)).toBe(true)
    for (const descriptor of [
      'font-family: "Text";',
      'font-weight: 100 900;',
      'font-display: swap;'
    ]) {
      expect(css.split(descriptor)).toHaveLength(5)
    }
    expect(css.split('font-style: normal;')).toHaveLength(3)
    expect(css.split('font-style: italic;')).toHaveLength(3)
  })

  test('the same text comes back when no rule is split', () => {
    expect(splitFontFaces(SHEET, () => null)).toBe(SHEET)
    expect(splitFontFaces(SHEET, () => [])).toBe(SHEET)
    expect(splitFontFaces('body { margin: 0 }', () => ranges)).toBe('body { margin: 0 }')
  })

  test('renames every file of a src, and keeps what is no file', () => {
    const css = `@font-face { src: local("Text"), url(a.woff2) format("woff2"), url('fonts/a.woff') format("woff"); }`
    expect(splitFontFaces(css, () => [ranges[1]])).toBe(
      `@font-face { src: local("Text"), url(a-latin.woff2) format("woff2"), url('fonts/a-latin.woff') format("woff"); unicode-range: U+0000-00FF, U+0131; }`
    )
  })

  test('a rule in one line stays in one line, and its rules are a line each', () => {
    const css = `a { b: c }\n@font-face { src: url(a.woff2) }\nd { e: f }`
    expect(splitFontFaces(css, () => ranges)).toBe(
      `a { b: c }\n@font-face { src: url(a-latin-ext.woff2); unicode-range: U+0100-02BA; }\n@font-face { src: url(a-latin.woff2); unicode-range: U+0000-00FF, U+0131; }\nd { e: f }`
    )
  })

  test('a last declaration without a semicolon gets one', () => {
    const css = `@font-face {\n\tfont-family: X;\n\tsrc: url(a.woff2) /* the font */\n}`
    expect(splitFontFaces(css, () => [ranges[1]])).toBe(
      `@font-face {\n\tfont-family: X;\n\tsrc: url(a-latin.woff2) /* the font */;\n\tunicode-range: U+0000-00FF, U+0131;\n}`
    )
  })

  test('the range is written in the indentation of the first declaration', () => {
    const css = `@font-face {\n    font-family: X;\n    src: url(a.woff2) format("woff2"),\n         url(a.woff) format("woff");\n}`
    expect(splitFontFaces(css, () => [ranges[1]])).toBe(
      `@font-face {\n    font-family: X;\n    src: url(a-latin.woff2) format("woff2"),\n         url(a-latin.woff) format("woff");\n    unicode-range: U+0000-00FF, U+0131;\n}`
    )
  })

  test('a rule inside another rule is split where it is', () => {
    const css = `@media screen { @font-face { src: url(a.woff2); } }`
    expect(splitFontFaces(css, () => [ranges[1]])).toBe(
      `@media screen { @font-face { src: url(a-latin.woff2); unicode-range: U+0000-00FF, U+0131; } }`
    )
  })

  test('gives the rule to the function, which may leave a rule with a range', () => {
    const css = `@font-face { src: url(a.woff2); unicode-range: U+0041; }\n@font-face { src: url(b.woff2); }`
    const out = splitFontFaces(css, (rule) => (rule.ranged ? null : [ranges[1]]))
    expect(out).toContain('src: url(a.woff2); unicode-range: U+0041;')
    expect(out).toContain('src: url(b-latin.woff2); unicode-range: U+0000-00FF, U+0131;')
  })

  test('reads SCSS with its line comments', () => {
    const css = `// The fonts\n@font-face {\n  src: url("a.woff2"); // the font\n}\n`
    expect(splitFontFaces(css, () => [ranges[1]], { scss: true })).toBe(
      `// The fonts\n@font-face {\n  src: url("a-latin.woff2"); // the font\n  unicode-range: U+0000-00FF, U+0131;\n}\n`
    )
  })
})
