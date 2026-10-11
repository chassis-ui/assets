---
'@chassis-ui/assets': patch
---

The files by weight of a family with a variable font are written from it, in both brands, so
every file of a role is one version of one design. No file of `dist/` is added, removed or
renamed.

Changed: the 18 files by weight of the `chassis` brand and the 16 of `text` and `display` of
the `sinefil` brand, in `fonts/` of `dist/web/docs/<brand>/` as `.woff2`, and of
`dist/ios/demo/<brand>/` and `dist/android/demo/<brand>/` as `.ttf`, and `code.woff2` in
`fonts/` of `dist/web/docs/chassis/` and `dist/web/docs/sinefil/`.

The `chassis` brand:

- `text`: Inter 4.001 at the optical size 14 in every file, the cut that `--subset` fixes in
  the variable font of the web. The PostScript names of the app fonts are `Inter-Regular`,
  `Inter-SemiBoldItalic` and so on.
- `display`: Archivo Narrow 3.002 with the outlines it had. The `.woff2` files are written
  from the `.ttf` files and are 24 KB where they were 34 KB.
- `code`: Fira Code 6.002 in every file. The variable `code.woff2` is the variable font of
  the 6.2 release of the family, where it was the 5.002 of Google Fonts: it has 35 characters
  more and the features `cv01` to `cv32`, `ss09` and `ss10`, its advance is 0.615 em where it
  was 0.600, and its line is 1.23 em where it was 1.31, as the files by weight have them.
  `code-strong` is the Bold, 700, where it was the SemiBold, 600, and its PostScript name is
  `FiraCode-Bold`. The files by weight have every character, every feature and the metrics
  of the files by weight of the release, and no hinting instructions.

The `sinefil` brand: DM Sans and Source Serif 4 have the outlines they had, point for point,
DM Sans in its cut of 18 and Source Serif 4 in its cut of 14. The files of Source Serif 4 name
that cut, which the files of the download did not: the family in a file is
`Source Serif 4 14pt`, and the PostScript name of `display_normal.ttf` is
`SourceSerif414pt-Regular` where it was `SourceSerif4-Regular`. The names of DM Sans are
those they were, `DMSans18pt-Regular`.

`build/instance-font.py` writes such a file, and `docs/fonts.md` has the step.
