/**
 * The `@font-face` rules of a stylesheet: where they are, which files their `src` names, and
 * a stylesheet with a rule written once per range of characters.
 *
 * `split` of `chassis.subset` writes a font once per range, and a browser downloads a range
 * only when a page has a character of it: that takes a rule per file, each with the
 * `unicode-range` of its file. The functions here are pure. They read CSS and SCSS as text,
 * and change nothing but the rules they are told to split.
 *
 * @module font-faces
 */

/**
 * A `@font-face` rule of a stylesheet.
 * @typedef {Object} FontFaceRule
 * @property {number} start - Where the rule starts in the stylesheet, at its `@`
 * @property {number} end - Where it ends, after its `}`
 * @property {number} open - Where its `{` is
 * @property {Array<{ value: string, start: number, end: number, format?: string }>} urls - The
 *   `url()` values of its `src`, as they are written, with where each is in the stylesheet,
 *   and the `format()` after it, in lowercase, where it has one
 * @property {boolean} ranged - Whether the rule has a `unicode-range` of its own
 * @property {Record<string, string>} descriptors - The declarations of the rule, by name in
 *   lowercase, each with its value as it is written, without comments: `font-family`,
 *   `font-weight`. The last of a name that is there twice
 * @property {boolean} closed - Whether its last declaration ends with a semicolon
 */

/**
 * One rule that takes the place of a `@font-face` rule: the file names of a range, and the
 * characters of the range.
 * @typedef {Object} RangeRule
 * @property {(url: string) => string} rename - The `url()` value of the range, of the value
 *   as it is written in the rule
 * @property {string} unicodeRange - The value of `unicode-range`, such as `U+0000-00FF`
 */

const AT_RULE = /^@font-face(?![\w-])/i

/**
 * Where a comment or a string that starts at `at` ends, or `at` where neither starts.
 * @param {string} css
 * @param {number} at
 * @param {{ scss: boolean, depth: number }} state - With `scss`, a `//` outside parentheses
 *   starts a comment; inside them it is a part of an address
 * @returns {number}
 */
function skip(css, at, state) {
  if (css.startsWith('/*', at)) {
    const end = css.indexOf('*/', at + 2)
    return end === -1 ? css.length : end + 2
  }
  if (state.scss && state.depth === 0 && css.startsWith('//', at)) {
    const end = css.indexOf('\n', at)
    return end === -1 ? css.length : end
  }
  const quote = css[at]
  if (quote === '"' || quote === "'") {
    for (let i = at + 1; i < css.length; i++) {
      if (css[i] === '\\') i++
      else if (css[i] === quote || css[i] === '\n') return i + 1
    }
    return css.length
  }
  return at
}

/**
 * Where the colon after the name of a declaration is, or -1 for a text without one. A colon
 * in a comment is not one.
 * @param {string} css
 * @param {number} from
 * @param {number} to
 * @param {boolean} scss
 * @returns {number}
 */
function colonOf(css, from, to, scss) {
  const state = { scss, depth: 0 }
  for (let i = from; i < to; i++) {
    const next = skip(css, i, state)
    if (next !== i) i = next - 1
    else if (css[i] === ':') return i
  }
  return -1
}

/**
 * The `url()` values of a declaration value, each with the `format()` that follows it.
 * @param {string} css
 * @param {number} from
 * @param {number} to
 * @returns {Array<{ value: string, start: number, end: number, format?: string }>}
 */
function urlsOf(css, from, to) {
  const urls = []
  const pattern =
    /url\(\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^)\s"']*))\s*\)(?:\s*format\(\s*["']?([\w-]+)["']?\s*\))?/gi
  const text = css.slice(from, to)
  for (const match of text.matchAll(pattern)) {
    const value = match[1] ?? match[2] ?? match[3]
    const start = from + match.index + match[0].indexOf(value, 4)
    urls.push({ value, start, end: start + value.length, format: match[4]?.toLowerCase() })
  }
  return urls
}

/**
 * Find the `@font-face` rules of a stylesheet, in their order. A rule inside another rule,
 * such as `@media`, is found too. Comments and strings are not read as rules.
 * @param {string} css - The stylesheet
 * @param {{ scss?: boolean }} [options] - `scss` for a stylesheet with `//` comments
 * @returns {FontFaceRule[]}
 */
export function findFontFaces(css, { scss = false } = {}) {
  /** @type {FontFaceRule[]} */
  const rules = []
  const state = { scss, depth: 0 }

  for (let at = 0; at < css.length; at++) {
    const after = skip(css, at, state)
    if (after !== at) {
      at = after - 1
      continue
    }
    if (css[at] !== '@' || !AT_RULE.test(css.slice(at, at + 11))) continue

    // The block of the rule, from its `{` to the `}` that closes it
    let open = -1
    let end = -1
    let depth = 0
    const inner = { scss, depth: 0 }
    /** @type {Array<{ name: string, from: number, to: number }>} */
    const declarations = []
    let from = -1
    let last = ''
    for (let i = at + 10; i < css.length; i++) {
      const next = skip(css, i, inner)
      if (next !== i) {
        if (css[i] === '"' || css[i] === "'") last = css[i]
        i = next - 1
        continue
      }
      const char = css[i]
      if (open === -1) {
        if (char === '{') {
          open = i
          from = i + 1
        } else if (char === ';' || char === '}') break
        continue
      }
      if (char === '(') inner.depth++
      else if (char === ')') inner.depth = Math.max(0, inner.depth - 1)
      else if (char === '{') depth++
      else if (char === '}' && depth > 0) depth--

      const closes = char === '}' && depth === 0 && inner.depth === 0
      if ((char === ';' && depth === 0 && inner.depth === 0) || closes) {
        const colon = colonOf(css, from, i, scss)
        if (colon !== -1) {
          const name = css
            .slice(from, colon)
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(scss ? /\/\/[^\n]*/g : /^$/, '')
            .trim()
            .toLowerCase()
          declarations.push({ name, from: colon + 1, to: i })
        }
        from = i + 1
      }
      if (closes) {
        end = i + 1
        break
      }
      if (!/\s/.test(char)) last = char
    }
    if (end === -1) continue

    rules.push({
      start: at,
      end,
      open,
      urls: declarations
        .filter((declaration) => declaration.name === 'src')
        .flatMap((declaration) => urlsOf(css, declaration.from, declaration.to)),
      ranged: declarations.some((declaration) => declaration.name === 'unicode-range'),
      descriptors: Object.fromEntries(
        declarations.map(({ name, from, to }) => [
          name,
          css
            .slice(from, to)
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim()
        ])
      ),
      closed: last === ';' || last === '{' || last === ''
    })
    at = end - 1
  }
  return rules
}

/**
 * One rule of a range: the rule as it is written, with the `url()` values of the range and
 * a `unicode-range` after its last declaration, in the indentation of its first one.
 * @param {string} css
 * @param {FontFaceRule} rule
 * @param {RangeRule} range
 * @returns {string}
 */
function ruleOf(css, rule, range) {
  let text = ''
  let at = rule.start
  for (const url of rule.urls) {
    text += css.slice(at, url.start) + range.rename(url.value)
    at = url.end
  }
  text += css.slice(at, rule.end - 1)

  const body = text.trimEnd()
  const tail = text.slice(body.length)
  const indent = /^[^\S\n]*\n([ \t]*)\S/.exec(text.slice(rule.open - rule.start + 1))
  const before = indent ? `\n${indent[1]}` : ' '
  const semicolon = rule.closed ? '' : ';'
  return `${body}${semicolon}${before}unicode-range: ${range.unicodeRange};${tail}}`
}

/**
 * Write a stylesheet again with some of its `@font-face` rules once per range. A rule that
 * `split` gives no ranges for stays as it is, and so does everything between the rules.
 * @param {string} css - The stylesheet
 * @param {(rule: FontFaceRule) => RangeRule[]|null} split - The ranges of a rule, in the
 *   order their rules are written, or null to leave the rule
 * @param {{ scss?: boolean }} [options] - `scss` for a stylesheet with `//` comments
 * @returns {string} The stylesheet, the same text when no rule is split
 */
export function splitFontFaces(css, split, options = {}) {
  let out = ''
  let at = 0
  for (const rule of findFontFaces(css, options)) {
    const ranges = split(rule)
    if (!ranges || ranges.length === 0) continue
    const between = css.slice(rule.start, rule.end).includes('\n') ? '\n\n' : '\n'
    out += css.slice(at, rule.start)
    out += ranges.map((range) => ruleOf(css, rule, range)).join(between)
    at = rule.end
  }
  return out + css.slice(at)
}
