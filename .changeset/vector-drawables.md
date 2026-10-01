---
'@chassis-ui/assets': minor
---

`pnpm assets --vector-drawables` writes the SVG icons of Android as vector drawables.

- With the option, each SVG file under `icons/` of an Android job is written as a vector
  drawable in the same folder under the same name, `.xml` in place of `.svg`:
  `dist/android/<app>/<brand>/icons/svgs/ic_arrow_right_solid.xml`. A path without a fill
  color is filled black, for a tint to replace. An SVG without a shape stays an SVG, with a
  warning: `icons/icons/ic_chassis_icons.svg` of this repository.
- The option is off by default, and no file of the default output changes. The release
  archives are built without it.
- The conversion uses the package `svg2vectordrawable`, which the build loads only with the
  option. It is installed by `pnpm install`; the default build still needs nothing installed.
- `generateAssets()` and `ChassisAssets.build()` take `vectorDrawables`, the statistics have
  `filesConverted`, and a processor names what it converts in `vectorDrawables`.
- `pnpm assets:validate` passes on an output that was built with the option.
