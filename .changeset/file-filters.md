---
'@chassis-ui/assets': minor
---

`pnpm assets --type` and `--include` build a part of a job, and `pnpm assets:lfs` prints the
Git LFS paths of that part.

- `--type <name...>` builds only the type folders it names, such as `images` and `icons`.
  `--include <pattern...>` builds only the files that match a pattern, by their path in the
  folder of the app in `source/`: `"images/home/**"`, `"images/*"`, `icons/cx-sprite.svg`,
  with `*`, `**` and `{a,b}`. The files are written where a full build writes them, with
  the same names, and the rest of `dist/` is kept.
- A file the filters leave out is not read, so a Git LFS pointer among them does not fail
  the build. Filters that match no file fail the build.
- `pnpm assets:lfs` takes the filters of the build and prints the paths of `source/` it
  reads, separated by commas, for `git lfs pull --include`. It needs nothing installed.
- Without the options no file of the output changes, and `pnpm assets:site` is as it was:
  it passes the options on, `pnpm assets:site --include "images/home/**"`.
- `generateAssets()` and `ChassisAssets.build()` take `types` and `include`, and
  `lfsInclude(options)` of `lfs-include.js` returns the paths.
