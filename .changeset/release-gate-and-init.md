---
'@chassis-ui/assets': minor
---

**Breaking.** `init --force` no longer writes over `package.json`, `chassis.checks.json` or `CHANGELOG.md`; to take a new script, add it by hand. Add `chassis-assets release-notes`, `manifest` and `diff`, and let a repository of assets take what `init` writes now. No file of `dist/` is added, removed or renamed.

- `release-notes [version]` prints the entry of a version in `CHANGELOG.md`, and exits 1 without one. The workflows of `init` run it in CI and first in the release, and the body of the GitHub release is the entry, in place of `--generate-notes`.
- `manifest` writes `<name>-manifest-<version>.json`, the size and the SHA-256 of every file by job, and the release workflow attaches it. `diff --base <manifest>` reports the files added, removed, renamed and changed since one.
- `init` writes `CHANGELOG.md`, `AGENTS.md` and `CLAUDE.md`, a script `release-notes`, and takes `--repository`, `--license` and `--author`. The workflows install with `npm ci` or `pnpm install --frozen-lockfile` and cache the packages, so the lockfile has to be committed.
- `init --check` reports where a repository differs from what this version writes, and `init --only <file…>` writes those files.

A repository of assets takes the gate with `npx chassis-assets init --only AGENTS.md CLAUDE.md`, `--only .github/workflows/ci.yml .github/workflows/release.yml --force`, a `CHANGELOG.md` with an entry for its version, and the script `"release-notes": "chassis-assets release-notes"`. The package now holds its `LICENSE`.
