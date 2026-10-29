# Open work

What is left to do, decide or check in this repository, and what was considered and left
out. An entry is removed when it is done. A D-number is a decision of
[docs/decisions.md](../docs/decisions.md). Read on 2026-10-12.

## For the maintainer

- **The weights of the `display` role of the `chassis` brand.** Its Montserrat files, taken
  from `feat/new-chassis-brand` on 2026-10-19, are at 300, 400, 600 and 700, the weights of
  the `ui` role, while `typography.fontWeight.display` of `source/brand-chassis/brand-base.json`
  in chassis-tokens 0.10 is Regular, Medium, SemiBold and Bold, 400, 500, 600 and 700. The
  files by weight of `elegant` and `normal`, and the comment of `fonts.css`, follow one of the
  two once the maintainer says which.
- **The logos that the siblings read by their old names.** D33 renamed the logos to
  `images/logo/logo-{black,dark,light,white}.{png,svg}` of each brand, and removed the
  `chassis-{logo,icon}-*` files. Reports for the siblings: `BrandingSection.astro` of
  chassis-website reads `images/logo/chassis-{logo,icon}-{brand,white}-banner.svg` from
  `/static/`, and the table of `packages/docs/README.md` there names them; the pages of
  chassis-css load `images/logo/chassis-logo-brand.svg` with `getStaticPath()` in
  `components/navbar.mdx`, and `about/brand.mdx` loads `chassis-logo-{brand,black,white}.svg`;
  the README of chassis-react shows `https://chassis-ui.com/static/images/logo/chassis-logo-brand.svg`,
  which stops working when the website deploys this version. The entry of `contracts` in
  `chassis.checks.json` for the website's logos was removed with D33: add the names the
  website reads once it reads the new ones.
- **The choices of D28.** Two were the session's: Inter is at the optical size 14 in every
  file by weight, so the app fonts left the 18pt cut of D24, and `code-strong` of the default
  brand is the Bold, 700. Both are in 0.3.0 and wait for a confirmation.
- **The choices of D29.** `chassis.ignore` adds names and takes none away, a pattern is a
  name and not a path, a list of `chassis.formats` replaces the rule of a processor, and both
  are read from the configuration without an option. In 0.3.1, and they wait for a
  confirmation.
- **The choices of D30.** The site builds its fonts with `pnpm site:assets`, a script of its
  own beside `pnpm assets:site`, and with the range `symbols2` beside `latin` and
  `latin-ext`. Both are the session's and wait for a confirmation.
- **The code font of the pages is wider than it was.** Fira Code 6.2 of `source/` has an
  advance of 1200 in an em of 1950, 0.6154 em, where the 5.002 of Google Fonts, which the
  pages loaded up to `@chassis-ui/docs` 0.7, has 0.6 em: code is 2.56% wider on every site
  that moves to 0.8.0. Measured on this site on 2026-10-12, at 375 and 1280 pixels: code
  blocks scroll that much further, 94 of 16,135 pieces of text wrap on another line, and a
  page is 0.02% to 1.02% taller. Inter has the same width at every size and weight. D28
  chose the family, and `docs/fonts.md` names its other line metrics, not the width. To
  keep the old width, a `size-adjust` of 97.5% in `fonts.css` or the 5.002 files would do
  it, and both change `source/`. "From 0.7 to 0.8" of `UPGRADING.md` of `@chassis-ui/docs`
  says that text keeps its width, which holds for Inter only: a report for chassis-website.
- **1.0.** The five requirements that were set for it hold: the pages and the build agree,
  the consumer contract is tested, the build has unit and build tests, releases are
  automated, and the docs site uses `@chassis-ui/docs` 0.6 or later. Whether a release
  becomes 1.0, and when, is not decided.
- **The icons of the next `@chassis-ui/icons`.** `chassis-icons` removed `road-outline-1.svg`
  and `road-solid-1.svg` from its source, export copies of the two icons without the number,
  and its version is `0.4.0-next.0`. The copy in `source/_default/demo/` is the output of 0.3.1
  and has both. A refresh, by the steps of
  [docs/architecture.md](../docs/architecture.md#refreshing-the-icons), removes two names from
  `icons/svgs/` of every job of the `demo` app, which is a change of the output contract.
- **Files an app cannot use.** The apps get the symbol sprite of the icons, since it is an
  SVG, and logos that exist under one name as PNG and as SVG, which meet in one `res/`
  folder or one asset catalog. The build copies what the source holds, and the platform
  pages say what an app does about each. Removing the copies from `source/_default/demo/` is
  the maintainer's.

## Not written

- An entry of `contracts` in `chassis.checks.json` for `fonts/fonts.css`. The sites link the
  stylesheets of `fonts/` from `@chassis-ui/docs` 0.8.0 on, so the entry is due: no check
  fails when it is missing. The table of
  [README.md](../README.md#what-consumers-rely-on) gets a row with it.
- A build with `--split` that leaves out the file of a range of which a font has only
  glyphs without an outline. With `symbols2`, Inter and Archivo Narrow had the eight
  spaces of the range and nothing else, and `ui-symbols2.woff2`,
  `ui-italic-symbols2.woff2`, `display-symbols2.woff2` and `display-italic-symbols2.woff2`
  are written with an empty `glyf` table, which Chrome rejects: "OTS parsing error: glyf:
  zero-length table". No page asks for them while `latin` is named first, so nothing shows.
  A box drawing character in text of the text font would ask for one, fail, and fall back
  as it would without the file. Found on 2026-10-12 with D30. Montserrat, the `display`
  family of `chassis` since 2026-10-19, gets the two files of `display` too.
- A rule of the source lint for a file that no platform keeps, and a check of
  `chassis.checks.json` against `chassis.formats` (D29).
- The ranges `latin-ext`, `math` and `symbols` of `packages/assets/build/subset-ranges.json`
  differ from the stylesheets of Google Fonts: `U+20AD-20C4` for `U+20AD-20C0`, `U+2074-209F`
  for `U+2074-208E, U+2090-209C`, and eight entries of `symbols`. Found with issue 7 and not
  changed.
- A test of `build/instance-font.py`. It is Python, and the repository has no runner for it.

## Not checked

- The samples of the iOS and the Android page with the fonts of D24: the app fonts are TTF
  where they were OTF, and the second brand is `sinefil` where the Android sample had a
  flavor `example`. Both pages were last run on 2026-10-01.
- The output of `--vector-drawables` and `--res` in CI. It was built and run once, with
  Gradle on an emulator, on 2026-10-01. No job compiles it.
- A WebP or an AVIF file of `--webp` and `--avif` in a browser.
- `--watch` on Windows. CI runs its tests on Linux.

## Parked

Considered and left out. Each needs a reason to come back.

- **A `fonts.css` that the build writes from the font files.** Considered with D31 on
  2026-10-19: the build reads the family, the weight, the style and the axes of a font for
  the source lint, so it could write the rules itself and no brand would write CSS. Left out
  because the default build would then write a file that is not in `source/`, where the
  fonts page says a stylesheet is copied, and a hand-written rule can hold what a font file
  cannot say, such as a `size-adjust`. Taken again when writing the stylesheet by hand goes
  wrong more than once, as an option that writes the rules of the files no stylesheet
  declares.
- **A `shared` layer under `source/<brand>/`** for assets every app gets. The pages do not
  describe it, and adding it changes the override order. The duplication between `docs` and
  `demo` is by design until the maintainer says otherwise.
- **Deriving image variants from one master.** The build stays file-driven: the designer
  exports the variants. `--optimize` re-encodes what is exported, and `--webp` and `--avif`
  write a second format of it, which is a format and not a variant (D12).
- **Removing the `icons/` copy of the `demo` app from `source/`.** Every asset type the pages
  describe is kept, and the icons page describes the copy. The maintainer removed the copy of
  the `docs` app with D33, since the sites take the icons from `@chassis-ui/icons`, and the
  tokens file with D35.
- **A `Package.swift` at the root.** `dist/` is not committed, so a Swift package would name
  folders that a checkout does not have.
- **Publishing the built assets on npm for the sites.** D2, and D9 of the website's roadmap:
  the archives are per platform and app, too large as one package and not what a site reads.
  `--type` and `--include` are the lighter alternative for a site (D13).
- **Processors loaded from outside `packages/assets/build/`**, named in the `chassis` block.
  D20. The registry is read synchronously by the build, the validator, the watch and the
  API, so a path in `package.json` makes each of them load asynchronously, and the shape of a
  processor becomes a public API. An adopting team edits the build, as the build-system page
  says under "Custom platforms". Taken again when an adopter needs a fourth platform, as an
  option off by default.
