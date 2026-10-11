---
'@chassis-ui/assets': patch
---

`--subset` knows the range `symbols2`: the box drawing and the block characters, `U+2500-259F`, with the code points that Google Fonts gives the name. A site with a file tree in a code block builds with `--subset latin latin-ext symbols2`, and with `--split` the file of the range is `fonts/code-symbols2.woff2`. No file of the default build changes, and a build that names the range as `U+2500-257F` writes `fonts/code-u2500-257f.woff2` as before.
