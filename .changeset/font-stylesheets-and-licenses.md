---
'@chassis-ui/assets': minor
---

The font stylesheets of the default brand declare the font files that are in the folder,
and the licenses of the fonts are in the output.

- `fonts/text.css` and `fonts/code.css` of `dist/web/docs/<brand>/` have one `@font-face`
  per file of the folder, instead of rules for Inter and Fira Code files that were not
  there.
- `fonts/display.css` is new: the `@font-face` rules of the display family.
- `fonts/text-license.txt`, `fonts/display-license.txt` and `fonts/code-license.txt` are
  new in the `fonts/` folder of every platform, app and brand that has the fonts. The font
  filters of the three platforms keep `.txt`.
