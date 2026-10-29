# Open work

What is left to do, decide or check in this repository, and what was considered and left
out. An entry is removed when it is done. A D-number is a decision of
[docs/decisions.md](../docs/decisions.md). Read on 2026-10-29. The entries about the files
of the brands moved to `ref/OPEN.md` of chassis-ui/website-assets with D38.

## For the maintainer

- **The split of the repository, step 6.** Steps 1 to 5 are done with D37 and D38:
  the package is publishable, `chassis-assets archive` and `chassis-assets init` are
  commands, `chassis-ui/website-assets` holds the assets with their history, and this
  repository builds them from the `vendor/assets` submodule. Until the maintainer pushes
  website-assets (`git lfs push origin --all`, then `git push origin main`), the pin of the
  submodule, ac9bf32, exists on this machine only, and CI cannot check it out. The pages
  describe a repository of assets as `init` writes it since step 5, on 2026-10-29; the
  build-system and the use-in-project pages keep their `work-in-progress` callout, since
  their CI samples and the workflows of `init` were not run on GitHub Actions, ; `npx @chassis-ui/assets init` was run from the registry on 2026-10-29, and the
  repository it wrote passed lint, build, verify and archive. Left: (6) the
  consumers on the releases of website-assets (D39): `@chassis-ui/docs` gets a vendor that
  takes a pinned archive, chassis-ui/website#33, which blocks the move of chassis-ui/css#87,
  chassis-ui/icons#19, chassis-ui/figma#14, chassis-ui/react#125 and chassis-ui/tokens#30,
  and sinefil.org takes its archive from website-assets, ozgurgunes/sinefil-web#222; then
  the `app/docs` branch of this repository deleted on GitHub once no site pins it. This
  repository keeps its `vendor/assets` submodule: its CI checks the build on the real files.
  Agreed on 2026-10-29.
- **The choices of D29.** `chassis.ignore` adds names and takes none away, a pattern is a
  name and not a path, a list of `chassis.formats` replaces the rule of a processor, and both
  are read from the configuration without an option. In 0.3.1, and they wait for a
  confirmation.
- **The choices of D30.** The site builds its fonts with `pnpm site:assets`, a script of its
  own beside `pnpm assets:site`, and with the range `symbols2` beside `latin` and
  `latin-ext`. Both are the session's and wait for a confirmation.
- **1.0.** The five requirements that were set for it hold: the pages and the build agree,
  the consumer contract is tested, the build has unit and build tests, releases are
  automated, and the docs site uses `@chassis-ui/docs` 0.6 or later. Whether a release
  becomes 1.0, and when, is not decided.

## Not written

- A build with `--split` that leaves out the file of a range of which a font has only
  glyphs without an outline. With `symbols2`, Inter and Archivo Narrow had the eight
  spaces of the range and nothing else, and `ui-symbols2.woff2`,
  `ui-italic-symbols2.woff2`, `display-symbols2.woff2` and `display-italic-symbols2.woff2`
  are written with an empty `glyf` table, which Chrome rejects: "OTS parsing error: glyf:
  zero-length table". No page asks for them while `latin` is named first, so nothing shows. Since D39 the release
  archives of website-assets carry these files to every Chassis site and to sinefil.org.
  A box drawing character in text of the text font would ask for one, fail, and fall back
  as it would without the file. Found on 2026-10-12 with D30. Montserrat, the `display`
  family of `chassis` since 2026-10-19, gets the two files of `display` too.
- A rule of the source lint for a file that no platform keeps, and a check of
  `chassis.checks.json` against `chassis.formats` (D29).
- The ranges `latin-ext`, `math` and `symbols` of `packages/assets/build/subset-ranges.json`
  differ from the stylesheets of Google Fonts: `U+20AD-20C4` for `U+20AD-20C0`, `U+2074-209F`
  for `U+2074-208E, U+2090-209C`, and eight entries of `symbols`. Found with issue 7 and not
  changed.

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
- **Deriving image variants from one master.** The build stays file-driven: the designer
  exports the variants. `--optimize` re-encodes what is exported, and `--webp` and `--avif`
  write a second format of it, which is a format and not a variant (D12).
- **A `Package.swift` at the root of a repository of assets.** `dist/` is not committed, so
  a Swift package would name folders that a checkout does not have.
- **Publishing the built assets on npm for the sites.** D2, and D9 of the website's roadmap:
  the archives are per platform and app, too large as one package and not what a site reads.
  `--type` and `--include` are the lighter alternative for a site (D13).
- **Processors loaded from outside `packages/assets/build/`**, named in the `chassis` block.
  D20. The registry is read synchronously by the build, the validator, the watch and the
  API, so a path in `package.json` makes each of them load asynchronously, and the shape of a
  processor becomes a public API. An adopting team edits the build, as the build-system page
  says under "Custom platforms". Taken again when an adopter needs a fourth platform, as an
  option off by default.
