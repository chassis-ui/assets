---
'@chassis-ui/assets': minor
---

`pnpm assets --optimize`, `--webp` and `--avif`, with their settings in `chassis.optimize`.

- `--optimize` writes each image under `images/` again under its own name, when that makes
  the file smaller. Without settings no visible pixel changes: a PNG is compressed again,
  an SVG loses its comments and metadata and keeps its shapes and its ids, a JPEG is left
  as it is. No file of `dist/` is added, removed or renamed.
- `--webp` writes each PNG and JPEG image as WebP too. On the web the file is added beside
  the image, `dist/web/<app>/<brand>/images/hero.webp` beside `hero.png`. On Android it
  takes the place of the image when it is smaller,
  `dist/android/<app>/<brand>/images/drawable/hero.webp` for `hero.png`. iOS gets none.
- `--avif` adds `hero.avif` beside each PNG and JPEG image of the web.
- A WebP or AVIF file of `source/` is kept over the one the build would write.
- `chassis.optimize` of `package.json` holds the settings: `types`, `png.quality`,
  `jpeg.quality`, `svg.precision`, and `quality` and `lossless` of `webp` and `avif`. The
  block is optional and turns nothing on.
- The three options are off by default, and no file of the default output changes. They use
  the packages `sharp` and `svgo`, which the build loads only with an option and which
  `pnpm install` brings. Without them the build stops before it removes anything and names
  the install as the fix.
- The release archives are built with `--optimize`, and without `--webp` and `--avif`: an
  archive has the names of a default build, and its PNG and SVG images are smaller.
- `generateAssets()` and `ChassisAssets.build()` take `optimize`, `webp` and `avif`, the
  statistics have `filesOptimized`, `bytesSaved` and `filesGenerated`, and a processor names
  its second formats in `imageFormats`.
- `pnpm assets:validate` passes on an output that was built with the options.
- Fixed: a build started through a linked folder, or from a path with a space, did nothing
  and exited with 0.
