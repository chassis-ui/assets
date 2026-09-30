/**
 * @file errors.js
 * @description The error of a problem that a contributor can fix: a wrong key of the
 *              configuration, two files with one name, a file that is not what it says.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

/**
 * An error that names what it is about. The command line prints it without a stack trace.
 */
export class BuildError extends Error {
  /**
   * @param {string} message - What is wrong, and what to do about it.
   * @param {Object} [details]
   * @param {string} [details.file] - The file the error is about.
   * @param {string} [details.rule] - The rule or the step that found it.
   * @param {unknown} [details.cause] - The error behind this one.
   */
  constructor(message, { file, rule, cause } = {}) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'BuildError'
    this.file = file
    this.rule = rule
  }
}
