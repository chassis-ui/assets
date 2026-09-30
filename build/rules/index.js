/**
 * @file rules/index.js
 * @description The rules of every platform, by the name of the platform.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import * as android from './android.js'
import * as ios from './ios.js'
import * as web from './web.js'

/** @import { Platform, Rules } from '../types.js' */

/** @type {Record<Platform, Rules>} */
export const rules = { web, ios, android }
