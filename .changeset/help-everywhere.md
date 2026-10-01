---
'@chassis-ui/assets': patch
---

`pnpm assets:analyze`, `assets:validate`, `assets:contract` and `assets:verify` print their
options with `--help`, as the build and the source lint do. An unknown option names
`--help` instead of the list.
