/**
 * Platform Processors Registry
 * Central export point for all platform processors
 * @module processors
 */

import webProcessor from './web.js'
import iosProcessor from './ios.js'
import androidProcessor from './android.js'

/**
 * Platform processor registry
 * Maps platform names to their respective processor configurations
 */
export const platformProcessors = {
  web: webProcessor,
  ios: iosProcessor,
  android: androidProcessor
}

/**
 * Get a processor by platform name
 * @param {string} platform - Platform name ('web', 'ios', 'android')
 * @returns {Object|null} Processor configuration or null if not found
 */
export function getProcessor(platform) {
  return platformProcessors[platform] || null
}

/**
 * Get array of all platform names
 * @returns {string[]} Array of platform names
 */
export function getPlatformNames() {
  return Object.keys(platformProcessors)
}

// Export individual processors
export { webProcessor, iosProcessor, androidProcessor }

// Export shared utilities
export * from './shared.js'
