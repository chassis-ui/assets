---
'@chassis-ui/assets': minor
---

`chassis-assets static-font <variable font> <output> [<output> ...] <axis>=<value> ...` writes
the static font of a variable font to each output: every axis fixed, the ones given at their value and the others at
their default, with every glyph, character and layout feature kept, and the names that the
`STAT` table gives the values, with the PostScript name of a download by weight, such as
`Inter-SemiBold`. It writes WOFF2 for an output that ends with `.woff2`. It needs the optional
peer `subset-font`, and replaces the Python script `build/instance-font.py` of the fonts
page. No file of `dist/` changes.
