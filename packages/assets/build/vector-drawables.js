/**
 * Vector drawables: the conversion that `--vector-drawables` turns on.
 *
 * The one module of the build that uses a package, and it loads it when the option is
 * given, never at import time: the default build needs nothing installed.
 *
 * @module vector-drawables
 */

import fs from 'fs'
import path from 'path'

/** @import { Conversion } from './types.js' */

/** The package that converts an SVG to a vector drawable. */
export const CONVERTER_PACKAGE = 'svg2vectordrawable'

/**
 * The options of the conversion, those of `chassis-tokens` for its icons. A vector path
 * without a fill color draws nothing, so a path without one is filled black, which a tint
 * replaces as `currentcolor` does on the web. Coordinates keep three decimals.
 */
export const CONVERTER_OPTIONS = { fillBlack: true, floatPrecision: 3 }

/**
 * Load the converter.
 * @returns {Promise<(svg: string) => Promise<string>>} A function from the text of an SVG to
 *   the XML of its vector drawable
 * @throws {Error} When the package is not installed
 */
export async function loadConverter() {
  let convert
  try {
    convert = (await import(CONVERTER_PACKAGE)).default
  } catch (error) {
    throw new Error(
      `--vector-drawables needs the package ${CONVERTER_PACKAGE}, which is not installed. Run \`pnpm install\` in the repository root.`,
      { cause: error }
    )
  }
  return (svg) => convert(svg, CONVERTER_OPTIONS)
}

/**
 * Whether the XML is a vector drawable that draws something. The converter gives an empty
 * text for a file that is not an SVG, and a vector without a path for an SVG without a
 * shape, such as the SVG file of an icon font.
 * @param {string} xml
 * @returns {boolean}
 */
export function drawsSomething(xml) {
  return /<path\b/.test(xml)
}

/**
 * Convert the files of a folder of the output, recursively: each file with the extension
 * `from` is written beside itself with the extension `to` and removed. A file that converts
 * to a drawable without a shape is kept as it is.
 * @param {string} dir - A folder of the output
 * @param {Conversion} conversion - The extensions, of the processor
 * @param {(svg: string) => Promise<string>} convert - The converter, of `loadConverter()`
 * @returns {Promise<{ converted: string[], kept: string[], failed: Array<{ file: string, message: string }> }>}
 *   The files, by their paths before the conversion
 */
export async function convertFolder(dir, conversion, convert) {
  const result = { converted: [], kept: [], failed: [] }
  if (!fs.existsSync(dir)) return result

  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== conversion.from) continue

    const file = path.join(entry.parentPath, entry.name)
    let xml
    try {
      xml = await convert(fs.readFileSync(file, 'utf-8'))
    } catch (error) {
      result.failed.push({ file, message: /** @type {Error} */ (error).message })
      continue
    }
    if (!drawsSomething(xml)) {
      result.kept.push(file)
      continue
    }
    fs.writeFileSync(file.slice(0, -conversion.from.length) + conversion.to, xml)
    fs.rmSync(file)
    result.converted.push(file)
  }
  return result
}
