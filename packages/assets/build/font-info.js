/**
 * What a font file says of itself: its family, its weight, whether it is italic, the axes of
 * a variable font, its version and the number of its glyphs.
 *
 * The source lint compares these with the `@font-face` rule that declares the file, and with
 * the file of the same name in another format. The functions read TrueType and OpenType
 * fonts, and the same fonts in the WOFF and the WOFF2 container, with Node.js modules only:
 * `zlib` opens both containers.
 *
 * @module font-info
 */

import zlib from 'zlib'

/**
 * What a font file says of itself.
 * @typedef {Object} FontInfo
 * @property {string} family - The family: the typographic family of the `name` table, or
 *   the family where the font has no typographic one. A cut of a family names itself, as
 *   `Inter 18pt`
 * @property {number} weight - The weight class of the `OS/2` table, 400 for a regular font
 * @property {boolean} italic - Whether the font is an italic
 * @property {Record<string, { min: number, max: number }>} axes - The variation axes of the
 *   `fvar` table, by tag. A font that is not variable has none
 * @property {string} version - The version string of the `name` table, as `Version 4.001`,
 *   empty for a font without one
 * @property {number} glyphs - The number of glyphs, of the `maxp` table
 */

/** The formats of a font file that `readFont()` reads, by extension. */
export const READABLE_FORMATS = ['.ttf', '.otf', '.woff', '.woff2']

/** The tables that have a number in place of their tag in a WOFF2 file, in their order. */
const WOFF2_TAGS = [
  'cmap',
  'head',
  'hhea',
  'hmtx',
  'maxp',
  'name',
  'OS/2',
  'post',
  'cvt ',
  'fpgm',
  'glyf',
  'loca',
  'prep',
  'CFF ',
  'VORG',
  'EBDT',
  'EBLC',
  'gasp',
  'hdmx',
  'kern',
  'LTSH',
  'PCLT',
  'VDMX',
  'vhea',
  'vmtx',
  'BASE',
  'GDEF',
  'GPOS',
  'GSUB',
  'EBSC',
  'JSTF',
  'MATH',
  'CBDT',
  'CBLC',
  'COLR',
  'CPAL',
  'SVG ',
  'sbix',
  'acnt',
  'avar',
  'bdat',
  'bloc',
  'bsln',
  'cvar',
  'fdsc',
  'feat',
  'fmtx',
  'fvar',
  'gvar',
  'hsty',
  'just',
  'lcar',
  'mort',
  'morx',
  'opbd',
  'prop',
  'trak',
  'Zapf',
  'Silf',
  'Glat',
  'Gloc',
  'Feat',
  'Sill'
]

/** The first four bytes of a TrueType or OpenType font. */
const SFNT_SIGNATURES = ['\x00\x01\x00\x00', 'OTTO', 'true', 'typ1']

/**
 * The tables of a font, by tag, of the tags that are asked for.
 * @param {Buffer} font - A TrueType or OpenType font, or one in the WOFF or WOFF2 container
 * @param {string[]} tags - The tables to return
 * @returns {Record<string, Buffer>} The tables the font has
 * @throws {Error} When the file is no font of these formats
 */
export function fontTables(font, tags) {
  /** @type {Record<string, Buffer>} */
  const tables = {}
  const signature = font.toString('latin1', 0, 4)

  if (SFNT_SIGNATURES.includes(signature)) {
    const count = font.readUInt16BE(4)
    for (let i = 0; i < count; i++) {
      const record = 12 + i * 16
      const tag = font.toString('latin1', record, record + 4)
      if (!tags.includes(tag)) continue
      const offset = font.readUInt32BE(record + 8)
      tables[tag] = font.subarray(offset, offset + font.readUInt32BE(record + 12))
    }
    return tables
  }

  if (signature === 'wOFF') {
    const count = font.readUInt16BE(12)
    for (let i = 0; i < count; i++) {
      const record = 44 + i * 20
      const tag = font.toString('latin1', record, record + 4)
      if (!tags.includes(tag)) continue
      const offset = font.readUInt32BE(record + 4)
      const compressed = font.readUInt32BE(record + 8)
      const data = font.subarray(offset, offset + compressed)
      // A table that compression does not make smaller is stored as it is
      tables[tag] = compressed < font.readUInt32BE(record + 12) ? zlib.inflateSync(data) : data
    }
    return tables
  }

  if (signature === 'wOF2') {
    if (font.toString('latin1', 4, 8) === 'ttcf') {
      throw new Error('a font collection is not read')
    }
    const count = font.readUInt16BE(12)
    let at = 48
    // A number of 1 to 5 bytes, seven bits in each
    const number = () => {
      let value = 0
      for (let i = 0; i < 5; i++) {
        const byte = font[at++]
        value = value * 128 + (byte & 0x7f)
        if (!(byte & 0x80)) return value
      }
      throw new Error('the table directory is not valid')
    }
    /** @type {Array<{ tag: string, length: number }>} */
    const directory = []
    for (let i = 0; i < count; i++) {
      const flags = font[at++]
      let tag = WOFF2_TAGS[flags & 0x3f]
      if ((flags & 0x3f) === 0x3f) {
        tag = font.toString('latin1', at, at + 4)
        at += 4
      }
      const original = number()
      // The outlines are stored in another form by default, every other table as it is
      const version = flags >> 6
      const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0
      directory.push({ tag, length: transformed ? number() : original })
    }
    const data = zlib.brotliDecompressSync(font.subarray(at, at + font.readUInt32BE(20)))
    let offset = 0
    for (const { tag, length } of directory) {
      if (tags.includes(tag)) tables[tag] = data.subarray(offset, offset + length)
      offset += length
    }
    return tables
  }

  throw new Error('the file is not a TrueType, OpenType, WOFF or WOFF2 font')
}

/**
 * The variation axes of a font, from its `fvar` table.
 * @param {Buffer|undefined} fvar - The table, or nothing for a font without it
 * @returns {Record<string, { min: number, max: number }>}
 */
export function axesOf(fvar) {
  /** @type {Record<string, { min: number, max: number }>} */
  const axes = {}
  if (!fvar) return axes
  const first = fvar.readUInt16BE(4)
  const count = fvar.readUInt16BE(8)
  const size = fvar.readUInt16BE(10)
  for (let axis = 0; axis < count; axis++) {
    const at = first + axis * size
    // The values are 16.16 fixed-point numbers: the minimum, the default, the maximum
    axes[fvar.toString('latin1', at, at + 4)] = {
      min: fvar.readInt32BE(at + 4) / 65536,
      max: fvar.readInt32BE(at + 12) / 65536
    }
  }
  return axes
}

/**
 * The entries of a `name` table that are asked for, by their number: 1 is the family, 5 the
 * version string, 16 the typographic family. The English entry of Windows is read first,
 * then any entry.
 * @param {Buffer} name - The table
 * @param {number[]} ids - The entries to return
 * @returns {Record<number, string>} The entries the table has
 */
function namesOf(name, ids) {
  const count = name.readUInt16BE(2)
  const strings = name.readUInt16BE(4)
  /** @type {Record<number, { text: string, rank: number }>} */
  const found = {}
  for (let i = 0; i < count; i++) {
    const record = 6 + i * 12
    const platform = name.readUInt16BE(record)
    const language = name.readUInt16BE(record + 4)
    const id = name.readUInt16BE(record + 6)
    if (!ids.includes(id)) continue
    const offset = strings + name.readUInt16BE(record + 10)
    const raw = name.subarray(offset, offset + name.readUInt16BE(record + 8))
    // Windows and Unicode entries are UTF-16, big-endian; the others are read as Latin
    const wide = platform === 3 || platform === 0
    const text = wide ? Buffer.from(raw).swap16().toString('utf16le') : raw.toString('latin1')
    const rank = platform === 3 && language === 0x409 ? 0 : wide ? 1 : 2
    if (!found[id] || rank < found[id].rank) found[id] = { text, rank }
  }
  return Object.fromEntries(Object.entries(found).map(([id, { text }]) => [id, text]))
}

/**
 * Read what a font file says of itself.
 * @param {Buffer} font - A TrueType or OpenType font, or one in the WOFF or WOFF2 container
 * @returns {FontInfo}
 * @throws {Error} When the file is no font of these formats, or has no `name` table
 */
export function readFont(font) {
  const tables = fontTables(font, ['name', 'OS/2', 'fvar', 'maxp'])
  if (!tables.name) throw new Error('the font has no name table')
  const os2 = tables['OS/2']
  // The typographic family, or the family where the font has no typographic one
  const names = namesOf(tables.name, [1, 5, 16])
  return {
    family: names[16] ?? names[1] ?? '',
    weight: os2 ? os2.readUInt16BE(4) : 400,
    italic: os2 ? Boolean(os2.readUInt16BE(62) & 1) : false,
    axes: axesOf(tables.fvar),
    version: names[5] ?? '',
    glyphs: tables.maxp ? tables.maxp.readUInt16BE(4) : 0
  }
}
