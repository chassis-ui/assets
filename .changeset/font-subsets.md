---
'@chassis-ui/assets': minor
---

`pnpm assets --subset [range...]`, with its ranges in `chassis.subset`.

- `--subset` writes each WOFF and WOFF2 font under `fonts/` of a web job again under its own
  name, with the characters of a list of Unicode ranges only. No file of `dist/` is added,
  removed or renamed, and the stylesheets of `fonts/` are untouched.
- A range is a name, `latin`, `latin-ext`, `cyrillic`, `cyrillic-ext`, `greek`, `greek-ext`,
  `vietnamese`, `math` or `symbols`, or a range of code points such as `U+0370-03FF`. The values of the option
  win over `ranges` of `chassis.subset` of `package.json`, and without either the build
  keeps `latin` and `latin-ext`. The block is optional and turns nothing on.
- A font keeps its format, its layout features and the license entries of its `name` table.
  A font that would not get smaller stays as it was copied, and so does a font without a
  character of the ranges, with a warning.
- The TTF and OTF fonts of iOS and Android and the icon font of `icons/` are not read.
- The option is off by default, and no file of the default output changes. It uses the
  package `subset-font`, which the build loads only with the option and which
  `pnpm install` brings. Without it the build stops before it removes anything and names
  the install as the fix.
- The release archives are built without the option.
- `generateAssets()` and `ChassisAssets.build()` take `subset`, true or a list of ranges,
  the statistics have `fontsSubsetted` and `fontBytesSaved`, and a processor names the fonts
  it subsets in `subset`.
