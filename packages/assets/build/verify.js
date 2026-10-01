/**
 * Chassis Assets Verify
 *
 * Checks an existing output: the validator (`validate-assets.js`), then the consumer
 * contract (`contract.js`). Run it after a full build; CI does.
 *
 * @module verify
 */

import { checkContract, printContract } from './contract.js'
import { isEntry } from './root.js'
import DistValidator from './validate-assets.js'

/**
 * Run the validator and the contract check on an output.
 * @param {{ cwd?: string, out?: string }} [options] - The repository root and the output folder
 * @returns {Promise<{ valid: boolean, contract: boolean }>} Whether each passed
 */
export async function verify(options = {}) {
  const valid = await new DistValidator(options).runValidation()
  console.log('')
  const contract = printContract(checkContract(options))
  return { valid, contract }
}

/**
 * The command line of verify: `pnpm assets:verify`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  const options = { cwd: undefined, out: undefined }
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--out' || argv[i] === '--cwd') && argv[i + 1]) {
      options[argv[i].slice(2)] = argv[++i]
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Options: --out <dir>, --cwd <dir>`)
      process.exit(2)
    }
  }
  verify(options)
    .then(({ valid, contract }) => {
      if (!valid || !contract) {
        console.error(
          `\n❌ Verify failed: ${[!valid && 'the validator', !contract && 'the consumer contract'].filter(Boolean).join(' and ')}`
        )
        process.exit(1)
      }
      console.log('\n✅ Verify passed')
    })
    .catch((error) => {
      console.error(`💥 Verify failed: ${error.message}`)
      process.exit(1)
    })
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
