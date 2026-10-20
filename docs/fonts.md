# Preparing fonts

How the font files of a brand are made and placed in `source/`: for a new brand, a new family
of a role, or a new version of a family. The names and the formats are the rules of the
[fonts page](../packages/site/content/docs/asset-types/fonts.mdx); this document is the
procedure behind the files. Decision D24 of [decisions.md](decisions.md) has the
reasons.

The build copies fonts and converts nothing by default, so every file the output needs is a
file of `source/`, prepared once by hand. `build/instance-font.py` is the one script of the
procedure, and no part of the build.

## What a brand holds

Every brand holds all of its fonts, in `source/<brand>/<app>/fonts/`, and `source/default/`
holds none. The brands name their files by role and weight, so a page or an app that reads
`fonts/fonts.css` or `ui_normal.ttf` gets the font of the brand it was built for, with no
change to its code.

The web app, `source/<brand>/docs/fonts/`, holds for each role that has a family of its own:

| File                                                    | What it is                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `<role>.woff2`, `<role>-italic.woff2`                   | The variable font, when the family has one. Every weight in a file |
| `<role>-<weight>.woff2`, `<role>-<weight>-italic.woff2` | One file per weight of the role                                    |
| A `.ttf` beside each `.woff2`                           | The font as TrueType. The web output drops it                      |
| `<role>-license.txt`                                    | The license of the family                                          |

and one `fonts.css`, which declares every family of the brand: the variable files of a role,
or the files by weight of a family without one. A role that the tokens of the brand set in
the family of another role, as `prose` is set in `ui` for `chassis` and `display` in `prose`
for `sinefil`, has no files: the files of a family are under the role that owns it,
and the stylesheet declares the family once. Which roles have files so differs by brand (D31).

The files by weight of a family with a variable font are written from the variable file, by
step 4, or copied from its download where the license reserves the name of the family, so
every file of a role is one version of one design. The `.woff2` of a font is
written from the `.ttf` beside it, by step 5.

The iOS and Android app, `source/<brand>/demo/fonts/`, holds the files by weight only, as
`.ttf` and `.woff2`, with a `fonts.css` that declares the files by weight, and the licenses.
It has no variable file.

Three rules keep the brands in step:

- **A brand holds every font it ships.** No font is in `source/default/`, so a brand gets no
  font it does not hold, and the font of one brand never reaches the output of another
  (D33). A font put in `source/default/` would reach every brand that has no file of its
  name, and a brand that replaces half the files of a role would ship two families.
- **Same names, same extension.** The file of a role and a weight has one name in every
  brand. The app fonts are `.ttf` in every brand.
- **The stylesheet and the license go with the family.** Every brand has its own `fonts.css`,
  which declares every family of the brand, and a `<role>-license.txt` beside the files of
  each family.

The outputs of two brands so differ in the roles that have files and in the variable files:
a family without a variable font has no `<role>.woff2`, so the web output of `sinefil` has
no `code.woff2`, where that of `chassis` has one.

## The families today

The roles and the weights are those of the font tokens of Chassis Tokens,
`typography.fontFamily.<role>` and `typography.fontWeight.<role>.<weight>` in
`source/brand-<brand>/brand-base.json` of that repository. The table has the weight of each
file by weight, which is the weight of its token.

| Brand     | Role      | Family     | Variable           | elegant | normal | strong | mass |
| --------- | --------- | ---------- | ------------------ | ------- | ------ | ------ | ---- |
| `chassis` | `ui`      | Inter      | Upright and italic | 300     | 400    | 600    | 700  |
| `chassis` | `display` | Montserrat | Upright and italic | 300     | 400    | 600    | 700  |
| `chassis` | `code`    | Fira Code  | Upright            |         | 400    | 700    |      |
| `sinefil` | `ui`      | Geist      | Upright and italic | 300     | 400    | 600    | 700  |
| `sinefil` | `prose`   | Lora       | Upright and italic | 500     | 400    | 600    | 700  |
| `sinefil` | `code`    | Cousine    | None               |         | 400    | 700    |      |

Every role with files has an italic of every weight, except `code`. The `prose` role of
`chassis` is set in its `ui` family, and the `display` role of `sinefil` in its `prose`
family, so neither has files of its own. The `display` role of `sinefil` takes the Lora files
at elegant 400, normal 500, strong 600 and mass 700. Lora has no weight under 400, so the
`elegant` of its `prose` role is the Medium.

Where the files come from:

- Every family is licensed under the SIL Open Font License. The variable files are the
  downloads of [Google Fonts](https://fonts.google.com): Inter 4.001, placed here on
  2026-10-11, Montserrat 9.000 on 2026-10-15, and Geist 1.800 and Lora 3.008 on 2026-10-20,
  with the files by weight of Lora and of Cousine 1.241, which has no variable font. Fira
  Code is the one family from elsewhere, below.
- A variable font is whole in `source/`, with every axis of the download. Inter has an
  optical size axis, which a browser sets from the font size. A build with `--subset` fixes
  it at 14 for the `chassis` brand, by `axes` of `chassis.subset` in `package.json`. Geist and
  Lora have a weight axis only. Decision D25.
- The files by weight of `chassis` are written from their variable files, by step 4
  with fonttools 4.66.1, on 2026-10-11, each at the weight of its role, those of Montserrat
  on 2026-10-15, and those of Geist on 2026-10-20. Decision D28.
- The files by weight of `chassis` are at the default of every other axis. For Inter
  that is the optical size 14, the cut that `--subset` fixes for the web, so a page and an
  app show the same cut. An iOS app loads the files as `Inter-Regular`,
  `Montserrat-Regular` and `FiraCode-Bold`.
- The files by weight of Lora are the files in `static/` of its download, copied under the
  names of their roles, since its license reserves the name "Lora" (D32). An iOS app loads
  the fonts of `sinefil` as `Geist-Regular`, `Lora-Regular` and `Cousine-Bold`.
- The variable file of the `code` role of `chassis` is `variable_ttf/FiraCode-VF.ttf` of
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
font gives its variable files and its license. For the `ui` role of the `sinefil` brand:

| File of the download                 | Name in `fonts/` |
| ------------------------------------ | ---------------- |
| `Geist-VariableFont_wght.ttf`        | `ui.ttf`         |
| `Geist-Italic-VariableFont_wght.ttf` | `ui-italic.ttf`  |
| `OFL.txt`                            | `ui-license.txt` |

A family without a variable font gives its files by weight, each under the name of the weight
the tokens give it. For the `code` role of the `sinefil` brand:

| File of the download  | Name in `fonts/`   |
| --------------------- | ------------------ |
| `Cousine-Regular.ttf` | `code-normal.ttf`  |
| `Cousine-Bold.ttf`    | `code-strong.ttf`  |
| `OFL.txt`             | `code-license.txt` |

A family whose license reserves its name, as the first line of `OFL.txt` of Lora says with
`Reserved Font Name "Lora"`, gives its variable files and its files by weight from
`static/`, and skips step 4: a file that step 4 writes is a modified version of the font,
which the license does not let carry the name (D32). Check that the files of `static/` have
the version of the variable files. For the `prose` role of the `sinefil` brand, whose
`elegant` is 500:

| File of the download | Name in `fonts/`    |
| -------------------- | ------------------- |
| `Lora-Regular.ttf`   | `prose-normal.ttf`  |
| `Lora-Medium.ttf`    | `prose-elegant.ttf` |
| `Lora-SemiBold.ttf`  | `prose-strong.ttf`  |
| `Lora-Bold.ttf`      | `prose-mass.ttf`    |

and each italic beside it, as `Lora-MediumItalic.ttf` to `prose-elegant-italic.ttf`, and
`Lora-Italic.ttf` to `prose-normal-italic.ttf`.

### 4. Write the files by weight

For a family with a variable font and no reserved name, write each file by weight from the
variable file of its style, with `build/instance-font.py`. The script needs the package fonttools, in a Python
environment of its own:

```shell
python3 -m venv .cache/fonttools
.cache/fonttools/bin/pip install fonttools==4.66.1
```

Give it the variable file, the file to write and the weight the tokens give the name. For
`ui-strong` of a role whose `strong` is 600:

```shell
fonts=source/<brand>/docs/fonts
.cache/fonttools/bin/python build/instance-font.py $fonts/ui.ttf $fonts/ui-strong.ttf wght=600
.cache/fonttools/bin/python build/instance-font.py $fonts/ui-italic.ttf $fonts/ui-strong-italic.ttf wght=600
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

The weight in the name of a file is the weight the tokens give the role, not a fixed one: a
brand whose tokens give `normal` 500 has the Medium of its family in `display-normal`.

On a Mac, the names inside a file say which font it is:

```shell
mdimport -t -d2 source/sinefil/docs/fonts/ui-strong.ttf 2>&1 | grep -A 2 -E 'name_(family|postscript)'
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

`fonts.css` is one file per brand. It starts with a comment that names the brand and the
roles without files, and has a block per role with a family of its own. A block starts with
a comment that names the family and the weights by role, and has one `@font-face` rule per
file it declares. A brand that changes one family writes its block again, and keeps the
blocks of its other families. For a family with a variable font, one rule per variable file, with the range of weights the file holds:

```css
/* Geist, the "ui" family of the Sinefil brand. */
/* A variable font: every weight from 100 to 900, in one file per style. */
/* Weights by role: elegant 300, normal 400, strong 600, mass 700. */

@font-face {
  font-family: "Geist";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("ui.woff2") format("woff2");
}

@font-face {
  font-family: "Geist";
  font-style: italic;
  font-weight: 100 900;
  font-display: swap;
  src: url("ui-italic.woff2") format("woff2");
}
```

The range is the `wght` axis of the file; the page of the family on Google Fonts shows it.
For a family without a variable font, one rule per file by weight, with the weight of the
role:

```css
/* Cousine, the "code" family of the Sinefil brand. */
/* The family has no variable font: one file per weight. */
/* Weights by role: normal 400, strong 700. */

@font-face {
  font-family: "Cousine";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("code-normal.woff2") format("woff2");
}
```

### 7. Fill the app folder

Copy the files by weight, as `.ttf` and `.woff2`, and the license to
`source/<brand>/demo/fonts/`. Its `fonts.css` declares the files by weight, one rule per
file, also for a family that has a variable font.

### 8. Compare with another brand

The two folders of a brand hold the names of the other brands:

```shell
diff <(command ls source/chassis/docs/fonts) <(command ls source/<brand>/docs/fonts)
diff <(command ls source/chassis/demo/fonts) <(command ls source/<brand>/demo/fonts)
```

`command ls` lists the names alone, also in a shell that has an alias for `ls`. The commands
print the files of a role that one of the two brands sets in the family of another role,
and the variable files of a family that has none. For the `sinefil` brand, the first prints
`code.ttf`, `code.woff2` and the files of `display` of `chassis`, and the files of `prose`
of `sinefil`; the second prints the files of `display` and of `prose`.

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
as they do when one of the two was not written again. It warns about a font of
`source/default/` that is left in the output of a brand and that no stylesheet of the brand
declares, which this repository, with no font there, does not have.

Then check the output:

- The web output of the brand has the font names of its source, without the `.ttf` files.
  Against `chassis`, this prints what the comparison of step 8 printed for `docs`, less the
  `.ttf` files:

  ```shell
  diff <(command ls dist/web/docs/chassis/fonts) <(command ls dist/web/docs/<brand>/fonts)
  ```

- The stylesheets load their fonts. Serve the web output with
  `python3 -m http.server --directory dist/web/docs`, link `<brand>/fonts/fonts.css` in a
  page, and set text in each family at the weights of the roles and in italic. Every face of `document.fonts` has the status `loaded`, and no request
  of a font fails.
- The fonts are Git LFS files. `git check-attr filter` on a new `.ttf` and `.woff2` answers
  `filter: lfs`.

### 10. Record the change

Add a changeset that names the files of `dist/` that are added, removed or renamed. A font
that changes its family changes the PostScript name an iOS app loads it by; say so in the
changeset. Update the table of [the families today](#the-families-today), and the pages of
the site where they name a file that changed.

## A new brand

A new brand takes the steps for each role that has files, since a brand holds every font it
ships, and two more:

- Add the name to `chassis.build.brands` of `package.json`.
- Add the other files of the brand, such as its logos and favicons under `images/`, to
  `source/<brand>/<app>/`.
- Where a variable font of the brand has an axis that its pages are not to show, such as the
  optical size, add the brand and the value to `axes` of `chassis.subset` in `package.json`.
  A build with `--subset` fixes it.

The tokens of the brand are in chassis-tokens, and a site or an app builds with the brand of
the same name in both repositories.
