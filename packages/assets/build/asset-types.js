/**
 * Canonical Asset Type Definitions
 * Single source of truth for all asset types and their valid file formats
 * @module asset-types
 */

/**
 * Asset type definitions with valid file extensions
 * Used for validation and filtering across build and test systems
 */
export const assetTypes = {
  /**
   * Font assets
   * Includes modern web fonts and legacy formats
   */
  fonts: {
    name: 'fonts',
    extensions: ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
    additionalFiles: ['.css', '.scss'], // Style files often accompany fonts
    description: 'Font files in various formats'
  },

  /**
   * Icon assets
   * Vector and raster icon formats
   */
  icons: {
    name: 'icons',
    extensions: ['.svg', '.ico', '.pdf'],
    description: 'Icon files in vector and raster formats'
  },

  /**
   * Image assets
   * Common image formats for various platforms
   */
  images: {
    name: 'images',
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.avif'],
    description: 'Image files in various formats'
  }
}

/**
 * Get all valid extensions for an asset type
 * @param {string} assetType - Asset type name
 * @returns {string[]} Array of valid extensions (with dot prefix)
 */
export function getValidExtensions(assetType) {
  const type = assetTypes[assetType]
  if (!type) return []

  const extensions = [...type.extensions]
  if (type.additionalFiles) {
    extensions.push(...type.additionalFiles)
  }
  return extensions
}

/**
 * Check if a file extension is valid for an asset type
 * @param {string} extension - File extension (with dot)
 * @param {string} assetType - Asset type name
 * @returns {boolean} True if extension is valid
 */
export function isValidExtension(extension, assetType) {
  const validExtensions = getValidExtensions(assetType)
  return validExtensions.includes(extension.toLowerCase())
}

/**
 * Get all asset type names
 * @returns {string[]} Array of asset type names
 */
export function getAssetTypeNames() {
  return Object.keys(assetTypes)
}

/**
 * Check if a string is a valid asset type
 * @param {string} name - Potential asset type name
 * @returns {boolean} True if it's a valid asset type
 */
export function isAssetType(name) {
  return name in assetTypes
}

/**
 * Common metadata files to exclude from asset processing
 * These files provide information but are not assets themselves
 */
export const metadataFiles = [
  'readme',
  'license',
  'authors',
  'contributors',
  'fontlog',
  'ofl',
  'makefile',
  'changelog',
  'contributing',
  'requirements',
  'copyright',
  'notice',
  'patents'
]

/**
 * Check if a filename is a metadata file (not an asset)
 * @param {string} filename - Filename to check
 * @returns {boolean} True if it's a metadata file
 */
export function isMetadataFile(filename) {
  const name = filename.toLowerCase()
  const base = name.split('.')[0] // Get name without extension
  return metadataFiles.includes(base)
}

/**
 * Get all valid extensions across all asset types
 * Useful for fallback validation when asset type is unknown
 * @returns {string[]} Array of all valid extensions (deduplicated)
 */
export function getAllValidExtensions() {
  const allExtensions = new Set()

  for (const assetType of Object.values(assetTypes)) {
    assetType.extensions.forEach((ext) => allExtensions.add(ext))
    if (assetType.additionalFiles) {
      assetType.additionalFiles.forEach((ext) => allExtensions.add(ext))
    }
  }

  return Array.from(allExtensions).sort()
}
