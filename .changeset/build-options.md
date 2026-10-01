---
'@chassis-ui/assets': minor
---

New options of the build and a library that a script can import.

- `--out <dir>`, `--cwd <dir>`, `--dry-run`, `--allow-lfs-pointers`, `--quiet`, `--help`
  and `--version`. The analyzer and the validator take `--out` and `--cwd`.
- `generateAssets(options)` takes `brands`, `apps`, `platforms`, `clean`, `quiet`, `cwd`,
  `out`, `dryRun` and `allowLfsPointers`, and `ChassisAssets.build()` passes its filters on.
  The library no longer reads the command line or exits the process; the command-line
  entry does.
- PNG files under `icons/` are kept for iOS.
