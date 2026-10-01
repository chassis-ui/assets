/**
 * Chassis Assets Verify
 *
 * Checks an existing output: the validator (`validate-assets.js`), then the consumer
 * contracts of `chassis.checks.json` (`contract.js`), if there are any. Run it after a full
 * build; CI does.
 *
 * @module verify
 */

import { checkContracts, printContracts } from './contract.js'
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
  const contract = printContracts(checkContracts(options))
  return { valid, contract }
}

const HELP = `Usage: pnpm assets:verify [options]

Runs the validator, then the check of the consumer contracts of chassis.checks.json, on an
existing output. Exits 1 when either fails.

Options:
  --out <dir>            Output folder to read, default dist
  --cwd <dir>            Repository root, default the nearest folder upward whose
                         package.json has a \`chassis\` block
  --help, -h             Print this help
`

/**
 * The command line of verify: `pnpm assets:verify`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  const options = { cwd: undefined, out: undefined }
  for (let i = 0; i < argv.length; i++) {
    if ((argv[i] === '--out' || argv[i] === '--cwd') && argv[i + 1]) {
      options[argv[i].slice(2)] = argv[++i]
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
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
