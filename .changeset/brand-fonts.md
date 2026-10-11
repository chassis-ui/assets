---
'@chassis-ui/assets': minor
---

**Breaking.** The `example` brand is replaced by the `sinefil` brand, the app fonts of the
default brand are TTF files, and the web fonts have a variable file per role.

Removed: `dist/web/docs/example/`, `dist/ios/demo/example/` and `dist/android/demo/example/`.
The brand of `chassis.build.brands` is `sinefil`, with `dist/web/docs/sinefil/`,
`dist/ios/demo/sinefil/` and `dist/android/demo/sinefil/` in their place.

Renamed, in `fonts/` of `dist/ios/demo/<brand>/` and `dist/android/demo/<brand>/`: the 16
files `text_<weight>.otf`, `text_<weight>_italic.otf`, `display_<weight>.otf` and
`display_<weight>_italic.otf` are `.ttf` files, `text_normal.otf` to `text_normal.ttf`. The
text font is the 18pt cut of Inter, so its PostScript name is `Inter18pt-Regular` where it was
`Inter-Regular`. Every brand has its app fonts as TTF, so that a brand file replaces the
default file of the same name.

Added to `fonts/` of `dist/web/docs/<brand>/`: the variable fonts `text.woff2`,
`text-italic.woff2`, `display.woff2`, `display-italic.woff2` and `code.woff2`. A variable font
is named by its role, without a weight. The files by weight, `text-normal.woff2` and the
others, stay.

Changed: `text.css`, `display.css` and `code.css` of `dist/web/docs/chassis/fonts/` declare
the variable font of their role, with the range of its weights, where they declared one file
per weight.

The `sinefil` brand has fonts of its own for every role, in both apps: DM Sans for `text`,
Source Serif 4 for `display` and IBM Plex Mono for `code`, with their stylesheets and
licenses. IBM Plex Mono has no variable font, so `code.css` of the brand declares
`code-normal.woff2` and `code-strong.woff2`, and `fonts/code.woff2` of its web output is the
file of the default brand.
