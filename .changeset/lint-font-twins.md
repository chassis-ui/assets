---
'@chassis-ui/assets': patch
---

`pnpm assets:lint:source` checks the fonts that an app gets. A `@font-face` rule declares a
`.woff2` file, and the `.ttf` file of the same name, which iOS and Android get, was checked
by nothing.

- A rule is checked against every font file of the declared name, not the declared one
  alone: a rule for `text-normal.woff2` is also the rule of `text-normal.ttf`, and of an
  `.otf` or a `.woff` file of that name, as a brand gets the folder. The error is the one of
  the declared file, on the file it is about.
- Two font files of one name in a `fonts/` folder have to be one font in two formats. The
  lint fails when they differ in the family, the weight, the style, the axes, the version
  string or the number of glyphs, and names both files and what differs.
- A `format()` of a `src` that is not the format of its file, by the extension, is a warning.

The fonts of both brands pass. A build writes what it wrote: no file of `dist/` is added,
removed or renamed.
