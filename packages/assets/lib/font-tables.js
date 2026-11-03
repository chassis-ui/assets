/**
 * The tables of a font file that the static fonts of `static-font.js` read and write: the
 * `name` table, every entry of it, the `STAT` table, which names the styles of a variable
 * font, and a font file put together again with some of its tables changed.
 *
 * A TrueType or OpenType file is a list of tables, each named by four letters: `glyf` holds
 * the outlines, `name` the names, `OS/2` and `head` the weight and the style bits. The file
 * starts with a directory of the tables, and each table has a checksum, as has the whole
 * file. `font-info.js` finds a table; this module reads two tables in full, and writes a
 * file again. Node.js modules only.
 *
 * @module font-tables
 */

/**
 * An entry of the `name` table.
 * @typedef {Object} NameRecord
 * @property {number} platform - 0 Unicode, 1 Macintosh, 3 Windows
 * @property {number} encoding - The encoding of the platform: 1 is Unicode on Windows, 0 is
 *   Mac Roman on Macintosh
 * @property {number} language - The language: 0x409 is English on Windows, 0 on Macintosh
 * @property {number} id - What the entry names: 1 the family, 2 the style, 4 the full name,
 *   6 the PostScript name, 16 and 17 the typographic family and style
 * @property {string | null} text - The text, or null for an encoding that is not read
 * @property {Buffer} [raw] - The bytes as the table has them, written again as they are
 *   while the text is not changed
 */

/**
 * The `name` table, as its entries.
 * @typedef {Object} NameTable
 * @property {NameRecord[]} records
 * @property {Buffer[]} languageTags - The language tags of a table of format 1, as their
 *   bytes; none for format 0
 */

/**
 * An axis value of the `STAT` table: the name of a style at a value of an axis, or, for
 * format 4, at the values of several.
 * @typedef {Object} AxisValue
 * @property {number} format - 1, 2, 3 or 4
 * @property {number} flags - 2 marks a name that a style leaves out, as `Regular`
 * @property {number} nameId - The entry of the `name` table that holds the name
 * @property {Array<{ axis: number, value: number }>} values - The axis, by its index in
 *   `axes`, and the value: one for formats 1 to 3, the nominal value for format 2, several
 *   for format 4
 */

/**
 * The `STAT` table.
 * @typedef {Object} StatTable
 * @property {Array<{ tag: string, ordering: number }>} axes - The axes of the design, in
 *   the order of their indexes
 * @property {AxisValue[]} values
 * @property {number} elidedNameId - The name of a style whose every name is left out,
 *   usually `Regular`
 */

/** Mac Roman from 0x80 to 0xFF: the characters of the Macintosh names that are not ASCII. */
const MAC_ROMAN =
  'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü' +
  '†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
  '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ' +
  '‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ'

/**
 * The text of the bytes of an entry, or null for an encoding that is not read.
 * @param {number} platform
 * @param {number} encoding
 * @param {Buffer} raw
 * @returns {string | null}
 */
function decode(platform, encoding, raw) {
  // Unicode and Windows entries are UTF-16, big-endian
  if (platform === 0 || platform === 3) return Buffer.from(raw).swap16().toString('utf16le')
  if (platform === 1 && encoding === 0) {
    return Array.from(raw, (byte) =>
      byte < 0x80 ? String.fromCharCode(byte) : MAC_ROMAN[byte - 0x80]
    ).join('')
  }
  return null
}

/**
 * The bytes of a text for an entry, or null when the encoding of the entry cannot hold it.
 * @param {number} platform
 * @param {number} encoding
 * @param {string} text
 * @returns {Buffer | null}
 */
function encode(platform, encoding, text) {
  if (platform === 0 || platform === 3) return Buffer.from(text, 'utf16le').swap16()
  if (platform === 1 && encoding === 0) {
    const bytes = []
    for (const character of text) {
      const code = character.codePointAt(0) ?? 0
      const roman = MAC_ROMAN.indexOf(character)
      if (code < 0x80) bytes.push(code)
      else if (roman >= 0) bytes.push(0x80 + roman)
      else return null
    }
    return Buffer.from(bytes)
  }
  return null
}

/**
 * Read every entry of a `name` table.
 * @param {Buffer} table
 * @returns {NameTable}
 */
export function readNames(table) {
  const format = table.readUInt16BE(0)
  const count = table.readUInt16BE(2)
  const strings = table.readUInt16BE(4)
  /** @type {NameRecord[]} */
  const records = []
  for (let i = 0; i < count; i++) {
    const at = 6 + i * 12
    const platform = table.readUInt16BE(at)
    const encoding = table.readUInt16BE(at + 2)
    const offset = strings + table.readUInt16BE(at + 10)
    const raw = Buffer.from(table.subarray(offset, offset + table.readUInt16BE(at + 8)))
    records.push({
      platform,
      encoding,
      language: table.readUInt16BE(at + 4),
      id: table.readUInt16BE(at + 6),
      text: decode(platform, encoding, raw),
      raw
    })
  }
  /** @type {Buffer[]} */
  const languageTags = []
  if (format === 1) {
    const at = 6 + count * 12
    for (let i = 0; i < table.readUInt16BE(at); i++) {
      const tag = at + 2 + i * 4
      const offset = strings + table.readUInt16BE(tag + 2)
      languageTags.push(Buffer.from(table.subarray(offset, offset + table.readUInt16BE(tag))))
    }
  }
  return { records, languageTags }
}

/**
 * Write a `name` table: format 0, or 1 with the language tags, the entries sorted by
 * platform, encoding, language and name as the format asks. An entry whose text its
 * encoding cannot hold is left out, as a Macintosh name with a character that Mac Roman
 * has not.
 * @param {NameTable} names
 * @returns {Buffer}
 */
export function writeNames({ records, languageTags }) {
  const kept = records
    .map((record) => {
      const unchanged =
        record.raw && decode(record.platform, record.encoding, record.raw) === record.text
      const bytes = unchanged
        ? record.raw
        : record.text === null
          ? null
          : encode(record.platform, record.encoding, record.text)
      return bytes ? { ...record, bytes } : null
    })
    .filter((record) => record !== null)
    .sort(
      (a, b) =>
        a.platform - b.platform || a.encoding - b.encoding || a.language - b.language || a.id - b.id
    )

  const format = languageTags.length > 0 ? 1 : 0
  const header = 6 + kept.length * 12 + (format === 1 ? 2 + languageTags.length * 4 : 0)
  const head = Buffer.alloc(header)
  head.writeUInt16BE(format, 0)
  head.writeUInt16BE(kept.length, 2)
  head.writeUInt16BE(header, 4)

  /** @type {Buffer[]} */
  const strings = []
  let offset = 0
  kept.forEach((record, i) => {
    const at = 6 + i * 12
    head.writeUInt16BE(record.platform, at)
    head.writeUInt16BE(record.encoding, at + 2)
    head.writeUInt16BE(record.language, at + 4)
    head.writeUInt16BE(record.id, at + 6)
    head.writeUInt16BE(record.bytes.length, at + 8)
    head.writeUInt16BE(offset, at + 10)
    strings.push(record.bytes)
    offset += record.bytes.length
  })
  if (format === 1) {
    const at = 6 + kept.length * 12
    head.writeUInt16BE(languageTags.length, at)
    languageTags.forEach((tag, i) => {
      head.writeUInt16BE(tag.length, at + 2 + i * 4)
      head.writeUInt16BE(offset, at + 4 + i * 4)
      strings.push(tag)
      offset += tag.length
    })
  }
  return Buffer.concat([head, ...strings])
}

/**
 * A 16.16 fixed-point number of a table.
 * @param {Buffer} table
 * @param {number} at
 * @returns {number}
 */
function fixed(table, at) {
  return table.readInt32BE(at) / 65536
}

/**
 * Read a `STAT` table.
 * @param {Buffer} table
 * @returns {StatTable}
 */
export function readStat(table) {
  const minor = table.readUInt16BE(2)
  const axisSize = table.readUInt16BE(4)
  const axisCount = table.readUInt16BE(6)
  const axesAt = table.readUInt32BE(8)
  const valueCount = table.readUInt16BE(12)
  const offsetsAt = table.readUInt32BE(14)

  const axes = Array.from({ length: axisCount }, (_, i) => {
    const at = axesAt + i * axisSize
    return { tag: table.toString('latin1', at, at + 4), ordering: table.readUInt16BE(at + 6) }
  })

  /** @type {AxisValue[]} */
  const values = []
  for (let i = 0; i < valueCount; i++) {
    const at = offsetsAt + table.readUInt16BE(offsetsAt + i * 2)
    const format = table.readUInt16BE(at)
    if (format === 4) {
      const count = table.readUInt16BE(at + 2)
      values.push({
        format,
        flags: table.readUInt16BE(at + 4),
        nameId: table.readUInt16BE(at + 6),
        values: Array.from({ length: count }, (_, j) => ({
          axis: table.readUInt16BE(at + 8 + j * 6),
          value: fixed(table, at + 10 + j * 6)
        }))
      })
    } else if (format >= 1 && format <= 3) {
      values.push({
        format,
        flags: table.readUInt16BE(at + 4),
        nameId: table.readUInt16BE(at + 6),
        // The value, or the nominal value of a range for format 2
        values: [{ axis: table.readUInt16BE(at + 2), value: fixed(table, at + 8) }]
      })
    }
  }

  // A table of version 1.0 has no fallback name; the name of a regular style is 2
  return { axes, values, elidedNameId: minor >= 1 ? table.readUInt16BE(18) : 2 }
}

/**
 * The checksum of a table: the sum of its 32-bit numbers, the last one padded with zeros.
 * @param {Buffer} data
 * @returns {number}
 */
function checksum(data) {
  const padded =
    data.length % 4 === 0 ? data : Buffer.concat([data, Buffer.alloc(4 - (data.length % 4))])
  let sum = 0
  for (let at = 0; at < padded.length; at += 4) sum = (sum + padded.readUInt32BE(at)) >>> 0
  return sum
}

/**
 * Write a TrueType or OpenType font again with some of its tables changed: the directory,
 * each table at a multiple of four bytes, the checksum of each table and the one of the
 * whole file in the `head` table.
 * @param {Buffer} font - A TrueType or OpenType font, not one in a WOFF container
 * @param {Record<string, Buffer>} changed - The tables to write in place of the font's own,
 *   by tag. A table the font has not is added
 * @returns {Buffer}
 */
export function replaceTables(font, changed) {
  const count = font.readUInt16BE(4)
  /** @type {Map<string, Buffer>} */
  const tables = new Map()
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16
    const offset = font.readUInt32BE(at + 8)
    tables.set(
      font.toString('latin1', at, at + 4),
      font.subarray(offset, offset + font.readUInt32BE(at + 12))
    )
  }
  for (const [tag, data] of Object.entries(changed)) tables.set(tag, data)

  // The checksum of the file is computed with the adjustment of `head` at zero
  const head = tables.get('head')
  if (head) {
    const copy = Buffer.from(head)
    copy.writeUInt32BE(0, 8)
    tables.set('head', copy)
  }

  const tags = [...tables.keys()].sort()
  const power = 2 ** Math.floor(Math.log2(tags.length))
  const header = Buffer.alloc(12 + tags.length * 16)
  font.copy(header, 0, 0, 4)
  header.writeUInt16BE(tags.length, 4)
  header.writeUInt16BE(power * 16, 6)
  header.writeUInt16BE(Math.log2(power), 8)
  header.writeUInt16BE(tags.length * 16 - power * 16, 10)

  /** @type {Buffer[]} */
  const parts = [header]
  let offset = header.length
  tags.forEach((tag, i) => {
    const data = /** @type {Buffer} */ (tables.get(tag))
    const at = 12 + i * 16
    header.write(tag, at, 'latin1')
    header.writeUInt32BE(checksum(data), at + 4)
    header.writeUInt32BE(offset, at + 8)
    header.writeUInt32BE(data.length, at + 12)
    const padding = (4 - (data.length % 4)) % 4
    parts.push(data, Buffer.alloc(padding))
    offset += data.length + padding
  })

  const file = Buffer.concat(parts)
  if (head) {
    const at = file.readUInt32BE(12 + tags.indexOf('head') * 16 + 8)
    file.writeUInt32BE((0xb1b0afba - checksum(file)) >>> 0, at + 8)
  }
  return file
}

/**
 * The axes of a variable font, from its `fvar` table, in the order of the table.
 * @param {Buffer} table
 * @returns {Array<{ tag: string, min: number, default: number, max: number }>}
 */
export function readAxes(table) {
  const first = table.readUInt16BE(4)
  const size = table.readUInt16BE(10)
  return Array.from({ length: table.readUInt16BE(8) }, (_, i) => {
    const at = first + i * size
    return {
      tag: table.toString('latin1', at, at + 4),
      min: fixed(table, at + 4),
      default: fixed(table, at + 8),
      max: fixed(table, at + 12)
    }
  })
}

/**
 * The entries of the `name` table that the features of a `GSUB` or `GPOS` table refer to:
 * the names of the stylistic sets, `ss01` to `ss20`, of the character variants, `cv01` to
 * `cv99`, with their tooltips, samples and parameters, and of the optical size of `size`.
 * An app shows them in its menu of the features of a font.
 * @param {Buffer} table
 * @returns {number[]}
 */
export function layoutNameIds(table) {
  const list = table.readUInt16BE(6)
  /** @type {Set<number>} */
  const ids = new Set()
  for (let i = 0; i < table.readUInt16BE(list); i++) {
    const record = list + 2 + i * 6
    const tag = table.toString('latin1', record, record + 4)
    const feature = list + table.readUInt16BE(record + 4)
    const offset = table.readUInt16BE(feature)
    if (offset === 0) continue
    const params = feature + offset
    if (/^ss\d\d$/.test(tag)) {
      ids.add(table.readUInt16BE(params + 2))
    } else if (/^cv\d\d$/.test(tag)) {
      for (let at = 2; at <= 6; at += 2) ids.add(table.readUInt16BE(params + at))
      const first = table.readUInt16BE(params + 10)
      for (let n = 0; n < table.readUInt16BE(params + 8); n++) ids.add(first + n)
    } else if (tag === 'size') {
      ids.add(table.readUInt16BE(params + 4))
    }
  }
  ids.delete(0)
  return [...ids].sort((a, b) => a - b)
}
