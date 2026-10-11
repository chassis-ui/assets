---
'@chassis-ui/assets': minor
---

`--split` writes a font in a file per range. A build with `--subset` and `--split` writes
each WOFF and WOFF2 font that a stylesheet of `fonts/` declares once per range too, beside
itself, and the `@font-face` rule of the stylesheet once per range, with its `unicode-range`.
A browser downloads the file of a range only for a page that has a character of it.
`split` of `chassis.subset`, `true` or `false`, is the choice of a repository, and `--split`
and `--no-split` win over it.

Added to `fonts/` of a web job, with the split only: `<name>-<range>.<extension>` for each
declared font and each range it has a character of, such as `text-latin.woff2` and
`text-latin-ext.woff2`, and `code-u2500-257f.woff2` for the range `U+2500-257F`.

Changed, with the split only: the stylesheets of `fonts/` that declare a font of the folder.

No file is removed or renamed: the font itself stays, with every range. Without the split,
and without `--subset`, a build writes what it wrote.
