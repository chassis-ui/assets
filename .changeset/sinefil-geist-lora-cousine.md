---
"@chassis-ui/assets": patch
---

The fonts of the `sinefil` brand are Geist 1.800 for `ui`, Lora 3.008 for `prose` and
Cousine 1.241 for `code`, where they were DM Sans, Source Serif 4 and IBM Plex Mono, after
the tokens of the brand in chassis-tokens. The `display` role is set in the Lora family of
`prose`, so the brand has `prose` files and no `display` files. The `display` files that
leave the output of `sinefil` are in the changeset of D33.

Added: `prose.woff2`, `prose-italic.woff2`, the 8 files by weight `prose-<weight>.woff2` and
`prose-<weight>-italic.woff2`, and `prose-license.txt` in `fonts/` of
`dist/web/docs/sinefil/`; the 8 files by weight `prose_<weight>.ttf` and
`prose_<weight>_italic.ttf`, and `prose_license.txt`, in `dist/ios/demo/sinefil/fonts/` and
`dist/android/demo/sinefil/fonts/`. The weights of `prose` are elegant 500, normal 400,
strong 600 and mass 700.

Changed: `fonts.css`, the `ui` and `code` fonts and their licenses in the same folders.
`fonts.css` declares the families `Geist`, `Lora` and `Cousine`.

The PostScript names of the app fonts change with the family: `ui_normal.ttf` is
`Geist-Regular` where it was `DMSans18pt-Regular`, `prose_normal.ttf` is `Lora-Regular`, and
`code_strong.ttf` is `Cousine-Bold` where it was `IBMPlexMono-Bold`. The `display` role,
which was `SourceSerif414pt-Regular` and the other cuts of Source Serif 4, is set in Lora. An
app that names a font in its code, and does not read the name from the file, changes that
name.
