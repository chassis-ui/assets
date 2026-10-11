# Preparing fonts

How the font files of a brand are made and placed in `source/`: for a new brand, a new family
of a role, or a new version of a family. The names and the formats are the rules of the
[fonts page](../packages/site/content/docs/asset-types/fonts.mdx); this document is the
procedure behind the files. Decision D24 of the [roadmap](../ref/ROADMAP.md#decisions) has the
reasons.

The build copies fonts and converts nothing by default, so every file the output needs is a
file of `source/`, prepared once by hand. `build/instance-font.py` is the one script of the
procedure, and no part of the build.

## What a brand holds

A brand has the same file names as the default brand, with families of its own. A page or an
app that reads `fonts/text.css` or `text_normal.ttf` then gets the font of the brand it was
built for, with no change to its code.

The web app, `source/<brand>/docs/fonts/`, holds for each role:

| File                                                    | What it is                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `<role>.woff2`, `<role>-italic.woff2`                   | The variable font, when the family has one. Every weight in a file |
| `<role>-<weight>.woff2`, `<role>-<weight>-italic.woff2` | One file per weight of the role                                    |
| A `.ttf` beside each `.woff2`                           | The font as TrueType. The web output drops it                      |
| `<role>.css`                                            | Declares the variable files, or the files by weight without one    |
| `<role>-license.txt`                                    | The license of the family                                          |

The files by weight of a family with a variable font are written from the variable file, by
step 4, so every file of a role is one version of one design. The `.woff2` of a font is
written from the `.ttf` beside it, by step 5.

The iOS and Android app, `source/<brand>/demo/fonts/`, holds the files by weight only, as
`.ttf` and `.woff2`, with a `<role>.css` that declares the files by weight, and the licenses.
It has no variable file.

Three rules keep the brands in step:

- **Every file of a role is replaced.** A brand gets each default file it has no replacement
  for. A role with half its files replaced ships two families.
- **Same name, same extension.** A brand file replaces a default file of the same path only.
  The app fonts are `.ttf` in every brand; a `.otf` beside a default `.ttf` adds a file and
  replaces none.
- **The stylesheet and the license go with the family.** A brand that replaces the files of
  a role adds its own `<role>.css` and `<role>-license.txt`.

A family without a variable font is the one exception to the first rule: the brand has no
`<role>.woff2`, so the file of the default brand stays in its web output, and the stylesheet
of the brand does not load it. See the known oddities of
[architecture.md](architecture.md#known-oddities).

## The families today

The roles and the weights are those of the font tokens of Chassis Tokens,
`typography.fontFamily.<role>` and `typography.fontWeight.<role>.<weight>` in
`source/brand-<brand>/brand-base.json` of that repository. The table has the weight of each
file by weight, which is the weight of its token.

| Brand     | Role      | Family         | Variable           | elegant | normal | strong | mass |
| --------- | --------- | -------------- | ------------------ | ------- | ------ | ------ | ---- |
| `default` | `text`    | Inter          | Upright and italic | 300     | 400    | 600    | 700  |
| `default` | `display` | Archivo Narrow | Upright and italic | 400     | 500    | 600    | 700  |
| `default` | `code`    | Fira Code      | Upright            |         | 400    | 700    |      |
| `sinefil` | `text`    | DM Sans        | Upright and italic | 300     | 400    | 600    | 700  |
| `sinefil` | `display` | Source Serif 4 | Upright and italic | 300     | 400    | 600    | 700  |
| `sinefil` | `code`    | IBM Plex Mono  | None               |         | 400    | 700    |      |

The `text` and `display` roles have an italic of every weight. The `code` role has none.

Where the files come from:

- Every family is licensed under the SIL Open Font License. The variable files, and the
  files of IBM Plex Mono, are the downloads of [Google Fonts](https://fonts.google.com),
  placed here on 2026-10-11: Inter 4.001, Archivo Narrow 3.002, DM Sans 4.004, Source Serif 4
  4.004 and IBM Plex Mono 2.3. Fira Code is the one family from elsewhere, below.
- A variable font is whole in `source/`, with every axis of the download. Inter, DM Sans and
  Source Serif 4 have an optical size axis, which a browser sets from the font size. A build
  with `--subset` fixes it at 14 for the `chassis` brand, by `axes` of `chassis.subset` in
  `package.json`, and leaves it to the `sinefil` brand. Decision D25 of the roadmap.
- The files by weight of both brands are written from their variable files, by step 4 with
  fonttools 4.66.1, on 2026-10-11, each at the weight of its role. Decision D28 of the
  roadmap.
- The files by weight of the default brand are at the default of every other axis. For Inter
  that is the optical size 14, the cut that `--subset` fixes for the web, so a page and an
  app show the same cut. An iOS app loads the files as `Inter-Regular`,
  `ArchivoNarrow-Medium` and `FiraCode-Bold`.
- The files by weight of the `sinefil` brand are at the optical size that the files by weight
  of the downloads had, and have their outlines point for point: DM Sans at 18, written with
  `opsz=18`, and Source Serif 4 at 14, written with `opsz=14`. The defaults of the two axes
  are 9 and 20. The files name their cut, `DM Sans 18pt` and `Source Serif 4 14pt`, and an
  iOS app loads them as `DMSans18pt-Regular` and `SourceSerif414pt-Regular`. The download of
  Source Serif 4 has its files of 14 without a size in the name. The `display` role is so
  drawn in a cut for text, where the variable file of the web takes the size of a heading.
- The variable file of the default `code` role is `variable_ttf/FiraCode-VF.ttf` of
  `Fira_Code_v6.2.zip`, from the [releases of Fira Code](https://github.com/tonsky/FiraCode/releases),
  placed here on 2026-10-11. The font names its version 6.002. Google Fonts has 5.002, with
  35 characters fewer, without the features `cv01` to `cv32`, `ss09` and `ss10`, and with
  other line metrics. `code.woff2`, which step 5 writes, is `woff2/FiraCode-VF.woff2` of the
  archive byte for byte.

## Steps

The steps add or replace the fonts of one role of one brand. They need Git LFS, since fonts
are Git LFS files, `pnpm` for the conversion, and Python for a family with a variable font.

### 1. Read the tokens

Take the family and the weights of the role from the tokens of the brand. The first family of
`typography.fontFamily.<role>` is the name the stylesheet declares, letter for letter. Each
`typography.fontWeight.<role>.<weight>` gives the numeric weight of a file by weight.

### 2. Get the files and check the license

Download the family, and unpack it outside `source/`. A download of Google Fonts holds the
variable fonts at the top, the files by weight in `static/`, and the license, `OFL.txt`.

Check that the license allows embedding in an app and serving on the web. The download is
not committed: only the files of the next step enter the repository.

### 3. Copy the files by role

Copy each file to `source/<brand>/docs/fonts/` under its role name. A family with a variable
font gives its variable files and its license. For the `text` role of the `sinefil` brand:

| File of the download                       | Name in `fonts/`   |
| ------------------------------------------ | ------------------ |
| `DMSans-VariableFont_opsz,wght.ttf`        | `text.ttf`         |
| `DMSans-Italic-VariableFont_opsz,wght.ttf` | `text-italic.ttf`  |
| `OFL.txt`                                  | `text-license.txt` |

A family without a variable font gives its files by weight, each under the name of the weight
the tokens give it. For the `code` role of the `sinefil` brand:

| File of the download      | Name in `fonts/`   |
| ------------------------- | ------------------ |
| `IBMPlexMono-Regular.ttf` | `code-normal.ttf`  |
| `IBMPlexMono-Bold.ttf`    | `code-strong.ttf`  |
| `OFL.txt`                 | `code-license.txt` |

### 4. Write the files by weight

For a family with a variable font, write each file by weight from the variable file of its
style, with `build/instance-font.py`. The script needs the package fonttools, in a Python
environment of its own:

```shell
python3 -m venv .cache/fonttools
.cache/fonttools/bin/pip install fonttools==4.66.1
```

Give it the variable file, the file to write and the weight the tokens give the name. For
`text-strong` of a role whose `strong` is 600:

```shell
fonts=source/<brand>/docs/fonts
.cache/fonttools/bin/python build/instance-font.py $fonts/text.ttf $fonts/text-strong.ttf wght=600
.cache/fonttools/bin/python build/instance-font.py $fonts/text-italic.ttf $fonts/text-strong-italic.ttf wght=600
```

The script writes the font as it is at that weight, without an axis, and prints the names it
gave it: `Inter SemiBold Italic`, with the PostScript name `Inter-SemiBoldItalic`. The file
keeps every glyph, every character and every layout feature of the variable font. The same
command on the same file gives the same bytes.

An axis that is not named is fixed at its default. Name the optical size too, as
`wght=600 opsz=18`, when its default is not the cut the brand shows; take the value that
`axes` of `chassis.subset` fixes for the brand, where it fixes one. A size that the font has
a name for and leaves in its names is then a part of the family, as in a download by weight:
`DM Sans 18pt SemiBold`, with the PostScript name `DMSans18pt-SemiBold`.

The weight in the name of a file is the weight the tokens give the role, not a fixed one:
`display-normal` is the Medium of Archivo Narrow and the Regular of Source Serif 4.

On a Mac, the names inside a file say which font it is:

```shell
mdimport -t -d2 source/sinefil/docs/fonts/text-strong.ttf 2>&1 | grep -A 2 -E 'name_(family|postscript)'
```

### 5. Write the WOFF2 files

Write a `.woff2` beside each `.ttf`, with the WOFF2 encoder of Google as a package:

```shell
cd source/<brand>/docs/fonts
for f in <role>*.ttf; do
  pnpm --package=wawoff2@2.0.1 dlx woff2_compress.js "$f" "${f%.ttf}.woff2"
done
```

The conversion keeps every character, every layout feature and the axes of a variable font.
The same command on the same file gives the same bytes. Do not subset here, and fix no axis
of a variable file: a file of `source/` has every character of its family, and
`pnpm assets --subset` writes the smaller files of a build.

### 6. Write the stylesheet

`<role>.css` starts with a comment that names the family and the weights by role, and has one
`@font-face` rule per file it declares. For a family with a variable font, one rule per
variable file, with the range of weights the file holds:

```css
/* DM Sans, the "text" family of the Sinefil brand. */
/* A variable font: every weight from 100 to 1000, in one file per style. */
/* Weights by role: elegant 300, normal 400, strong 600, mass 700. */

@font-face {
  font-family: "DM Sans";
  font-style: normal;
  font-weight: 100 1000;
  font-display: swap;
  src: url("text.woff2") format("woff2");
}

@font-face {
  font-family: "DM Sans";
  font-style: italic;
  font-weight: 100 1000;
  font-display: swap;
  src: url("text-italic.woff2") format("woff2");
}
```

The range is the `wght` axis of the file; the page of the family on Google Fonts shows it.
For a family without a variable font, one rule per file by weight, with the weight of the
role:

```css
/* IBM Plex Mono, the "code" family of the Sinefil brand. */
/* The family has no variable font: one file per weight. */
/* Weights by role: normal 400, strong 700. */

@font-face {
  font-family: "IBM Plex Mono";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("code-normal.woff2") format("woff2");
}
```

### 7. Fill the app folder

Copy the files by weight, as `.ttf` and `.woff2`, and the license to
`source/<brand>/demo/fonts/`. Its `<role>.css` declares the files by weight, one rule per
file, also for a family that has a variable font.

### 8. Compare with the default brand

The two folders of a brand hold the names of the default brand:

```shell
diff <(command ls source/default/docs/fonts) <(command ls source/<brand>/docs/fonts)
diff <(command ls source/default/demo/fonts) <(command ls source/<brand>/demo/fonts)
```

`command ls` lists the names alone, also in a shell that has an alias for `ls`. The only
lines the first command may print are the variable files of a family that has none,
`code.ttf` and `code.woff2` for the `sinefil` brand. The second prints nothing.

### 9. Build and check

Run the checks of a change to `source/`:

```shell
pnpm assets:lint:source
pnpm assets && pnpm assets:verify
```

The lint opens each font that a stylesheet declares, and fails when the rule names another
family, weight or style than the file has: a file under the wrong role name, or a stylesheet
that was not written again with its fonts. The `.ttf` file of a declared `.woff2` file is
checked against the same rule, and the two against each other: the lint fails when they
differ in the family, the weight, the style, the axes, the version or the number of glyphs,
as they do when one of the two was not written again. It warns about a font of the default
brand that is left in the output of the brand and that no stylesheet of the brand declares;
the variable file of a family that has none is the one such file to expect.

Then check the output:

- The web output of the brand has the files of the default brand, name for name. This prints
  nothing:

  ```shell
  diff <(cd dist/web/docs/chassis && find . -type f | sort) <(cd dist/web/docs/<brand> && find . -type f | sort)
  ```

- The stylesheets load their fonts. Serve the web output with
  `python3 -m http.server --directory dist/web/docs`, link `<brand>/fonts/text.css`,
  `display.css` and `code.css` in a page, and set text in each family at the weights of the
  roles and in italic. Every face of `document.fonts` has the status `loaded`, and no request
  of a font fails.
- The fonts are Git LFS files. `git check-attr filter` on a new `.ttf` and `.woff2` answers
  `filter: lfs`.

### 10. Record the change

Add a changeset that names the files of `dist/` that are added, removed or renamed. A font
that changes its family changes the PostScript name an iOS app loads it by; say so in the
changeset. Update the table of [the families today](#the-families-today), and the pages of
the site where they name a file that changed.

## A new brand

A new brand takes the steps for each of its three roles, and two more:

- Add the name to `chassis.build.brands` of `package.json`.
- Add what else differs from the default brand, such as `images/logo/`, to
  `source/<brand>/<app>/`.
- Where a variable font of the brand has an axis that its pages are not to show, such as the
  optical size, add the brand and the value to `axes` of `chassis.subset` in `package.json`.
  A build with `--subset` fixes it.

The tokens of the brand are in chassis-tokens, and a site or an app builds with the brand of
the same name in both repositories.
