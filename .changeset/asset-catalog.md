---
'@chassis-ui/assets': minor
---

`pnpm assets --asset-catalog` writes the images of iOS as an asset catalog.

- With the option, the files under `images/` of an iOS job move into
  `dist/ios/<app>/<brand>/Assets.xcassets/`, the files of one base name into one image set
  with its `Contents.json`: `images/chassis_logo_shadow.png` and
  `images/chassis_logo_shadow@2x.png` become
  `Assets.xcassets/chassis_logo_shadow.imageset/`. An SVG or a PDF without a raster of its
  name is an image set of one file that keeps its vector data, and a subfolder is a folder
  of the catalog that provides a namespace, `Assets.xcassets/logo/`.
- A file without a place in an image set stays in `images/`, with a warning per job: an SVG
  beside PNG variants of its name, a variant other than `@1x`, `@2x` and `@3x`, and any
  format but PNG, JPEG, SVG and PDF. In this repository these are the twelve SVG logos of
  `images/logo/`.
- The option is off by default, and no file of the default output changes. It needs nothing
  installed. The release archives are built without it.
- `generateAssets()` and `ChassisAssets.build()` take `assetCatalog`, the statistics have
  `imageSets`, and a processor names its catalog in `assetCatalog`.
- `pnpm assets:validate` passes on an output that was built with the option, and
  `pnpm test:ios` compiles the catalogs of an output with `actool`.
