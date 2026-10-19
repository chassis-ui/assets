---
"@chassis-ui/assets": patch
---

The `display` font of the `chassis` brand is Montserrat 9.000, where it was Archivo Narrow
3.002, at the weights elegant 300, normal 400, strong 600 and mass 700, where Archivo Narrow
had 400, 500, 600 and 700. No file of `dist/` is added, removed or renamed by this change.

Changed: `display.woff2`, `display-italic.woff2`, the rules of `display` in `fonts.css` and
the 16 files by weight of `display` in `fonts/` of `dist/web/docs/chassis/`, the 16 files by
weight as `.ttf` in `dist/ios/demo/chassis/fonts/` and `dist/android/demo/chassis/fonts/`, and
`display-license.txt` beside them. The variable font has every weight from 100 to 900, where
it had 400 to 700.

The PostScript names of the app fonts change with the family: `display_normal.ttf` is
`Montserrat-Regular` where it was `ArchivoNarrow-Medium`, and `display_strong_italic.ttf` is
`Montserrat-SemiBoldItalic`. An app that names a font in its code, and does not read the name
from the file, changes that name.
