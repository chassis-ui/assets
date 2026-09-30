/**
 * @file concurrency.js
 * @description Runs a function over a list, a bounded number of calls at a time.
 * @copyright Copyright (c) 2026 Ozgur Gunes
 * @license MIT
 */

/**
 * Maps a list with an asynchronous function, with at most `limit` calls running. The
 * first call that fails fails the whole, and no further call starts.
 * @template T, R
 * @param {T[]} items
 * @param {number} limit - The number of calls that run at a time, 1 or more.
 * @param {(item: T, index: number) => Promise<R>} run
 * @returns {Promise<R[]>} The results, in the order of the items.
 */
export async function mapLimit(items, limit, run) {
  /** @type {R[]} */
  const results = new Array(items.length)
  let next = 0
  let failed = false
  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next++
      try {
        results[index] = await run(items[index], index)
      } catch (error) {
        failed = true
        throw error
      }
    }
  }
  const workers = Math.max(1, Math.min(Math.floor(limit) || 1, items.length))
  await Promise.all(Array.from({ length: workers }, worker))
  return results
}
