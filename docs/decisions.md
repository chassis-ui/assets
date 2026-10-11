# Decisions

The decisions behind the build, the layout of the repository and its releases, each with its
reason. The other documents and the tests cite them by number, so a number never changes.

D1 to D23 were taken while the roadmap of 2026-09-30 ran, D24 to D29 after it. The roadmap
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
  `dist/<platform>/<app>/<brand>/`, the pattern of `chassis-tokens` and what the sites read.
  The maintainer, 2026-09-30.
- **D2. How are the assets distributed?** Not on npm: one package that holds every platform,
  app and brand is not what any consumer reads. The sites keep the `vendor/assets` submodule
  on `app/docs`. An app takes one archive per platform, app and brand from the GitHub release
  of a version, `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, built and verified
  by CI, or vendors the repository and runs the build. The web files are also served under
  `/static/` of the site's deployment. The maintainer, 2026-09-30.
- **D3. One package, or a workspace with the site in its own package?** A pnpm workspace:
  `source/` and `dist/` at the root, the build in `packages/assets/`, the site in
  `packages/site/`, as in `chassis-tokens`. The root scripts run the build with `node`, not
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
  2026-09-30.
- **D8. Where do font licenses live?** Beside the fonts in `source/<brand>/<app>/fonts/`, as
  `<role>-license.txt`, and the build copies them to `fonts/` of every job like any file.
  2026-09-30.
- **D9. Vector drawables for Android icons?** `--vector-drawables`, off by default. The icons
  only, since several SVG images exist as PNG under the same name. In the layout the SVG
  had, `icons/svgs/ic_<name>.xml`. `fillBlack` and three decimals, as `chassis-tokens`. An
  SVG without a shape stays an SVG with a warning; a file that does not convert fails the
  build. The release archives are built without it. 2026-10-01.
- **D10. An iOS asset catalog?** `--asset-catalog`, off by default. The images only: the
  icons stay files. `Assets.xcassets` beside the type folders, in place of `images/`. One
  image set per base name of a folder, the rasters in the slots `1x`, `2x` and `3x`, or one
  SVG or PDF with its vector data kept where the name has no raster. A subfolder is a folder
  with a namespace. A file without a place in a set stays in `images/` with a warning. No
  appearances: the build has no rule that pairs a light and a dark file. The release
  archives are built without it. 2026-10-01.
- **D11. An Android `res/` layout?** `--res`, off by default. `res/` beside the type folders,
  in place of the files it takes: the TTF and OTF fonts in `res/font/`, the raster images in
  the folder of their density, the vector drawables in `res/drawable/`, all without
  subfolders. What `res/` does not take stays where it is with a warning: the licenses,
  every SVG, a second format of a name, a name that cannot be a resource. One resource comes
  from one folder, the nearest to the type folder. No night qualifiers and no font family
  files. The release archives are built without it. 2026-10-01.
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
  the weight of `code-strong`.
- **D25. Does a page show the optical size axis of the default text font, Inter?** Not in a
  build with `--subset`. A browser sets `opsz` from the font size, so a page draws Inter in
  its display cut above 14 pixels, 7% narrower at 57 pixels. `axes` of `chassis.subset` names
  the axes that `--subset` fixes, per brand, and `package.json` has `opsz` at 14 for
  `chassis`. Per brand, since the value belongs to the family; not per file, which would be
  a manifest. The files of `source/` stay as they were downloaded, so a default build keeps
  the axis, and a site that builds without `--subset` sets `font-optical-sizing: none` for
  the same look. `sinefil` has no entry. With the maintainer, 2026-10-11, from issue 6.
- **D26. Does a check of this repository read chassis-tokens, or the other way round?** No.
  Each repository is used alone, and a team may take the tokens only or the assets only. The
  two meet in a convention: the names of the roles and the weights, and the family that the
  stylesheet of a role declares. A check stays inside the repository whose files it reads.
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
  [ref/OPEN.md](../ref/OPEN.md).
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
