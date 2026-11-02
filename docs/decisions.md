# Decisions

The decisions behind the build, the layout of the repository and its releases, each with its
reason. The other documents and the tests cite them by number, so a number never changes.

D1 to D23 were taken while the roadmap of 2026-09-30 ran, D24 to D30 after it. The roadmap
is deleted: its last full text, with the evidence and the session log, is
`git show a7c4c42:ref/ROADMAP.md`.

## Adding a decision

A new decision gets the next number, as an entry at the end: the question, the outcome with
its reason, who took it and the date. An entry that amends an earlier one says so, and the
earlier one gets a sentence that names it. A decision that changes what consumers read or the
output of a default build is the maintainer's; see [AGENTS.md](../AGENTS.md#rules).

## The decisions

All are decided. "With the maintainer" means the session proposed and the maintainer took
it; an entry with a date only was taken by a session under the maintainer's delegation.

- **D1. Which layout of `dist/` is right, the pages' or the code's?** The code's,
  `dist/<platform>/<app>/<brand>/`, the pattern of `chassis-ui/tokens` and what the sites read.
  The maintainer, 2026-09-30.
- **D2. How are the assets distributed?** Not on npm: one package that holds every platform,
  app and brand is not what any consumer reads. The sites keep the `vendor/assets` submodule
  on `app/docs`. An app takes one archive per platform, app and brand from the GitHub release
  of a version, `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, built and verified
  by CI, or vendors the repository and runs the build. The web files are also served under
  `/static/` of the site's deployment. The maintainer, 2026-09-30. The name is that of a
  repository of files since D46.
- **D3. One package, or a workspace with the site in its own package?** A pnpm workspace:
  `source/` and `dist/` at the root, the build in `packages/assets/`, the site in
  `packages/site/`, as in `chassis-ui/tokens`. The root scripts run the build with `node`, not
  `pnpm --filter`, so that `pnpm install --ignore-workspace && pnpm assets:site` keeps
  working with nothing installed. The maintainer, 2026-09-30.
- **D4. Does the web output get TTF and OTF fonts?** No. No site loads one, and the fonts
  page was the odd one out. 2026-09-30.
- **D5. Where do the density folders of a nested image go?** Under the subfolder:
  `images/logo/drawable-xhdpi/logo.png`. An app's copy script lists the folders it wants.
  Flattening the subfolder into the name would rename every nested file. 2026-09-30.
- **D6. What does `--clean` remove when filters are given?** Only the folders of the selected
  jobs. A build without filters removes `dist/` whole. 2026-09-30.
- **D7. Does `other/default.tokens.json` stay in `source/`?** It stays: any folder under an
  app is copied, and removing a file is the maintainer's. `lint.allow` accepts its name.
  2026-09-30. D33 renames it `other/example-tokens.json` of the `chassis` brand, and D35
  removes it.
- **D8. Where do font licenses live?** Beside the fonts in `source/<brand>/<app>/fonts/`, as
  `<role>-license.txt`, and the build copies them to `fonts/` of every job like any file.
  2026-09-30.
- **D9. Vector drawables for Android icons?** `--vector-drawables`, off by default. The icons
  only, since several SVG images exist as PNG under the same name. In the layout the SVG
  had, `icons/svgs/ic_<name>.xml`. `fillBlack` and three decimals, as `chassis-ui/tokens`. An
  SVG without a shape stays an SVG with a warning; a file that does not convert fails the
  build. The release archives are built without it. 2026-10-01.
- **D10. An iOS asset catalog?** `--asset-catalog`, off by default. The images only: the
  icons stay files. `Assets.xcassets` beside the type folders, in place of `images/`. One
  image set per base name of a folder, the rasters in the slots `1x`, `2x` and `3x`, or one
  SVG or PDF with its vector data kept where the name has no raster. A subfolder is a folder
  with a namespace. A file without a place in a set stays in `images/` with a warning. No
  appearances: the build has no rule that pairs a light and a dark file. The release
  archives are built without it. 2026-10-01. D41 added the appearances and the icons.
- **D11. An Android `res/` layout?** `--res`, off by default. `res/` beside the type folders,
  in place of the files it takes: the TTF and OTF fonts in `res/font/`, the raster images in
  the folder of their density, the vector drawables in `res/drawable/`, all without
  subfolders. What `res/` does not take stays where it is with a warning: the licenses,
  every SVG, a second format of a name, a name that cannot be a resource. One resource comes
  from one folder, the nearest to the type folder. No night qualifiers and no font family
  files. The release archives are built without it. 2026-10-01. D44 added the night folders,
  `drawable-nodpi` and the app icon.
- **D12. Image optimization?** Three options, off by default: `--optimize` for the same
  names, `--webp` and `--avif` for a second format. Without settings no visible pixel
  changes: a PNG is compressed again, a JPEG is left alone, an SVG keeps its shapes, a WebP
  of a PNG is lossless. The settings are `chassis.optimize` of `package.json`, which turns
  nothing on, and the options carry no numbers, so a commit builds the same files. No
  setting per file. `images/` only, unless `types` says otherwise. WebP beside the file on
  the web and in place of it on Android when it is smaller, AVIF on the web only, nothing on
  iOS. A missing package is an error before the output is removed. The release archives are
  built with `--optimize` and without the two formats. With the maintainer, 2026-10-01.
- **D13. A `--type` filter for lighter consumer builds?** Yes, and `--include <pattern…>`
  with it, since the type folders do not separate what a site reads. A pattern is a path of
  `source/` in the folder of the app, with `*`, `**` and `{a,b}`. `pnpm assets:lfs` prints
  the Git LFS paths of the same filters. `pnpm assets:site` and the default build are
  unchanged. The validator and the contract check stay checks of a full build. 2026-10-01.
- **D14. Does the Android output get WebP images?** Yes. iOS does not. The maintainer,
  2026-10-01.
- **D15. Are PNG icons kept for iOS and Android?** For iOS, yes. For Android, no: the build
  places only `images/` in density folders, and a PNG icon without one is not an Android
  icon. 2026-09-30.
- **D16. Does the example brand get stylesheets for its fonts?** Yes: a brand that replaces
  a font replaces its stylesheet. 2026-10-01. D24 replaced the brand.
- **D17. Does CI call the reusable workflows of `chassis-ui/website`?** No. The checks
  would be renamed to `Lint / Lint` and `Site / Build`, and the ruleset of three branches and
  `release.yml` read `Lint` and `Site` by name. Decided again on 2026-10-01, after the
  website pinned its workflows by commit: they fit now, and the rename holds.
- **D18. Does this repository take the multi-platform sync documentation of the
  website?** No. The three platform pages have the same steps as commands, per platform and
  checked against a build, and `chassis-docs sync-submodules` does it for the sites.
  2026-10-01.
- **D19. Font subsets?** `--subset`, off by default, whose values are the ranges, over
  `chassis.subset`, over `latin` and `latin-ext`. The web only, since a browser downloads a
  font and an app bundles it. WOFF and WOFF2 under `fonts/`, in place, so that no name of the
  output and no stylesheet changes. Every layout feature and the license entries of a font
  are kept. A font without a character of the ranges stays, with a warning. The icon font is
  not read. No ranges per file, which would be a manifest. A missing package is an error
  before the output is removed. The release archives are built without it. With the
  maintainer, 2026-10-01. D25 adds the axes, and D27 takes back that a font is never split.
- **D20. Processors outside `packages/assets/build/`?** No, parked. A platform stays a module
  of `processors/` that is added to the registry. A loader would make the shape of a
  processor a public API, and every reader of the registry asynchronous. With the
  maintainer, 2026-10-01.
- **D21. A pre-commit hook, as the website has?** No. `simple-git-hooks` installs through a
  `prepare` script, which would run in the `pnpm install --ignore-workspace` of every site
  and write a hook into the vendored clone, and a `core.hooksPath` would replace
  `.git/hooks`, which holds the hooks of Git LFS. The Lint job and the table of checks in
  `AGENTS.md` do the same work. With the maintainer, 2026-10-01.
- **D22. Is `Audit` a required check?** Yes. The ruleset "Protect main and app/docs" requires
  `Lint`, `Assets`, `Site` and `Audit` on the default branch, `app/docs` and `staging`, and
  `release.yml` stops unless the same four passed. `develop` is not covered. With the
  maintainer, 2026-10-01. D23 narrows what the Audit job blocks on.
- **D23. Does this repository take the workflow shape of D24 of the website's roadmap?**
  Yes. The Changeset job runs on a pull request and on a push to `develop`, and keeps
  `build/check-changeset.js` in place of `changeset status`, which cannot see `source/`. The
  release is created with `gh release create`. Dependency Review is a job of `ci.yml`, on
  pull requests. The Audit job blocks on `pnpm audit --prod --audit-level moderate`, which
  reads the packages behind the `optionalDependencies` of the build, and reports
  `pnpm audit` of every dependency. The release step of that shape, a publish to npm, does not apply: nothing goes to npm. The job names,
  the tag `v<version>` and the required checks stay; Changeset and Dependency Review are not
  required. The maintainer, 2026-10-02.
- **D24. How does a brand ship its fonts, with a second brand that has families of its
  own?** `sinefil` replaces the `example` brand, with DM Sans, Source Serif 4 and IBM Plex
  Mono. Fonts stay flat and named by role. A web app holds the variable font of a role,
  `<role>.woff2` and `<role>-italic.woff2`, where the family has one, and the files by weight
  beside it in every brand. The stylesheet of the role declares the variable file, or the
  files by weight of a family without one. The TTF of each WOFF2 stays in `source/`. The app
  fonts are TTF in every brand, since a brand file replaces a default file of the same name
  and extension only. The `demo` app holds the files by weight only. A default variable file
  that a brand cannot replace stays in its output: `code.woff2` for `sinefil`, a known
  oddity. With the maintainer, 2026-10-11. D28 changes the cut of the app fonts and closes
  the weight of `code-strong`. D31 renames the `text` role to `ui` and replaces the
  stylesheet of a role with one stylesheet per brand. D32 replaces the families of
  `sinefil`. D33 moves the default fonts to `source/chassis/`, which ends the known oddity
  of `code.woff2`.
- **D25. Does a page show the optical size axis of the default text font, Inter?** Not in a
  build with `--subset`. A browser sets `opsz` from the font size, so a page draws Inter in
  its display cut above 14 pixels, 7% narrower at 57 pixels. `axes` of `chassis.subset` names
  the axes that `--subset` fixes, per brand, and `package.json` has `opsz` at 14 for
  `chassis`. Per brand, since the value belongs to the family; not per file, which would be
  a manifest. The files of `source/` stay as they were downloaded, so a default build keeps
  the axis, and a site that builds without `--subset` sets `font-optical-sizing: none` for
  the same look. `sinefil` has no entry. With the maintainer, 2026-10-11, from issue 6.
- **D26. Does a check of this repository read chassis-ui/tokens, or the other way round?** No.
  Each repository is used alone, and a team may take the tokens only or the assets only. The
  two meet in a convention: the names of the roles and the weights, and the family that the
  stylesheet of the brand declares for a role (D31). A check stays inside the repository whose files it reads.
  The maintainer, 2026-10-11.
- **D27. Is a font written in a file per range, with `unicode-range` in the stylesheets?**
  Yes, with `--split`, off by default. A build with `--subset` and `--split` writes each font
  that a stylesheet of `fonts/` declares once per range too, as
  `<name>-<range>.<extension>`, and the rule of the stylesheet once per range with its
  `unicode-range`. The font itself stays. A hyphen and not a dot, since a build renames the
  files it finds in an output. `--split` and `--no-split` win over `split` of
  `chassis.subset`, which is off in this repository: the project that builds decides. The
  output only gains files, which is why this takes back a part of D19. With the maintainer,
  2026-10-11, from issue 5.
- **D28. Are the files by weight of a family with a variable font written from it?** Yes, in
  both brands. `build/instance-font.py` writes a file by weight from the variable file of its
  style with fonttools, at the weight of its role and at the default of every other axis, or
  at a value that is given. It is a step of `docs/fonts.md`, run by hand, and no part of the
  build. Inter is at the optical size 14 in every file by weight, so the app fonts are
  `Inter-Regular` again and not the 18pt cut of D24. `code-strong` is the Bold, 700, as the
  tokens have it. The variable file of `code` is Fira Code 6.2 from the releases of the
  family on GitHub, the one family that is not a download of Google Fonts. The files of
  `sinefil` keep the cuts of its downloads, DM Sans at 18 and Source Serif 4 at 14, and a
  file names the cut it is fixed at. Asked for by the maintainer, 2026-10-11. The first two
  choices and the cut of the `display` role of `sinefil` wait for a confirmation, see
  [ref/OPEN.md](../ref/OPEN.md). D32 takes the files by weight of a family with a reserved
  font name from its download, and the families it replaces close the cut of `sinefil`.
- **D29. Which tables of the build does a team set, and where?** Two, in the `chassis` block
  of `package.json`. `ignore` is a list of names of files and folders that are left out
  beside `IGNORE_PATTERNS`: it adds and takes nothing away, and a pattern is a name with `*`,
  not a path. `formats` names, per platform and type folder, the extensions the platform
  keeps, in place of the rule of its processor, for `fonts`, `images` and `icons`. Both are
  off without their key, so the default output is the one it was, and neither names a file.
  They are read with the configuration and not turned on by an option: a format is a
  property of the repository, not of a run. The other tables stay in the modules. With
  `formats` the output is no longer the one of the output contract, which describes a
  configuration without it. Asked for by the maintainer, 2026-10-12. The choices of the
  session wait for a confirmation, see [ref/OPEN.md](../ref/OPEN.md).
- **D30. How does the site of this repository get the fonts that its pages load?** From its
  own docs build, with `pnpm site:assets`, which `pnpm dev` and `pnpm site:build` run before
  Astro. The script is `pnpm assets:site` with the options
  `--subset latin latin-ext symbols2 --split`. From `@chassis-ui/docs` 0.8.0 on a page links
  the three stylesheets of `fonts/` under `/static/` and no longer Google Fonts, and the
  other sites get the same files from `chassis-docs vendor`, which runs `pnpm assets:site`
  with the options of their own script. So the options are in a script of the site and
  `pnpm assets:site` is as it was: what it writes for a site that gives no option does not
  change. They are not in `chassis.subset` either, where `ranges` and `split` would be the
  default of every site that builds this repository, and D27 leaves the split to the project
  that builds. `symbols2` is for the file trees of the pages: 1,620 box drawing characters in
  the code blocks of 11 pages, which the code font draws at the width of a letter and a
  fallback font does not. The upgrade was asked for by the maintainer, 2026-10-12. The
  script and the range are the session's and wait for a confirmation, see
  [ref/OPEN.md](../ref/OPEN.md).
- **D31. One stylesheet per role, or one per brand, now that a brand sets several roles in
  one family?** One per brand, `fonts.css`, written by hand in `source/<brand>/<app>/fonts/`,
  and the `text` role is `ui`. Chassis Tokens 0.10 renamed the family `text` to `ui` and
  added `prose`, the family of reading content, which the default brand sets in its `ui`
  family and `sinefil` in its `display` family. A `@font-face` rule declares a family name,
  so a stylesheet per role would declare one family twice, or be a copy of another, and a
  page would link a file per role whether the role has files or not. So a brand holds the
  files of the families it has, under the role that owns each family; a role set in another
  family has no files; the one stylesheet declares each family once, with a block per role;
  and a page links `fonts/fonts.css`. The file names of a brand follow the families of its
  tokens, so they are no longer the same in every brand, and "every file of a role is
  replaced" holds per role. A stylesheet that the build writes from the font files was
  considered and parked, see [ref/OPEN.md](../ref/OPEN.md). Breaking: `text.css`,
  `display.css` and `code.css` are gone, `fonts.css` is new, and the `text` files are `ui`
  files on every platform, with the same fonts and PostScript names inside. `@chassis-ui/docs`
  0.8 and 0.9 link the three stylesheets and move with the sites. The maintainer,
  2026-10-19. D32 sets the `display` role of `sinefil` in its `prose` family.
- **D32. Which fonts does `sinefil` have, and how are the files of a family with a reserved
  font name made?** Geist for `ui`, Lora for `prose` and Cousine for `code`, the families of
  `source/brand-sinefil/brand-base.json` in chassis-ui/tokens since its commit `1168271`, which
  sets the `display` role in the `prose` family. So `sinefil` has `prose` files, which the
  default brand has not, and no `display` files: the display files of the default brand stay
  in its output, as `code.woff2` does. D33 ends both. The license of Lora
  reserves the name "Lora". The OFL FAQ counts a font with changed data as a Modified
  Version, which may not carry a reserved name, and allows a WOFF2 of unchanged data under
  the name (FAQ 2.2.1). So the files by weight of Lora are the files in `static/` of its
  download, copied, and not written by `build/instance-font.py`: they are the same version
  as the variable files, 3.008, and the authors' own. Geist reserves no name and takes the
  step of D28. A build with `--subset` writes a subset of Lora under its name; the maintainer
  accepts that, as most sites do. With the maintainer, 2026-10-20.
- **D33. What does `source/default/` hold, now that the brands differ in their fonts, logos
  and favicons?** What every brand shares, and nothing else: the screenshots and the home page
  images, `icons/cx-sprite.svg` of the `docs` app, and the copy of `@chassis-ui/icons` in the
  `demo` app. Each brand holds its fonts, logos, favicons, site logo and social image in
  `source/<brand>/`, the `chassis` brand in `source/chassis/`. A brand so gets no font of
  another: the display files and `code.woff2` of the default brand are no longer in the
  output of `sinefil`, and a brand that has no file of a role ships none. The maintainer
  reorganized `source/` so, and took the breaks that came with it: the 48 logos
  `chassis-{logo,icon}-{black,brand,white}`, with their banners and their `@2x` and `@3x`
  files, are 8 files per brand and app, `images/logo/logo-{black,dark,light,white}.{png,svg}`;
  the `docs` app has no `icons/icons/` and `icons/svgs/`, so a page takes the icons from
  `@chassis-ui/icons`, and the `demo` app keeps them; the 13 files at the top of `images/` of
  the `demo` app are removed; and `other/default.tokens.json` is
  `other/example-tokens.json` of the `chassis` brand, with the content of D7 and without the
  dot, and `sinefil` has none. The contract of the logos that the website reads is removed
  from `chassis.checks.json` until the website reads the new names, see
  [ref/OPEN.md](../ref/OPEN.md). The maintainer, 2026-10-20.
- **D34. Do the pages of the site list what `source/` holds?** No. They explain how the asset
  system works: the layout `source/<brand>/<app>/<type>/`, the fallback of a brand to the
  default brand, the output name of each platform, and how an app finds a file by that name.
  A page names no file of a brand, holds no tree of the files of a brand, and says nothing of
  which brand has which file; its examples are placeholder files, such as
  `images/hero-banner.png`, in paths with `<app>` and `<brand>`, and its trees of `dist/` are
  copied from a build of those files in a scratch repository. The names of the font roles, of
  `fonts.css` and of the files of Chassis Icons are conventions and stay, and a command may
  name a job of the committed configuration. The pages listed the files of the brands, and
  went wrong with every change to an asset: the removal of `other/example-tokens.json` and of
  the maskable icon of `sinefil` left several of them stale. So a change to the files of
  `source/` needs no change to a page. The contracts of `chassis.checks.json` and the table of
  consumers in the README still name the files that consumers read, since those are the
  output contract. [WRITING.md](../WRITING.md) §7 holds the rule. The maintainer, 2026-10-23.
- **D35. Does `other/example-tokens.json` stay in `source/`?** No. It was an example file that
  no consumer reads, kept by D7 only because removing an asset is the maintainer's, and the
  maintainer removed it. `other/` of the `chassis` brand holds its web manifest, as that of
  `sinefil` does. The maintainer, 2026-10-23.
- **D36. Is the default brand `source/default/`, and does a brand repeat a file in every
  app?** The default brand is `source/_default/`, and a brand holds the files that every app
  of it takes in `source/<brand>/_shared/<type>/`, once. A job of a brand and an app reads
  `_default/_shared/`, `_default/<app>/`, `<brand>/_shared/` and `<brand>/<app>/`, and a file
  of a later folder replaces the file of the same path in an earlier one: a brand file wins
  over a default file, and within a brand an app file over a shared file (`sourceLayers()`).
  `_default` has a `_shared` folder too, so one rule holds for every brand. A name that starts
  with `_` is no brand and no app: the build fails on such a name in `chassis.build`, and the
  source lint takes `_default` and `_shared` as folder names. `chassis.defaults.brandFolder`
  stays, and is `_default` when it is not set. The identical copies of the `docs` and `demo`
  apps of each brand moved to `_shared/`: the fonts by weight and their licenses of `chassis`
  and `sinefil`, and the logos of `sinefil`. The `fonts.css` of each app and the logos of
  `chassis` differ by app and stay; so do the home page images of `_default`, of which some
  differ by app, so that the set is in one folder. The output is byte for byte the one
  before. The source paths, `--include` and the paths `pnpm assets:lfs` prints change, so the
  changeset is a minor one that starts with **Breaking.**. The maintainer, 2026-10-29. The logos
  of `chassis` moved to `_shared/` of website-assets on 2026-11-01: they differed by rounding.
- **D37. Is the build published to npm?** Yes, as `@chassis-ui/assets` with the
  `chassis-assets` command, so that a team installs it in a repository of its own assets and
  runs the build there; the assets of this repository are not published (D2 holds for them).
  The first step of a split: `source/`, `chassis.checks.json` and the `chassis` block move to
  a repository of files, `chassis-ui/website-assets`, and this one keeps the package and the
  site. The packages that an option loads are optional entries of `peerDependencies`, and
  `devDependencies` for the tests, not `optionalDependencies`: a plain install of the package
  brings nothing else, and a team installs the one package the option it uses names. The
  archives of a release are written by `chassis-assets archive` with `node:zlib`, not by a
  script with the `zip` command, so that a repository of files releases them wherever Node.js
  runs; `--release <version>` names the version where the root `package.json` has none, as
  here. The release workflow publishes with npm trusted publishing, as `chassis-ui/tokens`. The
  maintainer, 2026-10-29.
- **D38. Where do the assets of the Chassis sites live?** In `chassis-ui/website-assets`, a
  repository of files made with `chassis-assets init` and holding `source/`,
  `chassis.checks.json` and the `chassis` block with their history, 38 commits filtered from
  `develop` of this repository at 812c5d2 with `git filter-branch` and merged with unrelated
  histories; `docs/fonts.md`, `build/instance-font.py` and the entries of `ref/OPEN.md` about
  the files of the brands went with them. This repository keeps the package and the site,
  and builds the assets from the `vendor/assets` submodule, pinned to `main` of
  website-assets, with the root scripts on `--cwd vendor/assets`: the site reads
  `vendor/assets/dist/web/docs/chassis/` as every Chassis site does, and CI runs the lint,
  the build, the verification and the iOS catalogs on the real files, with the build of the
  checkout and not of npm. The archives of a release come from website-assets; the release
  here is the package, its tag and its notes. `app/docs` has no use once the sites pin
  website-assets, and `build/check-changeset.js` is gone: Changesets sees every released
  change. The attributes keep the fixture lines only, since no Git LFS file is left.
  Supersedes D3 for the place of `source/` and `dist/`; the layout rule of AGENTS.md now
  describes a repository of files. The maintainer, 2026-10-29.
- **D39. How do the Chassis sites and sinefil.org get the assets?** From the release archive
  of their job, `web/docs/<brand>`, of a pinned version of `chassis-ui/website-assets`, checked
  by its SHA-256, as sinefil.org did with the archives of this repository. A release is
  built with `--optimize --subset --split`, and the ranges of `chassis.subset` are the union
  of what the sites set, `latin`, `latin-ext`, `symbols2` and `U+2190-2193`, with `cyrillic`
  and `greek` for the film titles of sinefil.org since 0.2.1: with the split a page downloads
  a range only when its text has a character of it, so one archive serves every site, and the sites get the optimized images they did not build. Measured on
  2026-10-29: the `web/docs/chassis` job is 44.0 MB in place of 59.3 MB as the sites built it,
  and a latin page loads 299 KB of fonts in place of 1,246 KB of whole files. A site build
  then needs no submodule, no Git LFS, no install and no build of the assets. The vendor
  command of `@chassis-ui/docs` takes the archive, chassis-ui/website#33. This repository
  keeps its submodule, since its CI checks the build of the checkout on the real files. The
  maintainer, 2026-10-29.
- **D40. Who writes the files by weight of a variable font?** The package, with
  `chassis-assets static-font`, in place of `build/instance-font.py` of website-assets, a
  Python script with fontTools that an adopting team never got. HarfBuzz pins the axes, the
  one of `subset-font`, an optional peer as for `--subset`, loaded from the folder of that
  package: its own options empty the outline of `.notdef` and drop the glyphs no character
  reaches, so the command drives HarfBuzz directly, keeping every glyph. The names are a port
  of the naming of fontTools from `STAT`, with the style bits of a regular, a bold and an
  italic, then the rules of the script: the optical size in the family, the PostScript and
  unique names of a download by weight. Checked on 2026-10-30 against the files the script
  wrote for website-assets, the 18 of `chassis` and the 8 `ui` files of `sinefil`: the names,
  the glyphs, the style bits and the weights are the same, and so are the outlines but where
  `avar` maps the weight, as Inter's Bold, where HarfBuzz rounds the mapped coordinate
  otherwise than fontTools: points move by 2 units of 2048 at most, and some advances by 1.
  A run writes the font to every output it is given, TrueType and WOFF2, so the conversion of
  the fonts page is no step of its own.
  Variable fonts with TrueType outlines only were tried. The maintainer, 2026-10-30.
- **D41. Should the catalog take appearances and icons, and an app font every role?** Yes to
  all three, with the maintainer, 2026-11-01: the plan of an example app showed that an app
  could not name a file by role across brands, nor get a catalog of what it needs from a
  release. A release has the catalogs: the `release.yml` that `init` writes runs a script
  `build:release` with both options, as website-assets does, and a team takes them out of the
  script if it wants the folders.
  `<name>_light` and `<name>_dark` of a folder are one image set `<name>`, which replaces
  the rule of D10; a name of a catalog so changes where a repository has such a pair.
  `--icon-catalog` writes `Icons.xcassets`, a catalog of its own as an image is free to have
  the name of an icon, and off by default as the flags of the build keep working. The build
  reads the text of an icon, not of an image, to tell a template from a colored file and a
  sprite from an image, with no list: a template paints only in `currentcolor`, as a tint
  would lose any other color. The folder of an iOS or Android app holds a file for every role and weight,
  also where D31 leaves a role without files on the web: the web declares a family, and an
  app names a file. Copies have one PostScript name, and iOS reports the second registration
  as a duplicate and loads the font, run on the iOS 18.4 simulator. A vector beside a raster of
  its name stays out of the set, as D10 has it. The maintainer, 2026-11-01.
- **D42. How does a repository of assets hold an app icon?** As the `.icon` bundle that Icon
  Composer saves, in a folder of its own such as `app-icon/`. The build and the source lint take
  a bundle as one file: only iOS keeps it, it gets the snake_case name of the platform, the files
  in it keep their names, and a brand bundle replaces the default bundle whole. The rename of the
  build changed the files of `Assets/` and not the names in `icon.json`, so `actool` failed on
  the output and compiled the source. No option and no list: the extension is the rule, and
  only a designer's file is needed. `actool` writes the older icon images from the bundle, so the
  build makes no `AppIcon.appiconset` and resizes nothing. Under `fonts/`, `images/` or `icons/`
  a bundle stays an ordinary folder, which keeps the optimizer, the catalogs and `res/` out of
  it. The icon of an Android app is D44. The maintainer, 2026-11-01. D45 has the source lint
  read `icon.json`.
- **D43. What starts the release of a repository of assets?** A push to `main` with a new
  version, in place of a tag. The `release.yml` that `init` writes reads the version of
  `package.json`, and when it has no tag `v<version>` it builds, verifies and creates the tag
  and the GitHub release with the archives, as the release of this repository does; a push whose
  version has a tag ends after one small job, with no Git LFS pull. A release that fails makes no
  tag, so the next push tries again. Raising the version is the deliberate step, as pushing the
  tag was: source changes still reach `main` without a release. The first push of a new
  repository releases `0.1.0`, the version `init` writes. Raise a version with
  `--no-git-tag-version`, as a tag pushed by hand ends the release. The maintainer, 2026-11-01.
- **D44. What does `--res` write for dark mode, for an image of one size and for an app icon?**
  `<name>_light` and `<name>_dark` of one folder are the resource `<name>`, the dark files in
  `drawable-night*`, as they are one image set on iOS (D41), with the same rule: a vector and a
  raster stay apart. A drawable with the name of a pair in any folder fails the build, where
  two files of one name otherwise leave a warning (D11): a resource that silently is something
  else shows the wrong image in one mode. A raster of a resource with no density folder goes to
  `drawable-nodpi`, and `drawable-night-nodpi` for a dark file, since Android takes `drawable/`
  for mdpi and scaled the logo of 1024 by 220 up 2.6 times at 420 dpi. A resource with a density
  folder keeps `drawable/` for its 1x file, and a vector stays there, as it is of no density. The
  app icon is a bundle as on iOS (D42): a folder `<name>.adaptive` in a folder of its own, with
  `background.svg`, `foreground.svg` and `monochrome.svg`, only Android keeps it, and a brand
  replaces it whole. With `--vector-drawables --res` the layers become
  `res/drawable/<name>_<layer>.xml` and `res/mipmap-anydpi-v26/<name>.xml` names them. Reading the
  layers from the `.icon` bundle was left out: `icon.json` holds glass, blend modes and scales of
  Icon Composer that have no Android form, and a layer of 108 dp has a safe zone of its own. A
  logomark placed by the build would need a size per mark. So a designer's file, no option and
  no list. `mipmap-anydpi-v26` leaves an app below API 26 to its own icon, as the build resizes
  nothing. A `res/` path of a contract is checked on an output that has `res/`, so a contract
  can name what an archive holds while CI verifies a plain build; a release script that loses
  `--res` is then found by the app, not by the check. aapt2 passes an SVG, a text file and a
  vector without a shape in `res/`, so `test/native/android/check.sh` checks them itself before
  it compiles and links, in the Native Android job of CI. `--res --vector-drawables` is not in the
  `build:release` that `init` writes: the option needs `svg2vectordrawable`, and it is a choice of
  a team with an app. Font family files stay out, as Compose names the role files in code. Tried
  with the example app on an API 35 emulator, both brands, light and dark: the logos, the tint of
  the icons of `svg2vectordrawable` and the app icon. The session, at the request of the
  maintainer, 2026-11-01.
- **D45. Does the source lint look into an `.icon` bundle?** Yes: `icon.json` has to be there
  and be JSON, and every layer file it names has to be in `Assets/`, as the lint of D44 reads
  the layers of an `.adaptive` bundle. A bundle that lacks a file passed the lint, the build
  and `verify`, and failed in `actool` of the app, where no designer looks. The lint reads
  `groups[].layers[].image-name` and nothing else of the manifest: the glass, the fills and the
  positions are Icon Composer's, and the build still copies the bundle as one file (D42). With
  it, the app icons got a page of their own under `asset-types/`, since a designer prepares them
  and the iOS and Android pages said only how an app uses them, and a build with `--res` says
  of a bundle that stays why it is no app icon. No `AppIcon.appiconset`, no `mipmap-*dpi`
  files and no fallback below API 26: the build resizes nothing, as D42 and D44 say. The
  session, 2026-11-02.
- **D46. How is a release named, and what is its text?** An archive is
  `<repository>-<platform>-<app>-<brand>-<version>.zip`, the name of `package.json` without its
  scope being that of the repository, in chassis-ui/tokens as here: website-assets is
  `@chassis-ui/website-assets`, private as it was, and its archives `website-assets-…`, as they
  were `chassis-website-assets-…` while `website-tokens-…` had no such start. A consumer names
  the archive in a setting of its own, as `chassis-ui/android-example`, `chassis-ui/ios-example`
  and `chassis-ui/vanilla-example` do, so its name moves with the version there. The release of a
  repository of files takes the entry of its version in `CHANGELOG.md` as its text, with
  `chassis-assets release-notes`, in CI and first in the release, so that a version without an
  entry fails and is not released. `--generate-notes` wrote only a link: these repositories push
  to `main`, and it lists pull requests. The changelog is written by hand, not with Changesets:
  a designer who adds a font has no reason to install a tool for it. CI does not run
  `build:release` on a new version: with no pull requests it runs beside the release, for the
  same result at twice the Git LFS bandwidth. The README and `AGENTS.md` ask for it before the
  commit. The maintainer, 2026-11-02.
- **D47. How does a repository made earlier take what `init` writes now?** With `init --check`,
  which reports what differs, and `init --only <file…>`, which writes those files. `--force` was
  all or nothing, and wrote over the `chassis` block and the contracts, so `package.json`,
  `chassis.checks.json` and `CHANGELOG.md` are never written over now. `init` also writes
  `AGENTS.md` and `CLAUDE.md`, the rules an agent breaks in a repository of files without being
  told, since a release follows from a push; they guide, and D46 enforces. No check compares
  the package with chassis-ui/tokens (D26): the two have the same commands by this decision,
  and each checks only its own repositories. The maintainer, 2026-11-02.
- **D48. How does a version know what changed in `dist/`?** From the manifest of the release
  before it. `chassis-tokens diff` reads a git ref, as its `dist/` is committed; here `dist/` is
  not (D2), so `chassis-assets manifest` writes the size and the SHA-256 of every file by job,
  with the version of the build, and the release attaches it. `chassis-assets diff --base`
  reports against it. A file of the release, not of `dist/`, so the output contract stays as it
  is. No download in the command: `gh release download` does that, with the sign-in a private
  repository needs. The maintainer, 2026-11-02.
- **D49. Where do the checks of real files belong?** With the change they catch. The compilers of
  Xcode and of Android ran only here, on `vendor/assets`, so a bad icon passed the CI of
  website-assets and failed here when the pin moved, and a problem in a repository of assets could
  stop a release of the package. A change to the build is now checked on `test/native/fixture/`, a
  few small real files with no golden output, kept apart so that `fixtures/` stays lines of text.
  A change to the files is checked where they are: `chassis-assets check-native` is published, the
  scripts in `build/native/`, run with bash so that the package still imports no dependency, and
  `init` writes `native.yml` with a job per platform of `chassis.build`, on a change to the assets
  only, since each job pulls the Git LFS files. The build of a new version on real files, which
  only happens when a repository of assets moves to it, is checked there, or first with a `next`
  prerelease or a run of this checkout with `--cwd`. A submodule used to catch that earlier; the
  package has no reason to know a repository of assets. Removing `vendor/assets` and moving the
  docs site to a release archive is chassis-ui/website#33. The maintainer, 2026-11-02.
- **D50. How does the site of this repository get the assets?** Like every Chassis site, from the
  archive of `web/docs/chassis` of a pinned release of `chassis-ui/website-assets`, with
  `chassis-docs vendor` of `@chassis-ui/docs` 0.13 and the pin in `vendor/assets.json`. Amends D38:
  the `vendor/assets` submodule, the root scripts on `--cwd vendor/assets` and the steps of CI on
  the real files are gone, and CI here no longer checks the build on them. Those checks run in
  website-assets (D49), where `chassis-assets verify`, `lint-source` and `check-native` check each
  change to the files, and a change to the build is tried on them with
  `node packages/assets/build/cli.js <command> --cwd <checkout>`. Supersedes the copy of the site
  in D30: the release has made the choice of the ranges (D39), so `pnpm site:assets` is gone, with
  no change to a font a latin page loads. `pnpm vendor` no longer needs Git LFS, and a build of the
  site a download of 36 MB in place of a pull of about 77 MB. `app/docs` has no reader here; deleting
  it stays the maintainer's. chassis-ui/website#33. The maintainer, 2026-11-02.
