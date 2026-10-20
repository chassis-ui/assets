# Changelog

## 0.4.1

### Patch Changes

- The `sinefil` brand gets what its site needs to drop its own copies: `images/favicon.svg`, `images/favicon.ico`, `images/android-chrome-maskable-512x512.png` and `other/manifest.json` are added to `dist/web/docs/sinefil/`. `chassis.checks.json` lists the files that sinefil.org reads by name, under `web/docs/sinefil`.

## 0.4.0

### Minor Changes

- **Breaking.** `source/chassis/` holds the files of the `chassis` brand, its fonts, logos,
  favicons and tokens export, and `source/default/` the files every brand shares. Decision D33.
  A brand so gets no file of another brand. In the output:

  - The logos are 8 files per brand and app, `logo-black`, `logo-dark`, `logo-light` and
    `logo-white`, each as PNG and SVG: `images/logo/logo-<color>.{png,svg}` in
    `dist/web/docs/<brand>/`, `images/logo/logo_<color>.{png,svg}` in
    `dist/ios/demo/<brand>/`, and `images/logo/drawable/logo_<color>.{png,svg}` in
    `dist/android/demo/<brand>/`. They replace the 48 logos
    `chassis-{logo,icon}-{black,brand,white}` with their `-banner` forms and their `@2x` and
    `@3x` files, which are removed on every platform: on the web
    `images/logo/chassis-logo-brand.svg`, `chassis-icon-white-banner@2x.png` and the others, on
    iOS `chassis_logo_brand.svg` and the others, and on Android the same names in the density
    folders of `images/logo/`. `sinefil` had 16 of them and has its own 8.
  - `dist/web/docs/<brand>/icons/` holds `cx-sprite.svg` only: `icons/icons/`, the icon font
    and its stylesheets, and `icons/svgs/`, the 503 SVG icons, are removed from the web output.
    A page takes them from `@chassis-ui/icons`, as the Chassis sites do. The iOS and Android
    output keeps them.
  - The top of `images/` of `dist/ios/demo/<brand>/` and `dist/android/demo/<brand>/` loses
    the favicons, `android_chrome_192x192.png`, `android_chrome_512x512.png`,
    `apple_touch_icon.png`, `safari_pinned_tab.png`, `chassis_logo.svg`,
    `chassis_logo_black.svg`, `chassis_logo_white.svg`, `chassis_logo_shadow.png` and its `@2x`
    file, and `chassis_social.png`.
  - `other/default-tokens.json` of `dist/web/docs/chassis/` is `other/example-tokens.json`,
    with the same content, and `dist/web/docs/sinefil/` has none.
  - The output of `sinefil` has no font of the default brand: `fonts/code.woff2` and the 10
    `display` fonts with `display-license.txt` are removed from `dist/web/docs/sinefil/`, and
    the 8 `display_<weight>.ttf` files with `display_license.txt` from
    `dist/ios/demo/sinefil/fonts/` and `dist/android/demo/sinefil/fonts/`. A page of `sinefil`
    sets its headings in Lora through `fonts.css`.
  - `site-logo.svg`, the favicons, `apple-touch-icon.png`, `android-chrome-192x192.png`,
    `android-chrome-512x512.png`, `safari-pinned-tab.png` and `social-image.png` of
    `dist/web/docs/sinefil/images/` are those of `sinefil`, where they were those of `chassis`.

  The about page of the website shows and links
  `images/logo/chassis-{logo,icon}-{brand,white}-banner.svg`, which are gone until it reads the
  new names.

- **Breaking.** The `text` font role is `ui`, and a brand has one font stylesheet, `fonts.css`, in place of one per role, after Chassis Tokens 0.10 renamed the family `text` to `ui` and added `prose`, which the `chassis` brand sets in its `ui` family and `sinefil` in its `display` family. In `dist/web/docs/<brand>/fonts/`, `text.css`, `display.css` and `code.css` are removed and `fonts.css` is added, with the `@font-face` rules of the three; `text.woff2`, `text-italic.woff2`, `text-<weight>.woff2`, `text-<weight>-italic.woff2` and `text-license.txt` are `ui.woff2`, `ui-italic.woff2`, `ui-<weight>.woff2`, `ui-<weight>-italic.woff2` and `ui-license.txt`. In `dist/ios/demo/<brand>/fonts/` and `dist/android/demo/<brand>/fonts/`, `text_<weight>.ttf`, `text_<weight>_italic.ttf` and `text_license.txt` are `ui_<weight>.ttf`, `ui_<weight>_italic.ttf` and `ui_license.txt`. The fonts inside the files, and their PostScript names, do not change. A page links `fonts/fonts.css` in place of the three stylesheets; `@chassis-ui/docs` 0.8 and 0.9 link the three. No brand has a `prose` file: a role set in the family of another role has no files of its own. Decision D31.

### Patch Changes

- The `docs` app has the new Chassis logo, favicons and social image. No file of `dist/` is
  added, removed or renamed.

  Changed: `site-logo.svg`, `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`,
  `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`,
  `safari-pinned-tab.png` and `social-image.png` in `images/` of `dist/web/docs/chassis/` and
  `dist/web/docs/sinefil/`. `site-logo.svg` is 448 by 96 where it was 324 by 84. It is for
  inline use: it has no `xmlns`, and its paths take their color from the classes
  `icon-default` and `icon-primary` of the page, where they were filled `#00A4CC`. Insert the
  markup of the file into the page, where it was loaded with `<img>`.

- `icons/cx-sprite.svg` of `dist/web/docs/chassis/` and `dist/web/docs/sinefil/` has a new
  symbol, `cx-react`, and the paths of its other symbols are written again with fewer decimals,
  taken from `feat/new-chassis-brand`. Every symbol keeps its id and its `viewBox`. No file of
  `dist/` is added, removed or renamed.
- The `display` font of the `chassis` brand is Montserrat 9.000, where it was Archivo Narrow
  3.002, at the weights elegant 300, normal 400, strong 600 and mass 700, where Archivo Narrow
  had 400, 500, 600 and 700. No file of `dist/` is added, removed or renamed by this change.

  Changed: `display.woff2`, `display-italic.woff2`, the rules of `display` in `fonts.css` and
  the 16 files by weight of `display` in `fonts/` of `dist/web/docs/chassis/`, the 16 files by
  weight as `.ttf` in `dist/ios/demo/chassis/fonts/` and `dist/android/demo/chassis/fonts/`, and
  `display-license.txt` beside them. The variable font has every weight from 100 to 900, where
  it had 400 to 700.

  The PostScript names of the app fonts change with the family: `display_normal.ttf` is
  `Montserrat-Regular` where it was `ArchivoNarrow-Medium`, and `display_strong_italic.ttf` is
  `Montserrat-SemiBoldItalic`. An app that names a font in its code, and does not read the name
  from the file, changes that name.

- The fonts of the `sinefil` brand are Geist 1.800 for `ui`, Lora 3.008 for `prose` and
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

## 0.3.1

### Patch Changes

- Two settings in the `chassis` block of `package.json`, both optional. `ignore` lists names of files and folders that the build leaves out beside its own list, such as `["*.bak", "drafts"]`. `formats` names, for a platform and a type folder, the extensions the platform keeps in place of its rule, such as `{ "web": { "fonts": [".woff2", ".ttf", ".css", ".txt"] } }`. The checks read both. No file of `dist/` changes for a configuration without the two keys.
- `--subset` knows the range `symbols2`: the box drawing and the block characters, `U+2500-259F`, with the code points that Google Fonts gives the name. A site with a file tree in a code block builds with `--subset latin latin-ext symbols2`, and with `--split` the file of the range is `fonts/code-symbols2.woff2`. No file of the default build changes, and a build that names the range as `U+2500-257F` writes `fonts/code-u2500-257f.woff2` as before.

## 0.3.0

### Minor Changes

- **Breaking.** The `example` brand is replaced by the `sinefil` brand, the app fonts of the
  default brand are TTF files, and the web fonts have a variable file per role.

  Removed: `dist/web/docs/example/`, `dist/ios/demo/example/` and `dist/android/demo/example/`.
  The brand of `chassis.build.brands` is `sinefil`, with `dist/web/docs/sinefil/`,
  `dist/ios/demo/sinefil/` and `dist/android/demo/sinefil/` in their place.

  Renamed, in `fonts/` of `dist/ios/demo/<brand>/` and `dist/android/demo/<brand>/`: the 16
  files `text_<weight>.otf`, `text_<weight>_italic.otf`, `display_<weight>.otf` and
  `display_<weight>_italic.otf` are `.ttf` files, `text_normal.otf` to `text_normal.ttf`. Every
  brand has its app fonts as TTF, so that a brand file replaces the default file of the same
  name.

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

- `--subset` fixes the axes of a variable font that `axes` of `chassis.subset` names for a
  brand, such as `"axes": { "chassis": { "opsz": 14 } }`. A font of the web output of the brand
  that has the axis is written without it, as the font it is at that value. A font without the
  axis, and every font of another brand, is subsetted as before. A value outside the axis of a
  font fails the build, and an axis that no font of the brand has is a warning.

  Changed, in a build with `--subset` only: `text.woff2` and `text-italic.woff2` of
  `dist/web/docs/chassis/fonts/` have the optical size of Inter fixed at 14 and hold the weight
  axis only. They are 136 KB and 146 KB where they were 208 KB and 230 KB. With the axis, a
  browser draws text above 14 pixels in the display cut of Inter, 7% narrower at 57 pixels.

  No file is added, removed or renamed, and the default build writes what it wrote.

- `--split` writes a font in a file per range. A build with `--subset` and `--split` writes
  each WOFF and WOFF2 font that a stylesheet of `fonts/` declares once per range too, beside
  itself, and the `@font-face` rule of the stylesheet once per range, with its `unicode-range`.
  A browser downloads the file of a range only for a page that has a character of it.
  `split` of `chassis.subset`, `true` or `false`, is the choice of a repository, and `--split`
  and `--no-split` win over it.

  Added to `fonts/` of a web job, with the split only: `<name>-<range>.<extension>` for each
  declared font and each range it has a character of, such as `text-latin.woff2` and
  `text-latin-ext.woff2`, and `code-u2500-257f.woff2` for the range `U+2500-257F`.

  Changed, with the split only: the stylesheets of `fonts/` that declare a font of the folder.

  No file is removed or renamed: the font itself stays, with every range. Without the split,
  and without `--subset`, a build writes what it wrote.

### Patch Changes

- `table/{light,dark}/table-row-type-data.png` and `table-row-type-data@2x.png`
  are removed from `source/`, and so from `images/figma/components/` of
  `dist/web/docs/<brand>/`. No page of chassis-figma names them.

  Added, in the light and the dark mode, with their `@2x` files:

  - `list/{light,dark}/list-item-text-input-active.png`, which the list variants page names.
  - `table/{light,dark}/table-row-type-odd.png`, which the table variants page names.

  Changed: `list/light/list-item-text-input-inactive.png` and
  `table/dark/table-row-type-edit.png`, with their `@2x` files.

- The files by weight of a family with a variable font are written from it, in both brands, so
  every file of a role is one version of one design. No file of `dist/` is added, removed or
  renamed.

  Changed: the 18 files by weight of the `chassis` brand and the 16 of `text` and `display` of
  the `sinefil` brand, in `fonts/` of `dist/web/docs/<brand>/` as `.woff2`, and of
  `dist/ios/demo/<brand>/` and `dist/android/demo/<brand>/` as `.ttf`, and `code.woff2` in
  `fonts/` of `dist/web/docs/chassis/` and `dist/web/docs/sinefil/`.

  The `chassis` brand:

  - `text`: Inter 4.001 at the optical size 14 in every file, the cut that `--subset` fixes in
    the variable font of the web. The PostScript names of the app fonts are `Inter-Regular`,
    `Inter-SemiBoldItalic` and so on.
  - `display`: Archivo Narrow 3.002 with the outlines it had. The `.woff2` files are written
    from the `.ttf` files and are 24 KB where they were 34 KB.
  - `code`: Fira Code 6.002 in every file. The variable `code.woff2` is the variable font of
    the 6.2 release of the family, where it was the 5.002 of Google Fonts: it has 35 characters
    more and the features `cv01` to `cv32`, `ss09` and `ss10`, its advance is 0.615 em where it
    was 0.600, and its line is 1.23 em where it was 1.31, as the files by weight have them.
    `code-strong` is the Bold, 700, where it was the SemiBold, 600, and its PostScript name is
    `FiraCode-Bold`. The files by weight have every character, every feature and the metrics
    of the files by weight of the release, and no hinting instructions.

  The `sinefil` brand: DM Sans and Source Serif 4 have the outlines they had, point for point,
  DM Sans in its cut of 18 and Source Serif 4 in its cut of 14. The files of Source Serif 4 name
  that cut, which the files of the download did not: the family in a file is
  `Source Serif 4 14pt`, and the PostScript name of `display_normal.ttf` is
  `SourceSerif414pt-Regular` where it was `SourceSerif4-Regular`. The names of DM Sans are
  those they were, `DMSans18pt-Regular`.

  `build/instance-font.py` writes such a file, and `docs/fonts.md` has the step.

- `pnpm assets:lint:source` checks the fonts that an app gets. A `@font-face` rule declares a
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

- `pnpm assets:lint:source` reads the fonts. For each `@font-face` rule of a stylesheet in
  `fonts/`, it opens the file the rule declares, as a brand gets it, and fails when the file is
  of another family than the rule names, has another weight or a weight axis that does not hold
  the range of the rule, is an italic that the rule declares as normal or the other way round,
  or is not in the folder. It warns about a font of the default brand that a brand gets and
  that no stylesheet of the brand declares.

  The lint needs no package, and reads TrueType, OpenType, WOFF and WOFF2 fonts. A build writes
  what it wrote: no file of `dist/` is added, removed or renamed.

## 0.2.0

### Minor Changes

- The Android output gets WebP images.

  - A `.webp` file under `images/` of an app is copied to `dist/android/<app>/<brand>/images/`,
    in the density folder of its indicator, as every other image is. It was left out. iOS
    still does not get WebP.
  - No file of the output of this repository changes: the app that is built for Android has
    no WebP image.

- `pnpm assets --asset-catalog` writes the images of iOS as an asset catalog.

  - With the option, the files under `images/` of an iOS job move into
    `dist/ios/<app>/<brand>/Assets.xcassets/`, the files of one base name into one image set
    with its `Contents.json`: `images/chassis_logo_shadow.png` and
    `images/chassis_logo_shadow@2x.png` become
    `Assets.xcassets/chassis_logo_shadow.imageset/`. An SVG or a PDF without a raster of its
    name is an image set of one file that keeps its vector data, and a subfolder is a folder
    of the catalog that provides a namespace, `Assets.xcassets/logo/`.
  - A file without a place in an image set stays in `images/`, with a warning per job: an SVG
    beside PNG variants of its name, a variant other than `@1x`, `@2x` and `@3x`, and any
    format but PNG, JPEG, SVG and PDF. In this repository these are the twelve SVG logos of
    `images/logo/`.
  - The option is off by default, and no file of the default output changes. It needs nothing
    installed. The release archives are built without it.
  - `generateAssets()` and `ChassisAssets.build()` take `assetCatalog`, the statistics have
    `imageSets`, and a processor names its catalog in `assetCatalog`.
  - `pnpm assets:validate` passes on an output that was built with the option, and
    `pnpm test:ios` compiles the catalogs of an output with `actool`.

- New options of the build and a library that a script can import.

  - `--out <dir>`, `--cwd <dir>`, `--dry-run`, `--allow-lfs-pointers`, `--quiet`, `--help`
    and `--version`. The analyzer and the validator take `--out` and `--cwd`.
  - `generateAssets(options)` takes `brands`, `apps`, `platforms`, `clean`, `quiet`, `cwd`,
    `out`, `dryRun` and `allowLfsPointers`, and `ChassisAssets.build()` passes its filters on.
    The library no longer reads the command line or exits the process; the command-line
    entry does.
  - PNG files under `icons/` are kept for iOS.

- **Breaking.** The build names no brand, app or file of this repository, so a team that
  adopts it changes `source/`, the root `package.json` and `chassis.checks.json` only.

  - `chassis.checks.json`, beside `package.json`, holds what the checks verify. It is
    optional and the build does not read it.
  - Its `contracts` list, for a job `<platform>/<app>/<brand>`, the files a consumer reads,
    each entry with `reader`, `files` and `sets`. `pnpm assets:contract` checks the output of
    every job that has one, and passes when there is none, so `pnpm assets:verify` no longer
    fails in a repository without `dist/web/docs/chassis/`. `CONTRACT`, `CONTRACT_JOB`,
    `checkContract()` and `printContract()` of `contract.js` are gone; `checkContracts()` and
    `printContracts()` take their place, and `missingFromContract(paths, entries)` takes the
    entries.
  - Its `lint.allow` lists the names the source lint keeps, each with `pattern` and `reason`.
    `KNOWN_ODDITIES` of `lint-source.js` is gone.
  - The root scripts run the packages by folder, `pnpm -C packages/assets`, not by name.
  - The archives of a release start with the name of the root `package.json` without
    `-workspace`, or with `--prefix`. `pnpm changeset:version` no longer fails when the
    README has no version badge.

- New checks of the source and of the output.

  - `pnpm assets:verify`: the validator, then the consumer contract, the files the Chassis
    sites read from `dist/web/docs/chassis/`. `pnpm assets:contract` runs the contract check
    alone.
  - `pnpm assets:lint:source`: the names and the layout of `source/` against the naming
    conventions of the design-guidelines page, and Git LFS pointers.
  - `pnpm assets:typecheck`: TypeScript checks `packages/assets/build/` against its JSDoc,
    with the shared types in `types.js`.
  - The tests run with Vitest on a fixture in `packages/assets/test/fixtures/` and compare a
    build of it with `test/golden/`. They need no Git LFS files and never write to `dist/`.
    `pnpm test:golden` writes the baseline again. The scripts `assets:test:build`,
    `assets:test:analyze` and `assets:test:api` are gone; `assets:test` runs `pnpm test`.

- `pnpm assets --type` and `--include` build a part of a job, and `pnpm assets:lfs` prints the
  Git LFS paths of that part.

  - `--type <name...>` builds only the type folders it names, such as `images` and `icons`.
    `--include <pattern...>` builds only the files that match a pattern, by their path in the
    folder of the app in `source/`: `"images/home/**"`, `"images/*"`, `icons/cx-sprite.svg`,
    with `*`, `**` and `{a,b}`. The files are written where a full build writes them, with
    the same names, and the rest of `dist/` is kept.
  - A file the filters leave out is not read, so a Git LFS pointer among them does not fail
    the build. Filters that match no file fail the build.
  - `pnpm assets:lfs` takes the filters of the build and prints the paths of `source/` it
    reads, separated by commas, for `git lfs pull --include`. It needs nothing installed.
  - Without the options no file of the output changes, and `pnpm assets:site` is as it was:
    it passes the options on, `pnpm assets:site --include "images/home/**"`.
  - `generateAssets()` and `ChassisAssets.build()` take `types` and `include`, and
    `lfsInclude(options)` of `lfs-include.js` returns the paths.

- The font stylesheets of the default brand declare the font files that are in the folder,
  and the licenses of the fonts are in the output.

  - `fonts/text.css` and `fonts/code.css` of `dist/web/docs/<brand>/` have one `@font-face`
    per file of the folder, instead of rules for Inter and Fira Code files that were not
    there.
  - `fonts/display.css` is new: the `@font-face` rules of the display family.
  - `fonts/text-license.txt`, `fonts/display-license.txt` and `fonts/code-license.txt` are
    new in the `fonts/` folder of every platform, app and brand that has the fonts. The font
    filters of the three platforms keep `.txt`.

- `pnpm assets --subset [range...]`, with its ranges in `chassis.subset`.

  - `--subset` writes each WOFF and WOFF2 font under `fonts/` of a web job again under its own
    name, with the characters of a list of Unicode ranges only. No file of `dist/` is added,
    removed or renamed, and the stylesheets of `fonts/` are untouched.
  - A range is a name, `latin`, `latin-ext`, `cyrillic`, `cyrillic-ext`, `greek`, `greek-ext`,
    `vietnamese`, `math` or `symbols`, or a range of code points such as `U+0370-03FF`. The values of the option
    win over `ranges` of `chassis.subset` of `package.json`, and without either the build
    keeps `latin` and `latin-ext`. The block is optional and turns nothing on.
  - A font keeps its format, its layout features and the license entries of its `name` table.
    A font that would not get smaller stays as it was copied, and so does a font without a
    character of the ranges, with a warning.
  - The TTF and OTF fonts of iOS and Android and the icon font of `icons/` are not read.
  - The option is off by default, and no file of the default output changes. It uses the
    package `subset-font`, which the build loads only with the option and which
    `pnpm install` brings. Without it the build stops before it removes anything and names
    the install as the fix.
  - The release archives are built without the option.
  - `generateAssets()` and `ChassisAssets.build()` take `subset`, true or a list of ranges,
    the statistics have `fontsSubsetted` and `fontBytesSaved`, and a processor names the fonts
    it subsets in `subset`.

- **Breaking.** The icons of the default brand are `@chassis-ui/icons` 0.3.1. The copy in
  `source/default/docs/icons/` and `source/default/demo/icons/` was the output of 0.1.0.

  - The classes of the icon font are `cx-<name>`, in a `content` layer, where they were
    `icon-<name>`: `icons/icons/chassis-icons.css`, `chassis-icons-min.css` and
    `chassis-icons.scss` of the web output. The font files, `chassis-icons.svg` and
    `chassis-icons.json` change with them.
  - 15 icons are new under `icons/svgs/` of every platform, app and brand: `css-brand`,
    `cut-outline`, `cut-solid`, `envelope-open-outline`, `envelope-open-solid`,
    `envelope-outline`, `envelope-solid`, `figma-brand`, `figma-square-brand`,
    `hashtag-outline`, `hashtag-solid`, `js-brand`, `mdn-brand`, `sass-alt-brand` and
    `sass-brand`.
  - The 488 icons that were there keep their names and their drawing. The class on the
    `<svg>` element is `cx-<name>`, where it was `icon-<name>`.
  - `icons/icons/preview.html` is gone from the web output: the package does not ship it.

- `pnpm assets --optimize`, `--webp` and `--avif`, with their settings in `chassis.optimize`.

  - `--optimize` writes each image under `images/` again under its own name, when that makes
    the file smaller. Without settings no visible pixel changes: a PNG is compressed again,
    an SVG loses its comments and metadata and keeps its shapes and its ids, a JPEG is left
    as it is. No file of `dist/` is added, removed or renamed.
  - `--webp` writes each PNG and JPEG image as WebP too. On the web the file is added beside
    the image, `dist/web/<app>/<brand>/images/hero.webp` beside `hero.png`. On Android it
    takes the place of the image when it is smaller,
    `dist/android/<app>/<brand>/images/drawable/hero.webp` for `hero.png`. iOS gets none.
  - `--avif` adds `hero.avif` beside each PNG and JPEG image of the web.
  - A WebP or AVIF file of `source/` is kept over the one the build would write.
  - `chassis.optimize` of `package.json` holds the settings: `types`, `png.quality`,
    `jpeg.quality`, `svg.precision`, and `quality` and `lossless` of `webp` and `avif`. The
    block is optional and turns nothing on.
  - The three options are off by default, and no file of the default output changes. They use
    the packages `sharp` and `svgo`, which the build loads only with an option and which
    `pnpm install` brings. Without them the build stops before it removes anything and names
    the install as the fix.
  - The release archives are built with `--optimize`, and without `--webp` and `--avif`: an
    archive has the names of a default build, and its PNG and SVG images are smaller.
  - `generateAssets()` and `ChassisAssets.build()` take `optimize`, `webp` and `avif`, the
    statistics have `filesOptimized`, `bytesSaved` and `filesGenerated`, and a processor names
    its second formats in `imageFormats`.
  - `pnpm assets:validate` passes on an output that was built with the options.
  - Fixed: a build started through a linked folder, or from a path with a space, did nothing
    and exited with 0.

- **Breaking.** 28 Figma screenshots that no page reads are removed from `source/`, and so
  from `images/figma/components/` of `dist/web/docs/<brand>/`:

  - `badge/{light,dark}/group.png` and `group@2x.png`.
  - `button-solid/{light,dark}/meta-1.png`, `meta-1@2x.png` and their ten Figma export
    copies, `meta-1-1.png` to `meta-1-5.png` and `meta-1-2x-1.png` to `meta-1-2x-5.png`.

- `pnpm assets --res` writes the fonts, images and icons of Android as a `res/` folder.

  - With the option, the files of an Android job that the `res/` folder of an app takes move
    into `dist/android/<app>/<brand>/res/`, without the subfolders they had: a TTF or OTF
    font to `res/font/`, a PNG, WebP, JPEG or GIF image to the folder named as its density
    folder, `images/logo/drawable-xhdpi/chassis_logo_brand.png` to
    `res/drawable-xhdpi/chassis_logo_brand.png`, and, with `--vector-drawables`, an icon to
    `res/drawable/ic_arrow_right_solid.xml`.
  - A file without a place in `res/` stays where it is, with a warning per job: the font
    licenses, every SVG file, a second file of one name, and a name that cannot be a
    resource. When two folders hold an image of one name, the folder nearest to `images/`
    gets the resource.
  - The option is off by default, and no file of the default output changes. It needs nothing
    installed. The release archives are built without it.
  - `generateAssets()` and `ChassisAssets.build()` take `res`, the statistics have
    `resourceFiles`, and a processor names its folders and formats in `res`.
  - `pnpm assets:validate` passes on an output that was built with the option.

- **Breaking.** The build fails where it used to build nothing or the wrong thing, and
  `--clean` with filters removes less.

  - `--clean` with `--brand`, `--app` or `--platform` removes the output of the selected jobs
    only. It removed `dist/` whole, so `pnpm assets:site` deleted the iOS and Android output
    of an earlier build. A full build without filters removes `dist/` whole, as before.
  - A filter value that is not configured, or filters that select no job, fail the build and
    name the configured values. They built nothing and exited 0.
  - A source file that is a Git LFS pointer fails the build with the list of files, unless
    `--allow-lfs-pointers` or `CHASSIS_ALLOW_LFS_POINTERS=1` is given.
  - The validator exits with 1 when a check fails, and prints each result once.

- `pnpm assets --vector-drawables` writes the SVG icons of Android as vector drawables.

  - With the option, each SVG file under `icons/` of an Android job is written as a vector
    drawable in the same folder under the same name, `.xml` in place of `.svg`:
    `dist/android/<app>/<brand>/icons/svgs/ic_arrow_right_solid.xml`. A path without a fill
    color is filled black, for a tint to replace. An SVG without a shape stays an SVG, with a
    warning: `icons/icons/ic_chassis_icons.svg` of this repository.
  - The option is off by default, and no file of the default output changes. The release
    archives are built without it.
  - The conversion uses the package `svg2vectordrawable`, which the build loads only with the
    option. It is installed by `pnpm install`; the default build still needs nothing installed.
  - `generateAssets()` and `ChassisAssets.build()` take `vectorDrawables`, the statistics have
    `filesConverted`, and a processor names what it converts in `vectorDrawables`.
  - `pnpm assets:validate` passes on an output that was built with the option.

- `pnpm assets --watch` builds, then builds again when a file under `source/` changes.

  - A change builds the jobs it belongs to: a file of a brand builds the jobs of that brand
    and its app, a file of the default brand builds the jobs of its app for every brand. The
    filters of the command select the jobs that are watched.
  - A job is built whole, into a folder that is removed first, so a file that is removed from
    `source/` is gone from the output. Every other option applies to each build.
  - Changes that come together are one build. A build that fails prints its error and the
    watch goes on. It needs nothing installed.
  - Without the option the build is as it was, and no file of the output changes.
  - `watchAssets(options, events)` of `watch.js` is the same for a script.

- **Breaking.** The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.

  - `source/`, `dist/`, the `chassis` block of the root `package.json` and every
    `pnpm assets*` command stay where they were, and the output is the same file for file.
  - `packages/assets/build/cli.js` is one entry for the build and its checks: `build`,
    `analyze`, `validate`, `contract`, `verify` and `lint-source`. The `pnpm assets*` scripts
    run it with `node`, so the build works with nothing installed.
  - `pnpm install --ignore-workspace` at the root, which a site runs before
    `pnpm assets:site`, installs the lint and release tools of the root only. The build uses
    none of them.
  - The repository root is found from the working directory upward, as the nearest folder
    whose `package.json` has a `chassis` block, so the commands work from any folder of the
    repository. `--cwd` names it instead.
  - The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
    whatever `--cwd` is. The root `package.json` is private and has no version, no
    `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.

### Patch Changes

- The build warns about every name collision, and counts each output file once.

  - Two source files that get the same name in a folder of the output give a
    `Filename collision` warning, whether the build renamed both, one or neither of them. Examples are
    `MyIcon.png` beside `my-icon.png`, and, on Android, `poster.png` beside `poster@2x.png`
    in a folder that is not `images/`. The build warned only when both files were renamed. The
    file copied last still wins, so the output does not change.
  - `pnpm assets --dry-run`, the summary of a build and `jobs` of the result count a file
    that a brand overrides once. They counted the default file and the brand file.
  - `pnpm assets:validate` leaves hidden files, such as `.DS_Store`, out of its count of
    platform folders.
  - A processor that places images itself with `processImage()` can say where with
    `imageFolder(fileName)`, which the build reads to find collisions. The Android processor
    has it.

- The example brand has stylesheets for its own display and code fonts.

  - `fonts/display.css` and `fonts/code.css` of `dist/web/docs/example/` declare the families
    of the example brand for its `display-*` and `code-*` files. They were the stylesheets of
    the default brand, which named the families of the default fonts over the files of the
    example brand.

- Fixes of the analyzer, the ignore list and the library.

  - The analyzer finds files with the same content. It kept one file per hash and found none.
  - `pnpm assets:analyze --platform <name>` counts the files of that platform in `dist/`. It
    left out the whole of `dist/`.
  - `*~`, `*.swp`, `*.tmp` and `*.temp` files in `source/` are left out of the build, as the
    ignore list says. The wildcard escaped its own dot and matched none of them. No such file
    is in `source/`, so the output does not change.
  - `ChassisAssets.getStats()` and `validate()` read `source/` and `dist/` from the `cwd` and
    `out` of the instance, not from the working directory. `getAssetInventory()` sorts a file
    by its type folder, as the build does, so an SVG under `images/logo/` is an image.
  - 40 Figma screenshots in `source/` are renamed to the names the web build writes, so the
    output does not change.

- `pnpm assets:analyze`, `assets:validate`, `assets:contract` and `assets:verify` print their
  options with `--help`, as the build and the source lint do. An unknown option names
  `--help` instead of the list.
- Versions are made with Changesets, and a version has a GitHub release with one archive per
  platform, app and brand, `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, which
  holds the content of `dist/<platform>/<app>/<brand>/`. `pnpm changeset:version` replaces
  `pnpm change-version`, and this changelog is `packages/assets/CHANGELOG.md`.

## [0.1.8] - 2026-07-14

### Added

- Webp formats of home page images

## [0.1.7] - 2026-07-14

### Added

- Small size variants of home page component gallery images (`comp-gallery-dark-small.png`, `comp-gallery-light-small.png`, and `@2x` versions)

### Updated

- Home page images (component gallery, Figma docs, Figma library, Figma tokens) with new designs

## [0.1.6] - 2026-07-06

### Updated

- Default docs social image (`source/default/docs/images/social-image.png`) with new design and size (1600 x 630 pixels)

## [0.1.5] - 2026-04-25

### Added

- Figma component screenshots (light & dark)
- Example brand font style (`source/example/docs/fonts/fonts.scss`) with Figtree and Lora Google Fonts import

## [0.1.4] - 2026-04-11

### Added

- SVG sprite for icon library (cx-sprite.svg)
- New SVG icon library visualization assets (icon-library-dark.svg, icon-library-light.svg)

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Enhanced change-version.js script with improved functionality
- Updated and optimized documentation images for better performance
- Improved home page images (component gallery, Figma screenshots, platforms, tokens)
- Refined token visualization SVGs (tokens-scheme.svg, tokens-visual.svg)

### Fixed

- Image file sizes reduced across multiple documentation assets

## [0.1.3] - 2026-03-16

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Updated build path configuration
- Modified asset build paths in build script and site configuration
- Updated path utilities and SCSS settings for improved asset management

## [0.1.2] - 2026-03-12

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Reorganized documentation images
- Renamed `chassis-social.png` to `social-image.png`
- Replaced multiple chassis logo variants with unified `site-logo.svg`

### Removed

- Removed deprecated logo files: `chassis-logo-black.svg`, `chassis-logo-white.svg`, `chassis-logo.svg`
- Removed logo shadow image variants

## [0.1.1] - 2026-02-27

### Added

- Comprehensive CI/CD pipeline with GitHub Actions
- Asset analysis tool for statistics and optimization recommendations
- Testing framework for build process validation
- Enhanced error handling and logging in build scripts
- Asset guidelines documentation
- Platform-specific processing improvements
- **Modular processor architecture**: Platform-specific processors in dedicated modules (build/processors/)
  - `web.js` - Web platform processor (kebab-case transformation)
  - `ios.js` - iOS platform processor (snake_case transformation)
  - `android.js` - Android platform processor (snake_case, ic_ prefix, density mapping)
  - `shared.js` - Common utilities (resolution indicator extraction)
  - `index.js` - Processor registry with `getProcessor()` and `platformProcessors` exports
- **Asset types module**: Canonical asset type definitions in build/asset-types.js
  - Single source of truth for asset types (fonts, icons, images, logo)
  - Centralized extension validation with `getValidExtensions()` and `getAllValidExtensions()`
  - Metadata file detection with `isMetadataFile()`
- **Quiet mode**: Suppress verbose output for automated testing and CI/CD pipelines
  - `generateAssets({ quiet: true })` - Silent build mode
  - `new AssetAnalyzer({ quiet: true })` - Silent analysis mode
  - Errors always visible even in quiet mode

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Improved build script with validation and detailed reporting
- Enhanced package.json configuration for asset-focused distribution
- Updated README with clearer project scope and usage instructions
- **Refactored build system**: Eliminated ~250+ lines of duplicated processor logic
- **Single source of truth**: Platform filters, transformations, and rules now imported from dedicated modules
- **Variable naming**: Clarified `buildConfig` (package.json config) vs `cliOptions` (command-line args)
- **API signatures**: Added optional `options` parameter to `generateAssets()` and `AssetAnalyzer` constructor

### Fixed

- Package files configuration to properly include distributed assets
- Build script error handling and user feedback
- Android file naming conventions and icon prefixing
- Variable naming collision (buildOptions used for two purposes)
- Infinite recursion in logger implementation

## [0.1.0] - 2025-08-24

### Added

- Initial asset management system
- Multi-brand, multi-platform asset distribution
- Basic build script for copying and processing assets
- Support for web, iOS, and Android platforms
- Brand override system with fallback to default assets
- Android-specific file naming and icon prefixing

### Infrastructure

- Project setup with pnpm package management
- ESLint configuration for code quality
- Basic documentation and README
