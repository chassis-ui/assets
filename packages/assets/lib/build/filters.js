/**
 * The file filters of a build: `--type` and `--include`.
 *
 * A build with a filter reads only the files of an app that match, so a consumer that uses
 * a part of the output fetches and copies that part only. The paths are those of `source/`,
 * relative to the folder of the app, with forward slashes: `images/home/hero@2x.png`.
 *
 * @module filters
 */

/** @param {string} text */
const quote = (text) => text.replace(/[$()*+\-.?[\\\]^{|}]/g, '\\$&')

/**
 * Compile a pattern of `--include`. `*` is any run of characters inside one folder or name,
 * `**` is any run of folders, and `{a,b}` is one of its alternatives, as in the patterns of
 * the contracts. A pattern whose last name has no `*` also matches every file under the
 * folder it names.
 * @param {string} pattern
 * @returns {RegExp}
 * @example
 * compileInclude('images/home/*.svg').test('images/home/logo.svg') // true
 * compileInclude('images/home').test('images/home/dark/logo.svg') // true
 * compileInclude('images/*').test('images/home/logo.svg') // false
 */
export function compileInclude(pattern) {
  const trimmed = pattern.replace(/^\.?\/+/, '').replace(/\/+$/, '')
  let source = ''
  for (const token of trimmed.split(/(\*\*\/?|\*|\{[^{}]*\})/).filter(Boolean)) {
    if (token === '**/') {
      source += '(?:.*/)?'
    } else if (token === '**') {
      source += '.*'
    } else if (token === '*') {
      source += '[^/]*'
    } else if (token.startsWith('{')) {
      source += `(?:${token.slice(1, -1).split(',').map(quote).join('|')})`
    } else {
      source += quote(token)
    }
  }
  const namesFolder = !trimmed.slice(trimmed.lastIndexOf('/') + 1).includes('*')
  return new RegExp(`^${source}${namesFolder ? '(?:/.*)?' : ''}$`)
}

/**
 * The filter of a run.
 * @param {{ types?: string[], include?: string[] }} [filters] - The type folders of
 *   `--type` and the patterns of `--include`. A file has to pass both
 * @returns {{ active: boolean, type: (type: string) => boolean, file: (relative: string) => boolean }}
 *   Whether a filter is given, whether a type folder is read, and whether a file is, by its
 *   path relative to the folder of the app
 */
export function createFileFilter(filters = {}) {
  const types = filters.types ?? []
  const include = (filters.include ?? []).map(compileInclude)
  /** @param {string} name */
  const type = (name) => types.length === 0 || types.includes(name)
  return {
    active: types.length > 0 || include.length > 0,
    type,
    file: (relative) =>
      type(relative.split('/')[0]) &&
      (include.length === 0 || include.some((regex) => regex.test(relative)))
  }
}

/**
 * The shortest list of paths that names the selected files and no other: a folder whose
 * files are all selected is named once, as `<folder>/**`, and a file of any other folder by
 * its path.
 * @param {string[]} all - Every file, as paths with forward slashes
 * @param {Set<string>} selected - The files to name
 * @returns {string[]} Sorted
 * @example
 * coverPaths(['a/x.png', 'a/y.png', 'b/z.png', 'b/w.png'], new Set(['a/x.png', 'a/y.png', 'b/z.png']))
 * // Returns: ['a/**', 'b/z.png']
 */
export function coverPaths(all, selected) {
  /** @type {Map<string, { total: number, selected: number }>} */
  const folders = new Map()
  for (const file of all) {
    const parts = file.split('/')
    for (let depth = 1; depth < parts.length; depth++) {
      const folder = parts.slice(0, depth).join('/')
      const count = folders.get(folder) ?? { total: 0, selected: 0 }
      count.total++
      if (selected.has(file)) count.selected++
      folders.set(folder, count)
    }
  }

  /** @type {Set<string>} */
  const cover = new Set()
  for (const file of all) {
    if (!selected.has(file)) continue
    const parts = file.split('/')
    // The highest folder that is selected whole, or the file
    let name = file
    for (let depth = 1; depth < parts.length; depth++) {
      const folder = parts.slice(0, depth).join('/')
      const count = /** @type {{ total: number, selected: number }} */ (folders.get(folder))
      if (count.total === count.selected) {
        name = `${folder}/**`
        break
      }
    }
    cover.add(name)
  }
  return [...cover].sort()
}
