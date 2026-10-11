---
'@chassis-ui/assets': patch
---

`pnpm assets:lint:source` reads the fonts. For each `@font-face` rule of a stylesheet in
`fonts/`, it opens the file the rule declares, as a brand gets it, and fails when the file is
of another family than the rule names, has another weight or a weight axis that does not hold
the range of the rule, is an italic that the rule declares as normal or the other way round,
or is not in the folder. It warns about a font of the default brand that a brand gets and
that no stylesheet of the brand declares.

The lint needs no package, and reads TrueType, OpenType, WOFF and WOFF2 fonts. A build writes
what it wrote: no file of `dist/` is added, removed or renamed.
