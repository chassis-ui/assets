---
'@chassis-ui/assets': minor
---

**Breaking.** With `--asset-catalog`, the files of `<name>_light` and `<name>_dark` of a folder are one image set, `Assets.xcassets/<name>.imageset/`, in place of `<name>_light.imageset/` and `<name>_dark.imageset/`. An app names the image `<name>`, and iOS picks the appearance. A pair stays two sets when one is a vector and the other a raster, or when a set of `<name>` exists.

Add `--icon-catalog`, which writes the icons of an iOS job to `Icons.xcassets` in place of `icons/`. An SVG that paints only in `currentcolor` renders as a template, one with another color or a gradient keeps its colors, and a sprite of `<symbol>` elements stays in `icons/`. The default output does not change, and a repository of assets has to change nothing.

`chassis-assets init` writes a script `build:release`, with both catalog options, and its `release.yml` runs it, so the iOS archives of a new repository hold the catalogs. An existing repository keeps its archives until it does the same.
