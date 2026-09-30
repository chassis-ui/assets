/**
 * @file logger.js
 * @description The output of the command line, in the pattern of the build of
 *              `@chassis-ui/tokens`. With `quiet` it prints errors only.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

import { BuildError } from './errors.js'

/** @import { PlannedFile, Report } from './types.js' */

/**
 * @param {number} ms
 * @returns {string} A duration in seconds, with two decimals.
 */
export function formatDuration(ms) {
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * @param {number} bytes
 * @returns {string} A size in B, kB or MB.
 */
export function formatBytes(bytes) {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1000 * 1000) return `${(bytes / 1000).toFixed(1)} kB`
  return `${(bytes / 1000 / 1000).toFixed(1)} MB`
}

/**
 * Makes a logger.
 * @param {Object} [options]
 * @param {boolean} [options.quiet] - Prints errors only.
 * @param {boolean} [options.debug] - Prints the debug messages, and the stack trace of an
 *   error. The environment variable `DEBUG` turns it on without it.
 * @param {Pick<Console, 'log' | 'warn' | 'error'>} [options.console] - Where it prints.
 */
export function createLogger({
  quiet = false,
  debug = Boolean(process.env.DEBUG),
  console: out = console
} = {}) {
  return {
    /**
     * Prints an error, also when the logger is quiet. An error that a contributor can fix
     * is printed without a stack trace.
     * @param {string} message
     * @param {unknown} [error]
     */
    error(message, error) {
      out.error(`\n❌ ${message}`)
      if (!(error instanceof Error)) return
      const expected = error instanceof BuildError
      const text = debug && !expected ? error.stack : error.message
      for (const line of String(text).split('\n')) out.error(`   ${line}`)
    },

    /** @param {string} message */
    warn(message) {
      if (!quiet) out.warn(`⚠️  ${message}`)
    },

    /** @param {string} message */
    info(message) {
      if (!quiet) out.log(message)
    },

    /** @param {string} message */
    debug(message) {
      if (!quiet && debug) out.log(`🔍 ${message}`)
    },

    /** @param {string} message */
    header(message) {
      if (!quiet) out.log(`\n${message}\n`)
    },

    /**
     * Prints which job of how many starts.
     * @param {number} current
     * @param {number} total
     * @param {string} name - The name of the job.
     */
    progress(current, total, name) {
      if (!quiet) out.log(`[${current}/${total}] ${name}`)
    },

    divider() {
      if (!quiet) out.log('='.repeat(40))
    },

    /**
     * Prints what a job did.
     * @param {Report} report
     */
    job(report) {
      if (quiet) return
      const parts = [`${report.written} files`, formatBytes(report.bytes)]
      if (report.cached > 0) parts.push(`${report.cached} from the cache`)
      if (report.removed.length > 0) parts.push(`${report.removed.length} removed`)
      out.log(`  ✔︎ ${report.out}: ${parts.join(', ')} (${formatDuration(report.ms)})`)
    },

    /**
     * Prints the summary of a build.
     * @param {number} successCount
     * @param {number} errorCount
     * @param {number} startTime - From `Date.now()`.
     */
    summary(successCount, errorCount, startTime) {
      if (quiet) return
      this.divider()
      out.log(`\n✅ ${successCount} succeeded${errorCount > 0 ? `, ❌ ${errorCount} failed` : ''}`)
      out.log(`⏱️  Completed in ${formatDuration(Date.now() - startTime)}\n`)
    },

    /**
     * Prints the jobs of a dry run, each with the files it would write.
     * @param {Array<{ job: { out: string }, files: PlannedFile[] }>} jobs
     */
    dryRun(jobs) {
      if (quiet) return
      out.log(`\n🔍 Dry run - showing ${jobs.length} job(s) that would run:\n`)
      for (const { job, files } of jobs) {
        out.log(`  • ${job.out} (${files.length} files)`)
        for (const file of files) {
          const how = file.step ? ` (${file.step.name})` : ''
          const from = file.source ? ` ← ${file.source}${how}` : ' (written by the build)'
          out.log(`      ${file.path}${from}`)
        }
      }
      out.log('')
    }
  }
}

/** @typedef {ReturnType<typeof createLogger>} Logger */
