---
'@chassis-ui/assets': minor
---

`split` of `chassis.subset` writes a font in a file per range. With `"split": true`, a build
with `--subset` writes each WOFF and WOFF2 font that a stylesheet of `fonts/` declares once
per range too, beside itself, and the `@font-face` rule of the stylesheet once per range, with
its `unicode-range`. A browser downloads the file of a range only for a page that has a
character of it.

Added to `fonts/` of a web job, with the setting only: `<name>-<range>.<extension>` for each
declared font and each range it has a character of, such as `text-latin.woff2` and
`text-latin-ext.woff2`, and `code-u2500-257f.woff2` for the range `U+2500-257F`.

Changed, with the setting only: the stylesheets of `fonts/` that declare a font of the folder.

No file is removed or renamed: the font itself stays, with every range. Without the setting,
and without `--subset`, a build writes what it wrote.
