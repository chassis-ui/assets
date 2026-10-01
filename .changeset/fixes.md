---
'@chassis-ui/assets': patch
---

Fixes of the analyzer, the ignore list and the library.

- The analyzer finds files with the same content. It kept one file per hash and found none.
- `pnpm assets:analyze --platform <name>` counts the files of that platform in `dist/`. It
  left out the whole of `dist/`.
- `*~`, `*.swp`, `*.tmp` and `*.temp` files in `source/` are left out of the build, as the
  ignore list says. The wildcard escaped its own dot and matched none of them. No such file
  is in `source/`, so the output does not change.
- `ChassisAssets.getStats()` and `validate()` read `source/` and `dist/` from the `cwd` and
  `out` of the instance, not from the working directory. `getAssetInventory()` sorts a file
  by its type folder, as the build does, so an SVG under `images/logo/` is an image.
- 40 Figma screenshots in `source/` are renamed to the names the web build writes, so the
  output does not change.
