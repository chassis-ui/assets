/**
 * Chassis Assets Native Check
 *
 * Compiles an existing output with the tools of each platform, as an app compiles it: the asset
 * catalogs and the `.icon` bundles of iOS with `actool`, and the `res/` folders of Android with
 * `aapt2`. A file that the source lint, the build and the validator pass can still fail there, and
 * it is the place where a designer does not look. The checks are the scripts in `native/`, run
 * with bash: they need the tools of the platform and no package.
 *
 * `planChecks(options)` says what to run; the command-line entry at the bottom runs it.
 *
 * @module check-native
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { isEntry, resolveRoot } from './root.js'

/** The platforms with a check, each a script in `native/`. */
export const NATIVE_PLATFORMS = ['ios', 'android']

/**
 * The checks of an output: the platforms given, or by default those with a folder in the output.
 * @param {{ cwd?: string, out?: string, platforms?: string[] }} [options]
 * @returns {{ output: string, checks: Array<{ platform: string, script: string }> }}
 * @throws {Error} On a platform without a check, or an output without such a folder
 */
export function planChecks(options = {}) {
  const output = path.resolve(resolveRoot(options.cwd), options.out || 'dist')
  for (const platform of options.platforms ?? []) {
    if (!NATIVE_PLATFORMS.includes(platform)) {
      throw new Error(`No check of ${platform}. Platforms: ${NATIVE_PLATFORMS.join(', ')}`)
    }
  }
  const platforms = options.platforms?.length
    ? options.platforms
    : NATIVE_PLATFORMS.filter((platform) => fs.existsSync(path.join(output, platform)))
  if (platforms.length === 0) {
    throw new Error(
      `No ${NATIVE_PLATFORMS.join(' or ')} folder in ${output}. Run the build first, with the options of a release.`
    )
  }
  return {
    output,
    checks: platforms.map((platform) => ({
      platform,
      script: fileURLToPath(new URL(`./native/${platform}.sh`, import.meta.url))
    }))
  }
}

const HELP = `Usage: chassis-assets check-native [options]

Compiles an existing output with the tools of each platform, as an app compiles it. iOS: the asset
catalogs and the .icon bundles with actool, which needs Xcode; build with --asset-catalog. Android:
the res/ folders with aapt2, which needs the Android SDK in ANDROID_HOME; build with --res
--vector-drawables. Exits 1 when a check fails or its tools are missing.

Options:
  --platform <name>   ios or android, one or more times. Default: those with a folder in the output
  --out <dir>         Output folder to read, default dist
  --cwd <dir>         Repository root, default the nearest folder upward whose package.json has
                      a \`chassis\` block
  --help, -h          Print this help
`

/**
 * The command line of the native checks: `chassis-assets check-native`. Exits the process.
 * @param {string[]} [argv] - The arguments. Default: `process.argv.slice(2)`
 */
export function cli(argv = process.argv.slice(2)) {
  /** @type {{ cwd?: string, out?: string, platforms: string[] }} */
  const options = { platforms: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--platform' && argv[i + 1] !== undefined) {
      options.platforms.push(argv[++i])
    } else if (['--out', '--cwd'].includes(argv[i]) && argv[i + 1] !== undefined) {
      options[argv[i].slice(2)] = argv[++i]
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(HELP)
      process.exit(0)
    } else {
      console.error(`❌ Unknown option ${argv[i]}. Run with --help for the options.`)
      process.exit(2)
    }
  }

  let plan
  try {
    plan = planChecks(options)
  } catch (error) {
    console.error(`❌ ${error.message}`)
    process.exit(1)
  }
  for (const { script } of plan.checks) {
    const { status } = spawnSync('bash', [script, plan.output], { stdio: 'inherit' })
    if (status !== 0) process.exit(1)
  }
}

// Only run if this file is executed directly (not imported)
if (isEntry(import.meta.url)) cli()
