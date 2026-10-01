---
'@chassis-ui/assets': minor
---

**Breaking.** The repository is a pnpm workspace. The build moved from `build/` to
`packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
from `site/` to `packages/site/`. A script that imports the library changes its path:
`build/api/index.js` is `packages/assets/build/api/index.js`.

- `source/`, `dist/`, the `chassis` block of the root `package.json` and every
  `pnpm assets*` command stay where they were, and the output is the same file for file.
- `packages/assets/build/cli.js` is one entry for the build and its checks: `build`,
  `analyze`, `validate`, `contract`, `verify` and `lint-source`. The `pnpm assets*` scripts
  run it with `node`, so the build works with nothing installed.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint and release tools of the root only. The build uses
  none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
