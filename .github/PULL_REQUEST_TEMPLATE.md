## What this changes

<!-- One or two sentences. If it fixes an open issue, add "Fixes #123". -->

## Why

<!-- The problem this solves. For an asset, which brand, app and platform need it. -->

## How to check it

<!--
The quickest way for a reviewer to see it: the files to look at in `dist/` after `pnpm assets`,
a docs page, or the test that fails without the change.
-->

---

See [CONTRIBUTING.md](https://github.com/chassis-ui/assets/blob/develop/.github/CONTRIBUTING.md#what-a-pull-request-needs)
for the details behind each of these.

- [ ] The pull request targets `develop`
- [ ] `pnpm lint:prettier` passes
- [ ] `pnpm assets:lint:source`, `pnpm assets` and `pnpm assets:verify` pass, if `source/` changed
- [ ] `pnpm assets:lint`, `pnpm assets:typecheck` and `pnpm test` pass, if the build or its
      tests changed; `packages/assets/test/golden/` written again with `pnpm test:golden` and
      reviewed, if the output of the build is meant to change
- [ ] **Changeset** (`pnpm changeset`) if `source/` or `packages/assets/build/` changed, naming
      the files of `dist/` that are added, removed or renamed, with **Breaking.** when a file
      name, the layout of `dist/` or a command changes
- [ ] `chassis.checks.json` still holds, if a file that a consumer reads moved
- [ ] `pnpm site:lint`, `pnpm check:astro` and `pnpm site:build` pass, if the site changed
