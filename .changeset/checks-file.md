---
'@chassis-ui/assets': minor
---

**Breaking.** The build names no brand, app or file of this repository, so a team that
adopts it changes `source/`, the root `package.json` and `chassis.checks.json` only.

- `chassis.checks.json`, beside `package.json`, holds what the checks verify. It is
  optional and the build does not read it.
- Its `contracts` list, for a job `<platform>/<app>/<brand>`, the files a consumer reads,
  each entry with `reader`, `files` and `sets`. `pnpm assets:contract` checks the output of
  every job that has one, and passes when there is none, so `pnpm assets:verify` no longer
  fails in a repository without `dist/web/docs/chassis/`. `CONTRACT`, `CONTRACT_JOB`,
  `checkContract()` and `printContract()` of `contract.js` are gone; `checkContracts()` and
  `printContracts()` take their place, and `missingFromContract(paths, entries)` takes the
  entries.
- Its `lint.allow` lists the names the source lint keeps, each with `pattern` and `reason`.
  `KNOWN_ODDITIES` of `lint-source.js` is gone.
- The root scripts run the packages by folder, `pnpm -C packages/assets`, not by name.
- The archives of a release start with the name of the root `package.json` without
  `-workspace`, or with `--prefix`. `pnpm changeset:version` no longer fails when the
  README has no version badge.
