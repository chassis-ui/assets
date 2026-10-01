# Chassis Assets Roadmap

> **Scope:** what it takes to make `chassis-assets` professional, production-ready and easy to
> contribute to, in the pattern of `chassis-tokens` and under the conventions of
> `chassis-website`, **without changing what the project is**. Written to be worked through over
> several sessions.
>
> **The specification is the documentation.** The eleven pages in `site/content/docs/` describe
> the product: a file-driven build that copies the assets a designer exports into
> `source/<brand>/<app>/<type>/`, applies the naming and format rules of each platform, and
> writes `dist/`. Every session keeps that. Where the build falls short of a page, the gap is
> listed in [Findings](#findings) and closed in Phase 1, by fixing the build or, where the page
> promised something the build never did, by correcting the page. See [Principles](#principles).
>
> **This roadmap changes this repository only.** Work that belongs in a sibling repository is
> recorded in [Tasks for the siblings](#tasks-for-the-siblings) and in `ref/SIBLING_TASKS.md`
> of `chassis-website`. No task below edits a sibling.
>
> **Baseline:** written 2026-09-30 at `main` `9440b60`, version 0.1.8, after the recovery that
> [ROADMAP-2026-09-29-superseded.md](ROADMAP-2026-09-29-superseded.md) records. Every finding
> was checked against the code, the pages, a full build, `chassis-ui/tokens` at `5b9c60f` and
> `chassis-ui/website` at `d83a1d6`, on that date.

## How to use this document

1. Pick the lowest-numbered phase that still has unchecked tasks. Phases 1 and 2 come first,
   in that order. Phases 3, 4 and 5 can be interleaved once Phase 2 has a green test suite.
   Phase 6 is optional and every task of it is a feature that a maintainer asks for.
2. Each phase lists its tasks as checkboxes, grouped into session-sized blocks. Tick a task
   when it is merged into `develop`, not when it is started.
3. Each phase has exit criteria. A phase is done when all of them hold.
4. Add a line to the [session log](#session-log) at the end of every session.
5. Decisions are collected in [Decisions](#decisions). A task that depends on one names it.
   The maintainer decided D1, D2 and D3 on 2026-09-30 and delegated the rest: a session takes
   an open decision by its recommendation, records it, and goes on. Only a decision that
   changes the consumer contract or the output of a default build goes back to the maintainer.
6. When a session finds work for a sibling, add it to
   [Tasks for the siblings](#tasks-for-the-siblings) and do not do it.
7. The [consumer contract](#the-consumer-contract) and the [Principles](#principles) hold in
   every session. Breaking either is not a task of this roadmap.

## Principles

What the superseded roadmap got wrong, stated as rules so that it does not happen again.

1. **The build stays file-driven.** A designer adds a file to `source/<brand>/<app>/<type>/`
   and the build does the rest. No manifest, no declaration file, no JSON that has to be
   maintained beside the assets. A new feature that needs input beyond the file tree is
   opt-in, off by default, and leaves the output of the default build untouched.
2. **The source layout stays.** `source/<brand>/<app>/<type>/`, with `default` as the
   fallback brand, the override order `<brand>/<app>` over `default/<app>`, and
   `chassis.defaults.brandFolder` to rename the fallback. Any folder name is a type. The
   layout the pages describe is the one the code reads.
3. **Every asset type the pages describe is kept.** Fonts in every format the pages name,
   WOFF and WOFF2 for the web and TTF and OTF for the apps, with the stylesheets beside them.
   Icons as the build output of `chassis-icons`, copied in. Images with the variants the
   designer exported. Anything else under any other folder. Nothing is removed from `source/`
   because a consumer of today does not read it.
4. **Add, do not replace.** The build in `build/` is the build. It gets tests, a type check,
   options and fixes. It is not rewritten beside itself, and its commands and flags
   (`pnpm assets`, `--brand`, `--app`, `--platform`, `--clean`, `--no-clean`,
   `pnpm assets:analyze`, `pnpm assets:validate`) keep working.
5. **The pages are the specification, and they win over the code.** When the build does less
   than a page says, the build is fixed. When a page describes something the build never did
   and no consumer needs, the page is corrected and the feature goes to Phase 6 as an opt-in.
   The [Findings](#findings) say which is which; a session does not decide it alone.
6. **`dist/` is not committed and the layout of `dist/` is the output contract.** It is
   `dist/<platform>/<app>/<brand>/`, the layout the code writes, `chassis-tokens` writes and
   the six sites read. The pages that show `dist/<platform>/<brand>-<app>/` are corrected.
7. **Match the siblings in tooling, not in product.** Tests, verify, CI, Changesets,
   community files, `AGENTS.md` and the docs site follow `chassis-tokens` and the website's
   reference documents. The product follows its own pages.
8. **The default build needs nothing installed.** `build/` imports Node.js modules only and
   `package.json` has no `dependencies`, so `pnpm install --ignore-workspace` followed by
   `pnpm assets:site` works on a bare checkout. A feature that needs a package loads it when
   its option is given, never at import time.

## Summary

| Phase                                | Goal                                                                         | Sessions | Depends on | Model |
| ------------------------------------ | ---------------------------------------------------------------------------- | -------- | ---------- | ----- |
| [0](#phase-0-green-baseline)         | CI runs where the work is and means something. Done.                         | done     | none       |       |
| [1](#phase-1-pages-and-build-agree)  | The build does what the pages say, and the pages say what the build does     | 3        | 0          | Fable |
| [2](#phase-2-tests-and-checks)       | Unit tests, a hermetic build test, a contract check, a type check, all in CI | 2        | 1          | Opus  |
| [3](#phase-3-package-and-release)    | One layout, Changesets, tags that are right, a release per version           | 2        | 2          | Opus  |
| [4](#phase-4-contributor-experience) | A contributor or an agent gets from clone to pull request unaided            | 2        | 2          | Opus  |
| [5](#phase-5-the-docs-site)          | The site takes `@chassis-ui/docs` 0.6.1 and its pages pass the style guide   | 2        | 1          | Opus  |
| [6](#phase-6-optional-features)      | Opt-in features the pages promised, each off by default                      | 1 each   | 2, 3       | Fable |

### Which model for which session

Fable where the design is open or a mistake reaches every consumer; Opus where the task is
specified and a check says whether it worked.

| Session                                       | Model | Why                                                                                                                            |
| --------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1.1 Inventory of the gaps                     | Fable | Reads every page against the code and sorts each gap into "fix the build" or "fix the page". Every later session builds on it. |
| 1.2 Fix the build                             | Fable | Changes the build with no tests yet. Each fix is small, but the output of six sites depends on it.                             |
| 1.3 Fix the pages                             | Opus  | Edits with the inventory of 1.1 as the list. `pnpm site:build` and the contract check tell whether it worked.                  |
| 2.1 Unit and build tests                      | Opus  | Tests written against code that exists, in the pattern of `chassis-tokens`.                                                    |
| 2.2 Contract, verify and CI                   | Opus  | Specified checks. The contract check can be ported from `archive/rewrite-2026-09`.                                             |
| 3.1 Layout and package                        | Opus  | D3 decides the layout first. The website's `chassis-docs vendor` fixes what the consumer runs.                                 |
| 3.2 Changesets and release                    | Opus  | `chassis-tokens` and the website have a working pipeline to copy from. D2 decides npm first.                                   |
| 4.1 Accurate README and one way to run things | Opus  | Rewriting from `package.json` and the CLI's own help.                                                                          |
| 4.2 Community files and agent rules           | Opus  | Standard files, copied from `chassis-tokens` and adjusted.                                                                     |
| 5.1 Upgrade to `@chassis-ui/docs` 0.6.1       | Opus  | Follows `UPGRADING.md` of the package and the sibling tasks A1 to A23.                                                         |
| 5.2 Pages against the style guide             | Opus  | Editing with `WRITING.md` of `chassis-tokens` as the checklist.                                                                |
| 6.x                                           | Fable | Each is a design of its own, and each touches the output of an app.                                                            |

Switch to Fable in any session when a task turns out to be less specified than it looked.

## Breaking changes

Backward compatibility with the build of 0.1.8 is a goal. Compatibility with the consumers
is a rule.

- The [consumer contract](#the-consumer-contract) holds on `app/docs` at every commit.
- The layout of `dist/`, the names of the files in it and the commands and flags of the build
  are the public API. While the version is `0.x`, a change to one of them is a minor bump
  whose changeset says that it breaks. Everything else is a patch.
- Phase 1 changes the output where a page says the build is wrong, see F4 and F5. Each such
  change is listed in the changelog of the release that ships it, with the old and the new
  path.
- **1.0 requires:** the pages and the build agree, the contract is tested, the build has
  unit and build tests, releases are automated, and the docs site uses `@chassis-ui/docs`
  0.6 or later.

## The consumer contract

What the rest of the ecosystem reads from this repository. Found in
`packages/docs/src/cli/assets.js` and `packages/docs/src/libs/paths.ts` of `chassis-website`,
in `packages/docs/README.md` of `@chassis-ui/docs` 0.6.1, in `build/sync-submodules.js` of
`chassis-tokens`, and in the sources of the six sites. Verified again on 2026-09-30.

| Consumers rely on                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `app/docs` branch. Every Chassis site vendors this repository as the submodule `vendor/assets`, pinned to a commit of that branch. `chassis-docs sync-submodules` moves the pin to its tip.                                                                                                                            |
| `git lfs pull` gives the real files. Fonts and raster images are stored with Git LFS, see `.gitattributes`.                                                                                                                                                                                                                |
| `pnpm install --ignore-workspace` at the root, then `pnpm assets:site`, writes `dist/web/docs/chassis/`. `chassis-docs vendor` runs exactly these two commands and fails when the folder is missing.                                                                                                                       |
| That folder is copied to `/static/` of every site. The layouts of `@chassis-ui/docs` read `images/site-logo.svg`, `images/favicon.png`, `images/favicon-16x16.png`, `images/favicon-32x32.png`, `images/apple-touch-icon.png` and `images/social-image.png`. The build of a site fails when `social-image.png` is missing. |
| `icons/cx-sprite.svg`, the sprite of the home page icons. The home page of every site imports it at build time.                                                                                                                                                                                                            |
| The home page images under `images/home/`, by name: `comp-gallery-*` as PNG and WebP with the `-small` and `@2x` variants, `figma-*` as WebP with `@2x`, and the SVG files.                                                                                                                                                |
| The logos under `images/logo/`, as SVG, `chassis-{logo,icon}-{brand,white}-banner.svg` among them.                                                                                                                                                                                                                         |
| The screenshots under `images/figma/components/<component>/{light,dark}/`, as PNG with `@2x`, read by name by the pages of `chassis-figma`. The kebab-case renaming of the web build is what makes some of those names exist, see F14.                                                                                     |

Nothing outside this repository reads `dist/ios/` or `dist/android/` today. They are the
output the pages describe for apps, and Phase 1 makes them match the pages.

## Findings

Each finding says what is wrong, where it was seen, and which principle or phase handles it.
"Page wins" means the build is fixed; "code wins" means the page is corrected and the feature
goes to Phase 6 if it is wanted.

### The pages against the build

| ID  | Finding                                                                                                                                                                                                | Evidence                                                                                                                                                                                                                                                                                                                                                                                                     | Handling                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | The pages show `dist/<platform>/<brand>-<app>/`; the build writes `dist/<platform>/<app>/<brand>/`.                                                                                                    | `quick-start.mdx`, `build-system.mdx`, all three `use-in-project/` pages and `README.md` before Phase 0 say `chassis-docs`. `build-assets.js:504` writes `dist/${platform}/${app}/${brand}`. The six sites read `dist/web/docs/chassis`. `chassis-tokens` writes `dist/<platform>/<app>/<brand>/` too.                                                                                                       | Code wins, D1. Session 1.3 corrects every page. Principle 6.                                                                                                                                          |
| F2  | The fonts page says the web gets WOFF, WOFF2, TTF and OTF; the build-system page and the build give the web WOFF, WOFF2 and the stylesheets only.                                                      | `fonts.mdx` "File Formats" and "Web Distribution" list `text-normal.ttf` under `dist/web/`. `processors/web.js` has `allowedFontFormats: ['.woff', '.woff2', '.css', '.scss']`. `build-system.mdx` says "Only WOFF/WOFF2 formats copied (TTF/OTF excluded)".                                                                                                                                                 | D4 decides. Either the page loses TTF and OTF for the web, or `web.js` gains them. Session 1.1 asks.                                                                                                  |
| F3  | The font stylesheets in `source/` load files that do not exist.                                                                                                                                        | `source/default/docs/fonts/text.css` loads `InterVariable.woff2` and 18 `Inter-*.woff2`; the folder holds `text-*`, `display-*` and `code-*` files. `code.css` loads `FiraCode-*.woff`. The same two files are in `default/demo/fonts/`. They are copied to `dist/web/` as they are.                                                                                                                         | Page wins. Session 1.2 rewrites the two stylesheets to declare `@font-face` for the files in the folder, with the semantic names the fonts page describes.                                            |
| F4  | Android density folders are written under each subfolder of `images/`, so a nested image never lands in `drawable/`.                                                                                   | `dist/android/demo/chassis/images/logo/drawable-xhdpi/` and `images/home/drawable/` exist beside `images/drawable/`. `images.mdx` says the subfolder structure "is preserved in the distribution" and `android-applications.mdx` shows only `images/drawable*/` and copies only those. Android `res/` does not allow nested folders.                                                                         | D5 decides. Session 1.1 proposes the smallest layout that both pages can describe truthfully.                                                                                                         |
| F5  | The icons page shows Android icons as vector drawables (`ic_menu.xml`) and iOS icons as PDF sets; the build copies the SVG file with a new name.                                                       | `icons.mdx` "Android Distribution" lists `ic_arrow_right.xml`. `processors/android.js` has `allowedIconFormats: ['.svg']` and no conversion. The same page says, earlier, that every file is distributed "regardless of format", with `ic_alert_circle_solid.svg` as the example.                                                                                                                            | Code wins. Session 1.3 makes the page say SVG. Conversion to vector drawables is Phase 6, task 6.2, with `svg2vectordrawable` as `chassis-tokens` uses it.                                            |
| F6  | The build-system page documents the Programmatic API with imports that fail in a script.                                                                                                               | `build/api/index.js` reads `package.json` from the working directory at import time, `generateAssets()` reads `process.argv` even when it is imported and ignores the `brands`, `apps` and `platforms` options that `ChassisAssets.build()` documents, and `process.exit()` is called in three places of the build, one of the analyzer and two of the validator.                                            | Page wins. Session 1.2 makes the library usable: options over `argv`, exceptions over `process.exit()` when imported, `cwd` as an option. The CLI behaviour stays.                                    |
| F7  | The build-system page says a full build cleans `dist/` and a filtered build keeps it; the code does that, but `--clean` with filters removes everything, including the other jobs' output.             | `generateAssets()` removes `dist/` whole. `pnpm assets:site` is `pnpm assets --clean --brand chassis --app docs`, so a consumer build that follows a full build loses `dist/ios/` and `dist/android/`. The page's "Force clean with filters" example reads as if only the filtered output were cleaned.                                                                                                      | D6 decides whether `--clean` with filters removes the whole of `dist/` or only the folders of the selected jobs. Session 1.1 asks.                                                                    |
| F8  | The analyzer cannot find duplicates, and the test that says it finds none passes because of the bug.                                                                                                   | `storeFileHash()` in `build/analyze-assets.js` keys the map by content hash, so a second identical file overwrites the first. `build-system.mdx` promises "accurate duplicate detection".                                                                                                                                                                                                                    | Page wins. Session 1.2 fixes it. Session 2.1 tests it with a fixture that has a duplicate.                                                                                                            |
| F9  | The pages name Node 18 and pnpm 9; the repository needs Node 22.12 and pins pnpm 10.                                                                                                                   | `quick-start.mdx` "Prerequisites"; the CI examples in `build-system.mdx` use `pnpm/action-setup@v2` with `version: 9` and `actions/checkout@v3`. `package.json` has `engines.node >=22.12.0` and `packageManager pnpm@10.33.2`.                                                                                                                                                                              | Session 1.3 corrects the numbers and the examples.                                                                                                                                                    |
| F10 | The build-system page counts 39 tests and three suites; `pnpm test` runs 16 of one suite and the other two do not run in CI.                                                                           | `assets:test` is `node test/build.test.js && node test/analyze.test.js && node test/api.test.js`; the page's table says `assets:test:api` does not rebuild `dist/`, but `build.test.js` deletes `dist/` on exit so `api.test.js` builds it again.                                                                                                                                                            | Phase 2 replaces the numbers with a test suite; session 1.3 drops the counts (WRITING.md §8).                                                                                                         |
| F11 | The icons page describes the `icons/` folder as the output of `chassis-icons`, and the copy in `source/` is stale.                                                                                     | `source/default/docs/icons/` and `demo/icons/` hold `@chassis-ui/icons` 0.3.1 as `icons/` and `svgs/`, plus `cx-sprite.svg`. `css-brand.svg`, `cut-outline.svg` and `cut-solid.svg` of the package are missing from the copy. The page's tree shows `chassis-icons.css`, `chassis-icons.woff2`, `chassis-icons.svg` and `glyphs/`, which is not the layout of the copy.                                      | Page wins on the principle, code wins on the tree. Session 1.2 refreshes the copy from the current `@chassis-ui/icons` and session 1.3 draws the tree as it is. A refresh procedure goes in the page. |
| F12 | The `other` type of the pages is `videos/`, `audio/`, `documents/` and `data/`; the repository has `other/default-tokens.json`.                                                                        | `other.mdx` lists four folders as examples and says any folder is copied. `source/default/docs/other/default.tokens.json` is a Figma variables export, copied to `dist/web/docs/chassis/other/default-tokens.json`. Nothing reads it.                                                                                                                                                                        | Nothing to fix in the build. The maintainer decides whether the file stays (D7). Session 1.3 says in the page that `other/` is one possible folder name, not a type.                                  |
| F13 | The quick-start page tells a designer to commit `dist/`; the build-system page says not to.                                                                                                            | `quick-start.mdx` "Adding a New Asset" step 4: "Commit both source and built assets". `build-system.mdx` "Don't: Commit `dist/` directory to version control". `.gitignore` has `dist/`.                                                                                                                                                                                                                     | Session 1.3 removes the step. Principle 6.                                                                                                                                                            |
| F14 | 43 file names in `source/` break the naming rules of the design-guidelines page, and the web renaming is what makes some consumer files exist.                                                         | 32 screenshots under `images/figma/` have capitals or spaces, `Alert Window.png` among them; 8 have an indicator inside the name, `card-orientation-top@2x-1.png`; `chassis-icons.min.css` and `default.tokens.json` have a dot. The web build writes `alert-window.png`, which `chassis-figma` reads by that name.                                                                                          | Session 1.2 renames the 40 screenshots in `source/` to what the web build writes, so the output does not change. A source lint (session 2.2) keeps it so. F12 covers the tokens file.                 |
| F15 | The fonts are redistributed without their licenses.                                                                                                                                                    | The files are Inter, Archivo Narrow and Fira Code, and Roboto Serif and Roboto Mono in the example brand, all under the SIL Open Font License, which asks for the license text with every copy. `source/` has no license file. The build would copy one; the validator ignores it through `isMetadataFile()` of `asset-types.js`. The design-guidelines checklist says "Licenses verified for distribution". | D8 decides where a license file lives and whether the build copies it. Session 1.2 adds the files.                                                                                                    |
| F16 | The example brand's `fonts.scss` imports Google Fonts, which the fonts page does not describe.                                                                                                         | `source/example/docs/fonts/fonts.scss` is one `@import` of Figtree and Lora. The page describes font files and `@font-face`. The website's D15 chose Google Fonts for the sites.                                                                                                                                                                                                                             | Nothing to fix. Session 1.3 adds a sentence to the fonts page: a stylesheet in `fonts/` is copied like a font, and may load fonts from a service instead of the folder.                               |
| F17 | Every page carries a "work in progress" or "created by AI" callout.                                                                                                                                    | `introduction.mdx` has `work-in-progress`; the three `use-in-project/` pages have `created-by-ai`. The site's `config.yml` says `current_version: "0.1.8"` and the introduction lists a page with `slug: test-slug`, which is a broken link (website task A23).                                                                                                                                              | Session 1.3 removes a callout only from a page it has checked line by line. Session 5.2 removes the rest. The slug is fixed in 1.3.                                                                   |
| F18 | A filter value that is not configured builds nothing and exits 0.                                                                                                                                      | `pnpm assets --brand nope` prints "completed successfully" with 0 files. Found in session 1.1. `chassis-tokens` fails and names the configured values.                                                                                                                                                                                                                                                       | Page wins by omission: session 1.2 fails with the configured values.                                                                                                                                  |
| F19 | The validator prints every result twice.                                                                                                                                                               | `pnpm assets:validate`: each check line appears once from `addTestResult()` and once from the summary in `validate-assets.js:861`. Found in session 1.1.                                                                                                                                                                                                                                                     | Session 1.2 prints the summary only.                                                                                                                                                                  |
| F20 | The icons page says every file under `icons/` is distributed; iOS keeps SVG and PDF and Android keeps SVG, so the icon font and its stylesheets are dropped for the apps, and a PNG icon would be too. | `allowedIconFormats` in `ios.js` and `android.js`. `icons.mdx` "File Formats". The design-guidelines page lists PNG icons as an alternative for both platforms. No PNG exists under `icons/` today. Found in session 1.1.                                                                                                                                                                                    | D15: `.png` is added to both filters in session 1.2, which changes no output today; the pages say what is kept per platform.                                                                          |
| F21 | The design-guidelines page recommends WebP for Android; the build drops WebP for Android.                                                                                                              | `excludedImageFormats: ['.webp']` in `android.js`; the build-system page says the same. `source/` has 24 WebP images under `images/`. Found in session 1.1.                                                                                                                                                                                                                                                  | D14, the maintainer's: including WebP adds files to the default output. Until decided the build keeps dropping it and session 1.3 corrects the table.                                                 |
| F22 | The Android page contradicts itself and its copy script copies nothing for icons.                                                                                                                      | Its "Package Structure" tree puts `hero_background.png` beside the density folders and shows `icons/ic_menu.xml`; its "Density Folders Structure" section has `drawable/`. `sync-assets.sh` copies `icons/*.xml`, and the icons are `icons/svgs/ic_*.svg`. Found in session 1.1.                                                                                                                             | Session 1.3.                                                                                                                                                                                          |
| F23 | The build-system page says "Use 78 builds during development".                                                                                                                                         | A typo of "filtered builds". Found in session 1.1.                                                                                                                                                                                                                                                                                                                                                           | Session 1.3.                                                                                                                                                                                          |
| F24 | The Programmatic API section names methods and options that differ from the code.                                                                                                                      | `getPlatforms()` is per app and `getAllPlatforms()` is the one described; `analyzer.options` reads `brands`, not `brand`; `getPlatforms(appName)`. Found in session 1.1.                                                                                                                                                                                                                                     | Session 1.3, after session 1.2 has settled the library.                                                                                                                                               |
| F25 | `shouldIgnoreFile()` matches none of its wildcard patterns but `._*`.                                                                                                                                  | `*~`, `*.swp`, `*.tmp` and `*.temp` became `^\.*\.swp$`: the dot that `*` turns into was escaped with the others, so `a.swp` was copied. Found in session 2.1 by the unit tests. No such file is in `source/`.                                                                                                                                                                                               | Fixed in session 2.1: the dots are escaped before `*` is replaced. No output changes.                                                                                                                 |
| F26 | `pnpm assets:analyze --platform <name>` counts nothing in `dist/`.                                                                                                                                     | `shouldIncludePath()` of the analyzer checked the output folder itself, whose relative path is `''`, against the platform filter. Found in session 2.1.                                                                                                                                                                                                                                                      | Fixed in session 2.1.                                                                                                                                                                                 |
| F27 | `ChassisAssets` ignores its `cwd` in `getStats()` and `validate()`, and sorts an SVG under `images/logo/` as an icon.                                                                                  | `countAssets('source')` and `path.join('source', …)` resolve from the working directory; `categorizeAsset()` reads the name of the folder a file is in, not the type folder the build decides by. Found in session 2.1.                                                                                                                                                                                      | Fixed in session 2.1: paths from `cwd` and `out`, the category from the type folder.                                                                                                                  |

### Tooling, against `chassis-tokens` and the website's reference documents

| ID  | Finding                                                                                                                   | Evidence                                                                                                                                                                                                                                                                                                                                                           | Handling                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | The tests are slow, not hermetic, and cannot fail for the right reasons.                                                  | Hand-rolled runners. `build.test.js` runs full builds of the real 4537-file source and deletes `dist/` on exit. The pure functions in `build/processors/` have no unit test. `chassis-tokens` runs Vitest in about ten seconds with fixtures and a golden baseline.                                                                                                | Phase 2.                                                                                                                                                    |
| T2  | There is no type check, and the build files have no shared JSDoc types.                                                   | No `tsconfig.json`. `chassis-tokens` checks its build with `checkJs` and JSDoc, and forbids converting it to TypeScript.                                                                                                                                                                                                                                           | Session 2.2, additive: a `tsconfig.json` and `pnpm assets:typecheck`.                                                                                       |
| T3  | The build has no verify command that compares a fresh build with a reference, and no contract check.                      | `assets:validate` checks the structure of an existing `dist/`. `chassis-tokens` has `verify` against the committed `dist/` and `verify:presets` against `test/golden/`. `archive/rewrite-2026-09` has a `contract.js` that checks the consumer contract file by file.                                                                                              | Session 2.2: `pnpm assets:verify` runs the validator and the contract check; a golden baseline of one small fixture covers the rest.                        |
| T4  | Two tags point at one commit, and neither is the commit of its version.                                                   | `v0.1.7` and `v0.1.8` both point at `867611c`, "fix dev server and hero section clone command". `a4b6445` bumps the version to 0.1.8. `tag-release.yml` tags `app/docs` when `package.json` changes its version, so a version bumped elsewhere is never tagged. Website task AST4.                                                                                 | Session 3.2 moves `v0.1.8` to `a4b6445`, documents `v0.1.7`, and replaces `tag-release.yml`.                                                                |
| T5  | Versions are bumped by a script of this repository; the siblings use Changesets.                                          | `build/change-version.js` edits `package.json`, `README.md` and `site/config.yml`. Website decision D5 and `chassis-tokens` use Changesets, versioned on `develop`, with `sync-version-refs.js` for the site config, and publish or release from `main`.                                                                                                           | Session 3.2.                                                                                                                                                |
| T6  | The package says it is published to npm and it is not.                                                                    | `publishConfig` is public and `files` ships `source/**` and `build/**`, 22 MB of LFS files. `npm view @chassis-ui/assets` is 404. The pages never say `npm install`; they say clone or submodule. `ref/ARCHITECTURE.md` of the website says "never published to npm". Website task AST3.                                                                           | D2 decides. Session 3.1 makes `package.json` say what was decided.                                                                                          |
| T7  | One `package.json` carries the site's toolchain, and every consumer installs it.                                          | 51 `devDependencies`, most of them Astro and its lint tools. `pnpm install --ignore-workspace` in `chassis-docs vendor` installs all of them in each of six repositories to run a copy script. `chassis-tokens` keeps its site in `packages/site` with its own `package.json`.                                                                                     | D3 decides the layout. Session 3.1.                                                                                                                         |
| T8  | Community health files, agent instructions and an architecture document are missing.                                      | No `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CODEOWNERS`, issue forms, pull request template, `dependabot.yml`, `AGENTS.md`, `WRITING.md` or `docs/`. Website tasks A11 and A12; `chassis-tokens` has all of them.                                                                                                                                  | Phase 4.                                                                                                                                                    |
| T9  | The README describes the build only in part, and the site's contributing section points at `main`.                        | `README.md` was corrected in Phase 0 for the layout, the commands and the clone steps, and still says nothing about `develop`, Git LFS beyond one line, the tests, or the consumer contract. "Contributing" says to open a pull request against `main`; the ruleset takes commits through `develop` (D1 of the superseded roadmap).                                | Session 4.1.                                                                                                                                                |
| T10 | The site is on `@chassis-ui/docs` 0.5.1 with copies of the package's libraries, scripts and static files.                 | `package.json` has `@chassis-ui/docs ^0.5.1`. `site/src/libs/` has the copies that website tasks A3 and A4 delete. `build/html-validate.js`, `vnu-jar.js` and `build-site.js` are the copies of A5; `build-site.js` is called by nothing. `site/static/static/js/` has two scripts the package ships. `config.yml` has `blog`, which nothing reads, and `docsDir`. | Phase 5.                                                                                                                                                    |
| T11 | The site's `sitemap-index.xml` lists the website's sitemap and the site has broken links.                                 | Website tasks A22 and A23: `sitemap-index.xml` lists `https://chassis-ui.com/sitemap-0.xml`; `/assets/docs/getting-started/test-slug/` is linked from the introduction.                                                                                                                                                                                            | Sessions 1.3 and 5.1.                                                                                                                                       |
| T12 | A checkout without Git LFS builds pointer files and nothing says so.                                                      | Seen in session 0.1 of the superseded roadmap: every PNG was a pointer, and the site build failed inside `imageSize()` of the layout. The README says to install Git LFS; the build copies the pointers.                                                                                                                                                           | Session 1.2: the build fails with a message when a source file is an LFS pointer, unless `--allow-lfs-pointers` is given for CI jobs that need no binaries. |
| T13 | macOS writes `.DS_Store` into `dist/` during a build, and the naming check of the tests took it for a file with capitals. | Seen in session 2.1 of the superseded roadmap, on macOS only. `a003053` on `main` leaves hidden files out of the check. `shouldIgnoreFile()` covers `source/`, not `dist/`.                                                                                                                                                                                        | Session 2.1 keeps the exclusion in the new tests.                                                                                                           |

## Phase 0: green baseline

Done on 2026-09-30, see the superseded roadmap for the record. What holds since then:

- CI runs on pull requests and on pushes to `develop`, with the jobs Lint, Assets, Site and
  Audit, reading Node.js from `.nvmrc`, with a Git LFS cache. Both workflows are pinned by
  commit, keep no credentials and have timeouts.
- The ruleset "Protect main and app/docs" covers `main`, `staging` and `app/docs`: no
  deletion, no force push, the four checks required. `develop` has no rule. Secret scanning,
  push protection, the dependency graph and Dependabot alerts are on.
- `pnpm audit` is clean, Astro is 7.3.5, `.nvmrc` is 24, `engines` is `>=22.12.0`, Prettier
  covers the repository, `pnpm check` can fail, `--brand` takes several values, `pnpm test`
  exists, `generateAssets` is spelled right, and the README's layout, commands and clone steps
  are right.
- The branch flow is the website's: work goes to `develop`, CI runs there, and the same commit
  is pushed to `staging`, `main` and `app/docs`. Vercel deploys `main` and `staging`.

### Left for the maintainer

- [ ] `Audit` is a required check. The website does not require it (its D1). Decide.
- [ ] Merge locally or with pull requests. Both work with the ruleset. Say which in
      `CONTRIBUTING.md` (session 4.2).

## Phase 1: pages and build agree

**Goal:** the build does what the pages say, and the pages say what the build does. Nothing
in `source/` moves except the 40 screenshots of F14, and no consumer file changes its path.

### Session 1.1: inventory of the gaps

Read every page against the code, in the order of the sidebar, and write the inventory.

- [x] For each page, list every statement about the build, the layout or the output, and mark
      it true, false or unverifiable. Put the list in `docs/pages-vs-build.md`, one table per
      page. This document is temporary and is deleted when Phase 1 is done.
- [x] Sort every false statement into "fix the build" or "fix the page", by Principle 5. Add
      to [Findings](#findings) what F1 to F17 miss.
- [x] Record D4, D5, D6, D7 and D8 as decided, and note where the inventory contradicts a
      recommendation. Such a contradiction goes to the maintainer; nothing else does.
- [x] Write the first version of `docs/architecture.md`: the build in one picture (read
      configuration, resolve `default` and brand, copy with the processor's filters, rename,
      density folders, clean empty folders), the modules and what each owns, the configuration,
      the command line, the output contract per platform as it is, and the known oddities.
      Take the section names from `docs/architecture.md` of `chassis-tokens`. Every claim
      points at a line of code.

**Acceptance:** the inventory names every page and every false statement has a decision.

### Session 1.2: fix the build

Every task keeps the output of `pnpm assets` identical except where it says otherwise. Run
`pnpm assets` before and after and diff `dist/`.

- [x] F3: rewrite `text.css` and `code.css` of `default/docs/fonts/` and `default/demo/fonts/`
      to declare the files in the folder, one `@font-face` per file, with the family names of
      the fonts page. Changes the content of four files in `dist/web/`.
- [x] F6: make the library usable. `generateAssets(options)` reads `options.brands`, `apps`,
      `platforms`, `clean` and `quiet`, and `argv` only in the CLI entry. `cwd` is an option
      that defaults to `process.cwd()`. Imported code throws; the CLI entry catches and exits.
      `package.json` is read when a function is called, not when the module loads. Same for
      the analyzer and the validator.
- [x] F8: fix `storeFileHash()` and duplicate detection in `analyze-assets.js`.
- [x] F4, as D5 decided.
- [x] F7, as D6 decided.
- [x] F2, as D4 decided.
- [ ] F11: refresh `source/default/docs/icons/` and `demo/icons/` from the current
      `@chassis-ui/icons`, keep `cx-sprite.svg`. The steps are in `docs/architecture.md`,
      "Refreshing the icons". **Needs a machine with Git LFS**: the icon font files are LFS
      objects, and session 1.2 ran without `git lfs`. Left for the maintainer or a session
      with LFS. Changes the content of `dist/web/*/icons/`.
      `dist/web/docs/chassis/images/figma/` before and after: identical.
- [x] F15, as D8 decided.
- [x] F18: a filter value that is not configured fails and names the configured values.
- [x] F19: the validator prints each result once.
- [x] F20, D15: add `.png` to `allowedIconFormats` of iOS. Not Android: the build places only
      `images/` in density folders, and a PNG icon without one is not an Android icon. No
      output changes.
- [x] T12: fail on an LFS pointer in `source/` with a message that names the file and
      `git lfs pull`, unless `--allow-lfs-pointers`.
- [x] Add `--out <dir>` to the build, the analyzer and the validator, defaulting to `dist`.
      Additive; Phase 2 needs it for hermetic tests.
- [x] Add `--dry-run`, which prints the jobs and the file count of each without writing.
      Additive.
- [x] A changeset for every task that changes `dist/`, naming the files. Written as an
      `[Unreleased]` section of `CHANGELOG.md` until session 3.2 brings Changesets.

**Acceptance:** `pnpm assets && pnpm assets:validate && pnpm test` pass; the diff of `dist/`
against the build before the session lists only the files the tasks name; a site built with
the new `dist/web/docs/chassis` is identical apart from the four stylesheets and the icons.

### Session 1.3: fix the pages

Edit the eleven pages with the inventory of 1.1 as the list. Every token of the build's
behaviour that a page states is checked against a run. Style follows `WRITING.md` of
`chassis-tokens` for language and accuracy; the structure of the pages is left for session
5.2.

- [x] F1: `dist/<platform>/<app>/<brand>/` everywhere, with `dist/web/docs/chassis/` as the
      example. `README.md` too.
- [x] F2, F4 and F5: the distribution trees of the fonts, images and icons pages and of the
      three `use-in-project/` pages show what the build writes.
- [x] F9: Node 22.12 or later, pnpm from `packageManager`, current action versions in the CI
      examples.
- [x] F10: drop the test counts; describe `pnpm test` as Phase 2 leaves it, or as it is if
      Phase 2 has not run.
- [x] F12: `other/` is a folder name, not a type; the four folders of the page are examples.
- [x] F13: remove "commit built assets" from the quick-start workflow.
- [x] F16: a stylesheet in `fonts/` is copied like a font.
- [x] F17: fix `slug: test-slug`; remove a callout only from a page checked line by line.
- [x] F21: the design-guidelines table says WebP is dropped for iOS and Android, or D14.
- [x] F22: the Android page's tree and copy script match the output.
- [x] F23: "filtered builds".
- [x] F24: the API methods and options as in the code.
- [x] The Programmatic API section shows the library as session 1.2 left it, with imports
      that work from a script in another folder.
- [ ] `pnpm site:build` and `pnpm site:lint` pass; the link check of the website
      (`pnpm site:lint:links` there, task A23) finds no broken link on `/assets/`. Lint and
      `check:astro` pass locally, and the Site job of CI built the site on `6c9c645`; the link
      check waits for the website's crawl of the deployed site.
- [x] Delete `docs/pages-vs-build.md`.

**Acceptance:** every statement about the build in the pages is true, checked by running it.

### Exit criteria

- [ ] D1, D4, D5, D6, D7 and D8 are decided and applied.
- [ ] The inventory has no open row and is deleted.
- [ ] `docs/architecture.md` describes the build as it is, and every claim points at code.
- [ ] `pnpm assets:site` writes every file of the consumer contract, by path and name.

## Phase 2: tests and checks

**Goal:** the build has unit tests, a hermetic build test, a contract check and a type check,
and CI runs them in under two minutes. Pattern: `packages/tokens/test/README.md` of
`chassis-tokens`: real files, no mocks, pure functions first.

### Session 2.1: unit and build tests

- [x] Add Vitest. `pnpm test` runs `vitest run --dir test`. The three hand-rolled runners
      are deleted when their checks are covered.
- [x] Unit tests for `processors/*.js`: `renameFile()` of each platform,
      `extractResolutionIndicator()`, the density mapping, the `ic_` prefix, the format
      filters. Table-driven, every rule of the pages as a row. The filter of a type is
      `keepsFile()` of `build-assets.js` now, so that it can be tested as a table.
- [x] Unit tests for `shouldIgnoreFile()`, `isMetadataFile()`, `hasAllowedExtension()`,
      `cleanupEmptyDirectories()` and the collision tracker (`createCollisionTracker()`).
- [x] A fixture source under `test/fixtures/source/`: two brands, two apps, every type, a
      nested folder, a `@2x` and `@3x` set, a WebP, a font in four formats, a duplicate, a
      name with capitals, an LFS pointer. Small enough to read. The pointer is written by
      its test into a copy of the fixture, so that the golden output is a default build.
- [x] A golden baseline under `test/golden/`: the output of the fixture for the six jobs,
      committed, and a test that builds the fixture into a temporary folder with `--out` and
      compares file by file. The command that writes the baseline again is documented:
      `pnpm test:golden`, in `test/README.md`.
- [x] A test of the analyzer on the fixture: the duplicate is found, the counts are right.
- [x] A test of the validator on the golden output: passes; and on the golden output with a
      file removed: fails and names it.
- [x] A test of the CLI: `--brand`, `--app`, `--platform`, `--clean`, `--no-clean`,
      `--dry-run`, an unknown value, `--help`.
- [x] T13: hidden files are left out of every naming check.

**Acceptance:** `pnpm test` runs in under 15 seconds and touches nothing outside `test/`
and a temporary folder.

### Session 2.2: contract, verify and CI

- [x] `build/contract.js`: the consumer contract as data, one entry per file or pattern, with
      the consumer that reads it. `pnpm assets:contract` checks `dist/web/docs/chassis`
      against it. Port it from `archive/rewrite-2026-09` where it fits. Ported, and checked
      again against the website at `d83a1d6` and `chassis-figma` at `dd89279`. The archive's
      screenshot rule failed on 18 Figma export copies that no page reads; they need both
      modes and no `@2x` now (`EXPORT_COPY`).
- [x] `pnpm assets:verify` runs the validator and the contract check on an existing `dist/`.
- [x] `pnpm assets:lint:source`: file names against the rules of the design-guidelines page,
      LFS pointers, files outside a type folder. Warns on the known oddities that D7 keeps.
      Three files: `default.tokens.json` and the two `chassis-icons.min.css`. Warns too about
      a brand or an app folder the build does not read.
- [x] T2: `tsconfig.json` with `checkJs`, JSDoc types in `build/types.js`, and
      `pnpm assets:typecheck`. No TypeScript files. The site's three scripts in `build/` are
      left out until session 5.1 replaces them.
- [x] CI: the Assets job runs `assets:lint`, `assets:lint:source`, `assets:typecheck`,
      `test`, then a full build, `assets:verify`. The Site job stays. `assets:lint` moved
      from the Lint job.
- [ ] `AGENTS.md` (session 4.2) and `CONTRIBUTING.md` get the table of checks per changed
      area. The table is in `docs/architecture.md`, "Checks per changed area"; session 4.2
      copies it into the two files when it writes them.

**Acceptance:** CI is green on `develop` and the four required checks pass in under five
minutes including the LFS pull.

### Exit criteria

- [x] Every pure function of the build has a unit test.
- [x] The golden test fails when a processor changes a name. Checked in session 2.1 by
      changing the web processor: the golden test failed.
- [x] The contract check fails when a file of the consumer contract is missing.
- [x] A pull request runs all of it. CI on `e4abe74`: Lint, Assets, Site and Audit green,
      each in under 40 seconds with the LFS pull.

## Phase 3: package and release

**Goal:** one layout, one version, one release per version, in the pattern of
`chassis-tokens` and the website's D5.

### Session 3.1: layout and package

D3 is decided: `source/` and `dist/` stay at the root, the build moves to `packages/assets/`
and the site to `packages/site/`, as in `chassis-tokens`.

- [x] `pnpm-workspace.yaml` with `packages/*`. The root `package.json` becomes the private
      workspace `chassis-assets-workspace`, with the `chassis` configuration block, the
      scripts, and no `dependencies`. `packages/assets/package.json` is `@chassis-ui/assets`
      with `build/` and `test/`, `private: true`, and the build's `devDependencies` (Vitest,
      TypeScript). `packages/site/package.json` is `chassis-assets-site` with the Astro
      toolchain. The site's checks and the version script stay in `build/` at the root, as
      in `chassis-tokens`. `standard`, which nothing used, is gone.
- [x] The root scripts call the build directly: `assets` is
      `node packages/assets/build/cli.js build`, `assets:site` adds
      `--clean --brand chassis --app docs`. No `pnpm --filter` on the consumer path, since
      `pnpm install --ignore-workspace` at the root installs the root's dependencies only and
      `--filter` needs the workspace. `cli.js` is new: each module exports its command line
      as `cli(argv)` and still runs on its own. `pnpm test` and `pnpm assets:typecheck` use
      `--filter`; they are not on the consumer path.
- [x] The build reads `source/` and writes `dist/` relative to the repository root, found from
      `package.json` upward or given with `--cwd`, not relative to `packages/assets/`. The
      root is the nearest folder whose `package.json` has a `chassis` block (`root.js`).
- [x] Lint, Prettier, Stylelint and Changesets stay at the root as in `chassis-tokens`, but in
      `devDependencies` that a consumer never needs to install: `pnpm install --ignore-workspace`
      is measured before and after, and the goal is that it installs nothing the build needs.
      If the lint tools at the root are too heavy for the consumer path, they move to
      `packages/assets`. Measured on a clone with a warm store: 906 packages and 489 MB at
      the baseline, 449 packages and 288 MB now, none of which the build imports. The lint
      tools stay at the root; Pagefind, `vnu-jar` and TypeScript are 114 MB of it. Session
      3.2 adds Changesets there.
- [x] `package.json` of the root: remove `publishConfig`, `files` and `keywords` (D2); keep
      `repository`, `engines`, `packageManager`; add `bin` for the CLI in `packages/assets`.
- [x] `pnpm assets --version` and `--help` print from `packages/assets/package.json`.
      `--version` no longer reads the `package.json` of `--cwd`.
- [x] Test the consumer path with `chassis-docs vendor` of the website against a branch of
      this repository before merging, and with a bare checkout that runs
      `pnpm install --ignore-workspace && pnpm assets:site` without a lockfile step. Done in
      a scratch repository with this branch as the submodule `vendor/assets` and the
      `chassis-docs` of the website's checkout, which is not edited: `vendor` built
      `dist/web/docs/chassis`, the contract check passed and the submodule stayed clean, the
      lockfile too, with and without `CI=true`. With `node_modules` removed the build and
      the contract check pass as well. The Assets job of CI repeats this on every commit, as
      "Build as a consumer".

**Acceptance:** `chassis-docs vendor` of the website builds this repository from the tip of
the branch without a change on the website's side, and a bare checkout builds `dist/` with
nothing installed.

### Session 3.2: Changesets and release

- [x] Add Changesets with the configuration of `chassis-tokens`: `changedFilePatterns` on
      `source/**`, `build/**`, `dist/**`; `baseBranch` `develop`; the site ignored. A
      changeset is required by CI on a pull request that changes those paths, as in the
      `changeset` job of `chassis-tokens`. `changedFilePatterns` is `build/**` only: it is
      relative to the package, `source/` is at the root, and `dist/` is not committed. So
      the Changeset job runs `build/check-changeset.js`, which asks a changeset for a change
      to `source/` or `packages/assets/build/` and passes a release commit. The changelog
      entries have no commit hash, as in the website (`.changeset/changelog.js`). The
      `[Unreleased]` section became seven changesets, a minor bump: the next version is
      0.2.0.
- [x] `pnpm changeset:version` runs `changeset version` then `build/sync-version-refs.js`,
      which replaces `change-version.js` and updates `packages/site/config.yml` and the
      badge of the README. Tried and reverted: 0.2.0, with the changelog entry above 0.1.8.
- [x] Release workflow on pushes to `main`, as `publish-release.yml` of `chassis-tokens`:
      detects a new version, tags `v<version>`, writes the GitHub release from the changelog
      entry with `build/release-notes.js`, attaches one archive per platform, app and brand,
      `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, built in the run and checked
      with `assets:verify`. Nothing is published to npm (D2). `.github/workflows/release.yml`.
      It does not run CI as `workflow_call`: as `publish-packages.yml` of the website, it
      reads the results of Lint, Assets, Site and Audit on the commit, which the ruleset of
      `main` requires anyway, and stops unless each passed. A push to `main` without a new
      version costs one job that reads `package.json`. The release job installs nothing.
      `build/release-archives.js` writes the archives, `pnpm release:archives` locally: six
      archives of a full build today, 16 MB for each app job and 47 MB for each web job.
      Not run on GitHub yet: the first run is the release of 0.2.0.
- [x] T4: move `v0.1.8` to `a4b6445` with the maintainer, record `v0.1.7`, delete
      `tag-release.yml`. The workflow is deleted. The maintainer moved `v0.1.8` to `a4b6445`
      on 2026-10-01. `v0.1.7` stays at `867611c`, a commit of 0.1.6, and is recorded in
      `docs/architecture.md`, "Releases": its version commit is `992e47e`.
- [x] `CHANGELOG.md` keeps its entries; Changesets appends above them. It moved to
      `packages/assets/CHANGELOG.md`, where Changesets writes, without the Keep a Changelog
      preamble, which a new entry would have been put above. The link of the home page
      follows.
- [x] `CONTRIBUTING.md` "Releases": `pnpm changeset`, `pnpm changeset:version` on `develop`,
      the pushes to `staging`, `main` and `app/docs`, and what a `0.x` minor may break.
      `.github/CONTRIBUTING.md` has this section only; session 4.2 writes the rest.

**Acceptance:** a release of 0.2.0 from `main` creates the tag, the release and the archives,
and `app/docs` receives the same commit. Open: releasing is the maintainer's, and F11 may
go into 0.2.0 first.

### Exit criteria

- [x] `pnpm install --ignore-workspace && pnpm assets:site` at the root works from a fresh
      clone with Git LFS, and installs fewer packages than at the baseline.
- [x] Every change to `source/`, `build/` or the output has a changeset.
- [x] A version exists once: in `package.json`, and everywhere else by script.

## Phase 4: contributor experience

**Goal:** a new contributor, human or agent, gets from clone to a merged pull request without
asking, and does not break a rule that is not written down.

### Session 4.1: accurate README and one way to run things

- [ ] Rewrite `README.md` from `package.json` and `pnpm assets --help`: what the repository
      is, the layout, every command with its flags, the configuration, Git LFS, the branch
      flow, the consumer contract in one table, the ecosystem table of the website's README,
      and links to the site and to `docs/`.
- [ ] One place for setup: the README's "Getting started" and the quick-start page say the
      same things and link to each other.
- [ ] `pnpm assets --help` lists every flag with one line each; `pnpm assets:analyze --help`
      and `pnpm assets:validate --help` too.
- [ ] Delete `build/build-site.js` if Phase 5 has replaced it, or document why it stays.

### Session 4.2: community files and agent rules

- [ ] `.github/CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CODEOWNERS`, a pull
      request template with the checklist of checks, issue forms for a bug, an asset request
      and a docs problem, `ISSUE_TEMPLATE/config.yml` with links to the site, the security
      advisories and the siblings. Copy from `chassis-tokens` and adjust (website task A11).
- [ ] `.github/dependabot.yml`: npm weekly into `develop`, with groups for `@chassis-ui/*`,
      Astro, other minor and patch updates; GitHub Actions grouped (website task A12).
- [ ] `AGENTS.md` and `CLAUDE.md` (`@AGENTS.md`), in the shape of `chassis-tokens`: the
      layout, the commands, the checks per changed area, and the rules: Principles 1 to 7 of
      this roadmap as rules an agent breaks without being told; never edit `dist/`,
      `test/golden/` or `vendor/`; never commit or push unasked; add a changeset; do not
      convert the build to TypeScript.
- [ ] `WRITING.md`: take the one of `chassis-tokens`, replace the vocabulary section with
      this repository's (brand, app, type, platform, variant, density, the build), and the
      section order of a page with the order of the asset-type pages.
- [ ] Labels on the repository, as the website's session 3.2 added them.
- [ ] Optional: the pre-commit hook of the website, `simple-git-hooks` with `lint-staged` on
      `build/`, `test/` and `site/src/`.

### Exit criteria

- [ ] A contributor can find, in the README or `CONTRIBUTING.md`, every command that CI runs.
- [ ] An agent reading `AGENTS.md` knows the seven principles and the checks per area.
- [ ] Dependabot opens grouped pull requests against `develop`.

## Phase 5: the docs site

**Goal:** the site takes `@chassis-ui/docs` 0.6.1 and its pages pass the style guide. Follows
`packages/docs/UPGRADING.md` of the website and the sibling tasks A1 to A23.

### Session 5.1: upgrade to `@chassis-ui/docs` 0.6.1

- [ ] A3 and A4: the `chassisDocs()` integration; delete the copies in `site/src/libs/`;
      `docsSchema` and `calloutsSchema` from the package.
- [ ] A16: `config.yml` keys in camelCase, delete `docsDir` and `blog`, rename `icon_color`
      in `data/sidebar.yml`.
- [ ] A19 and A20: remove the Vite alias, the `optimizeDeps` exclude and the Sass load path
      to `@chassis-ui/css/scss/vendor`.
- [ ] A5: `chassis-docs html-validate` and `chassis-docs vnu` replace `build/html-validate.js`
      and `build/vnu-jar.js`; this repository has no submodule, so `vendor` is not used.
- [ ] A15: the consent banner and the privacy link come with 0.6.1; check the footer.
- [ ] A17: fix every `[[docsref:]]`; the build fails on a broken one now.
- [ ] A22: `sitemap-index.xml` lists `/assets/sitemap-0.xml`.
- [ ] A6 when the package has the static-prefix option: `/assets/static/` and the rewrite in
      `vercel.json`.
- [ ] Delete `site/static/static/js/example-mode.js` and `validate-forms.js` if the package
      ships them.
- [ ] Set the tasks to `done` in `ref/SIBLING_TASKS.md` of the website, through a sibling
      task, not here.

### Session 5.2: pages against the style guide

- [ ] Every page against `WRITING.md`: voice per section, a sentence after every heading,
      sentence-case headings under about 25 characters, no counts, versions through
      `[[config:currentVersion]]`, callouts without emoji, `<CxTable>` where a table is a
      reference.
- [ ] Every code sample that shows generated output is copied from `dist/`; every command is
      run.
- [ ] The `created-by-ai` callout leaves a page when its samples have been run on the
      platform they are for, or is replaced by a sentence saying which samples were not.
- [ ] The `work-in-progress` callout leaves the introduction when Phases 1 and 5 are done.
- [ ] The home page components of the site say what the build does today.

### Exit criteria

- [ ] `@chassis-ui/docs` is `^0.6.1`, `pnpm site:build`, `pnpm site:lint`, `pnpm check:astro`
      and the link check pass.
- [ ] No page carries a callout that says it may be wrong.
- [ ] The website's `SIBLING_TASKS.md` lists no open task for assets that this repository can
      do alone.

## Phase 6: optional features

Each task is a feature a page promised or a maintainer asks for. Each is off by default, is
its own session, has its own decision, and leaves the output of the default build unchanged.
None is scheduled; the maintainer picks one when it is wanted.

- [ ] 6.1 **Font licenses in the output.** If D8 puts the license files in `source/`, an
      option copies them next to the fonts in every platform output.
- [ ] 6.2 **Vector drawables.** `--vector-drawables` converts SVG icons to Android XML with
      `svg2vectordrawable`, as `chassis-tokens` does for its icons, in place of the SVG copy.
      Decision D9.
- [ ] 6.3 **iOS asset catalog.** `--asset-catalog` writes an `Assets.xcassets` with one image
      set per base name and a `Contents.json` per set, from the `@2x` and `@3x` files that the
      images page describes. Decision D10. Compiled in CI with `actool` as `chassis-tokens`
      does, on a macOS runner.
- [ ] 6.4 **Android `res/` layout.** `--res` writes `res/font/`, `res/drawable*/` as an app
      copies them, instead of `fonts/`, `images/` and `icons/`. Decision D11.
- [ ] 6.5 **Image optimization.** `--optimize` re-encodes rasters with `sharp` and minifies
      SVG with `svgo`, writing to the same names. Never on by default: the committed variants
      are what the designer exported. Decision D12.
- [ ] 6.6 **Lighter consumer builds.** `pnpm assets:site` with `--type images icons` so that
      a site pulls and copies only what it reads, with `git lfs pull --include`. Pairs with the
      website's open D9. Decision D13.
- [ ] 6.7 **Watch mode.** `pnpm assets --watch` rebuilds the affected job when a file under
      `source/` changes. The iOS page's watch script becomes one line.

## Parked

| What                                                                    | Why                                                                                                                                                                    |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A `shared` layer under `source/<brand>/` for assets every app gets.     | The pages do not describe it, and adding it changes the override order. The duplication between `docs` and `demo` is by design until the maintainer says otherwise.    |
| Deriving image variants from one master.                                | Principle 1. The designer exports the variants. Optimization of what is exported is 6.5.                                                                               |
| Removing `icons/` copies or `other/default.tokens.json` from `source/`. | Principle 3. The icons page describes the copies; D7 decides the tokens file.                                                                                          |
| A `Package.swift` at the root.                                          | `dist/` is not committed here, so a Swift package would name folders a checkout does not have.                                                                         |
| Publishing the built assets on npm for the sites.                       | D2 and the website's D9: the archives are per platform and app, too large as one package and not what a site reads. Task 6.6 is the lighter alternative for the sites. |

## Decisions

| ID  | Question                                                      | Recommendation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Status  |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| D1  | Which layout of `dist/` is right, the pages' or the code's?   | The code's, `dist/<platform>/<app>/<brand>/`, the pattern of `chassis-tokens` and what the six sites read. The pages are corrected in session 1.3. Decided by the maintainer on 2026-09-30.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | decided |
| D2  | How are the assets distributed?                               | Not on npm: the archives grow with each project's needs, and one package that holds every platform, app and brand is not what any consumer reads. Decided by the maintainer on 2026-09-30. Distribution is per consumer: the sites keep the `vendor/assets` submodule on `app/docs`; an app takes one archive per platform, app and brand from the GitHub release of a version, `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, built and verified by CI (session 3.2), or vendors the repository and runs the build; web files are also served by the site's deployment under `/static/`, which the website's architecture already treats as the CDN. `publishConfig` and `files` are removed in session 3.1. | decided |
| D3  | One package, or a workspace with the site in its own package? | A pnpm workspace: `source/` and `dist/` stay at the root, the build goes to `packages/assets/` and the site to `packages/site/`, as `chassis-tokens` keeps `packages/tokens` and `packages/site`. The root scripts run the build with `node`, not `pnpm --filter`, so that `pnpm install --ignore-workspace && pnpm assets:site` keeps working for the sites (Principle 8). Decided by the maintainer on 2026-09-30. Session 3.1.                                                                                                                                                                                                                                                                                       | decided |
| D4  | Does the web output get TTF and OTF fonts?                    | No. The build-system page and the code agree; the fonts page is the odd one out, and no site loads a TTF. Correct the fonts page. Taken by the plan on 2026-09-30 under the maintainer's delegation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | decided |
| D5  | Where do the density folders of a nested image go?            | Under the subfolder, as today: `images/logo/drawable-xhdpi/logo.png`. Both pages say so after session 1.3, and an app's copy script lists the folders it wants. Flattening the subfolder into the name would change every nested file for an app that has none today. Taken by the plan on 2026-09-30.                                                                                                                                                                                                                                                                                                                                                                                                                  | decided |
| D6  | What does `--clean` remove when filters are given?            | Only the folders of the selected jobs. A full build without filters removes `dist/` whole, as today. `pnpm assets:site` then stops deleting the iOS and Android output of a previous full build. Taken by the plan on 2026-09-30.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | decided |
| D7  | Does `other/default.tokens.json` stay in `source/`?           | It stays: the other-assets page says any folder under an app is copied, and removing a file is not this roadmap's to do. The source lint accepts its name. The maintainer removes it whenever it is not wanted. Taken by the plan on 2026-09-30.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | decided |
| D8  | Where do font licenses live?                                  | `LICENSE.txt` beside the fonts, one per family, in `source/<brand>/<app>/fonts/`, and the build copies it to every platform's `fonts/`, as it does today for any file. The validator counts it. Taken by the plan on 2026-09-30.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | decided |
| D9  | Vector drawables for Android icons, and in which layout?      | Phase 6. Off by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | open    |
| D10 | An iOS asset catalog?                                         | Phase 6. Off by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | open    |
| D11 | An Android `res/` layout?                                     | Phase 6. Off by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | open    |
| D12 | Image optimization?                                           | Phase 6. Off by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | open    |
| D13 | A `--type` filter for lighter consumer builds?                | Phase 6. Pairs with the website's D9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | open    |
| D14 | Does the Android output get WebP images?                      | Yes would follow the design-guidelines page and Android's own support; no keeps the build-system page and today's output. Including it adds WebP files to `dist/android/` of the default build, so this is the maintainer's. Until decided: no, and the guidelines table is corrected.                                                                                                                                                                                                                                                                                                                                                                                                                                  | open    |
| D15 | Are PNG icons kept for iOS and Android?                       | For iOS, yes: `.png` is added to its icon filter, as the design-guidelines page lists PNG icons for iOS. For Android, no: the build places only `images/` in density folders, and a PNG icon without one is not what the page describes; it comes with task 6.4 or 6.2. No PNG exists under `icons/` today, so no output changes. Taken by the plan on 2026-09-30 in session 1.1, narrowed in 1.2.                                                                                                                                                                                                                                                                                                                      | decided |

## Tasks for the siblings

| ID  | Repository      | Task                                                                                                                                                                                                                                                                                                                                                                                                              | Needs            | Status |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ |
| W1  | chassis-website | Set AST1, AST2, A7, A8 and A13 to `done` for assets in `ref/SIBLING_TASKS.md`: `app/docs` is level with `main`, CI runs on `develop` and pull requests, Node is pinned, Astro is 7.3.5, `check:lockfile` is gone.                                                                                                                                                                                                 | nothing          | open   |
| W2  | chassis-website | Document in the README of `@chassis-ui/docs` every file the layouts read from the assets build, by name, so that the consumer contract has one source. Today `cx-sprite.svg`, `images/home/` and `images/figma/` are not in it.                                                                                                                                                                                   | nothing          | open   |
| W3  | chassis-website | Check that `chassis-docs vendor` works with the workspace root of D3, where `pnpm install --ignore-workspace` installs the root package only and `pnpm assets:site` runs the build with `node`. Session 3.1 ran `chassis-docs vendor` of the website at `d83a1d6` against the workspace in a scratch repository and it passed; what is left is the same check in the website's CI once `app/docs` has the commit. | session 3.1      | open   |
| W4  | chassis-website | Record D2 of this roadmap in `ref/ARCHITECTURE.md`: the assets are not on npm, an app takes a release archive, the sites keep the submodule, and the web files are served under `/static/` of the assets deployment.                                                                                                                                                                                              | session 3.2      | open   |
| W5  | chassis-website | Update the "Assets submodule" column when `app/docs` moves to the first release of this roadmap, and record the four stylesheets and the icons that session 1.2 changes.                                                                                                                                                                                                                                          | Phase 1 released | open   |

## Session log

| Date       | Session   | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-30 | Plan      | Read the eleven pages of `site/content/docs/`, the build, the consumer code in `chassis-website`, the reference documents of the website and the layout of `chassis-tokens`. Wrote this roadmap with the pages as the specification and seven principles that the superseded roadmap broke. Renamed the superseded roadmap. No code changed. Open for the maintainer: D1 to D8 before session 1.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-30 | Decisions | The maintainer decided D1 (the code's layout), D2 (not on npm) and D3 (a workspace with `source/` and `dist/` at the root, the build in `packages/assets/` and the site in `packages/site/`), and delegated the other decisions to the plan. D4 to D8 are taken by their recommendations. Session 3.1 is rewritten for D3, and Principle 8 records that the default build needs nothing installed, which is what keeps the consumer contract under the new layout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-30 | 1.1       | Read every page against the code and ran the build, the analyzer and the validator with the flags the pages describe. Wrote `docs/pages-vs-build.md`, one table per page, every statement with a verdict. Added F18 to F24 and D14 and D15; D14 is the one decision that goes to the maintainer, since it adds files to the default output. Wrote the first `docs/architecture.md`: the build in one picture, the modules, the configuration, the command line, the output contract per platform, the checks, the known oddities. No code changed. Next: session 1.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-30 | 1.2       | Fixed the build where the pages are right. The library takes options and throws; only the entry reads argv and exits (F6). Unknown filter values fail (F18). `--clean` with filters removes the selected jobs only (D6). `--out`, `--cwd`, `--dry-run`, `--allow-lfs-pointers`, `--quiet`, `--help`, `--version`. LFS pointers fail the build (T12). The analyzer finds duplicates (F8); the validator prints once and exits 1 on failure (F19). `.png` icons for iOS (D15). Stylesheets: `text.css` and `code.css` rewritten, `display.css` added, for the files in the folder (F3). Licenses of the five families beside the fonts, by role (F15, D8); the font filters keep `.txt`. 40 screenshots renamed to the output names (F14). Old tests adapted and green. Output diff against the baseline: the four stylesheets, `display.css`, and the license files in every `fonts/` folder, nothing else. F11 left: it needs Git LFS, steps in `docs/architecture.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-09-30 | 1.3       | Corrected the eleven pages against the inventory: the `dist/<platform>/<app>/<brand>/` layout everywhere (F1), the distribution trees of every asset type and platform as the build writes them (F2, F4, F5, F22), Node 22.12, pnpm from `packageManager` and current action versions in the CI examples (F9), no test counts (F10), `other/` as a folder name (F12), no "commit built assets" (F13), the stylesheets and the licenses in the fonts page (F3, F15, F16), the broken slug (F17), WebP and PNG icons per platform in the guidelines tables (F21, D15), the API as session 1.2 left it (F6, F24), the options table and the `--clean` semantics (D6), the eight checks of the validator, "filtered builds" (F23). Android icons: the pages say SVG, converted in the app. The callouts stay until session 5.2 runs the platform samples. Deleted the inventory. `pnpm site:lint` and `pnpm check:astro` pass; the site build runs in CI.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-30 | 2.1       | Replaced the three runners with Vitest: 271 tests in about three seconds, no Git LFS files needed, nothing written outside temporary folders. A fixture in `test/fixtures/` (two brands, `alpha` and `beta`, two apps, `site` and `mobile`, six jobs, every type and case the roadmap names) and its golden output in `test/golden/`, written again with `pnpm test:golden`. Table tests for the processors and the filters, one row per rule of the pages; tests of the library, the analyzer, the validator, the API and the three command lines. The tests found three bugs, fixed: the wildcards of the ignore list (F25), the analyzer's platform filter (F26), and the API's paths and categories (F27). `keepsFile()` and `createCollisionTracker()` are exported for the tests. The real build's output is identical before and after. `test/README.md` describes the suite. Next: session 2.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-09-30 | 2.2       | Ported the consumer contract from `archive/rewrite-2026-09` into `build/contract.js`, checked again against the website and `chassis-figma`, with the reader of every file; narrowed the screenshot rule for 18 Figma export copies no page reads. `pnpm assets:contract` and `pnpm assets:verify` (validator, then contract). `pnpm assets:lint:source` for the naming rules of the design-guidelines page, type folders and LFS pointers; the real source has no error and three known oddities. `tsconfig.json`, `build/types.js` and `pnpm assets:typecheck`, clean. CI's Assets job runs lint, source lint, type check, tests, full build and verify. 324 tests in about three seconds. The table of checks per area waits in `docs/architecture.md` for session 4.2. Next: Phase 3 or 4, or 5.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-01 | 3.1       | Made the repository a pnpm workspace, as D3 decided: the build in `packages/assets/` (`@chassis-ui/assets`, private, with Vitest and TypeScript), the site in `packages/site/` (`chassis-assets-site`, with the Astro toolchain), `source/`, `dist/` and the `chassis` block at the root, in the private `chassis-assets-workspace` with the lint tools. `packages/assets/build/cli.js` is the one entry the root scripts run with `node`; each module exports `cli(argv)` and still runs on its own. `root.js` finds the repository root upward from the working directory, and the version is that of `packages/assets/package.json`. Removed `publishConfig`, `files` and `keywords` (D2, T6) and `standard`; no resolved version changed in the lockfile. The output of a full build is identical file for file, and the site too, apart from the "View on GitHub" links, which now name `packages/site/`. Consumer path: `chassis-docs vendor` of the website builds the branch unchanged and leaves the submodule clean; `pnpm install --ignore-workspace` installs 449 packages where it installed 906 (T7), and the build runs with none. CI's Assets job builds as a consumer first. `tag-release.yml` and `change-version.js` read the version from its new place until session 3.2 replaces them. 345 tests. Next: session 3.2, or Phase 4, or 5.1. F11 is still open and this machine has Git LFS. |
| 2026-10-01 | 3.2       | Changesets, as the website uses it: a change to `source/` or `packages/assets/build/` carries a changeset, `pnpm changeset:version` on `develop` bumps `packages/assets/package.json`, writes `packages/assets/CHANGELOG.md` and runs `build/sync-version-refs.js` for the site's `current_version` and the README badge. `build/check-changeset.js` is the Changeset job of CI on pull requests, because Changesets does not count `source/` at the root for the package. `.github/workflows/release.yml` on pushes to `main`: when `v<version>` has no tag and the four checks passed on the commit, it builds with nothing installed, verifies, and creates the tag and the GitHub release with one zip per platform, app and brand (`build/release-archives.js`, `build/release-notes.js`). `tag-release.yml` and `change-version.js` are deleted; `workflow_call` left `ci.yml`. The `[Unreleased]` section is seven changesets, and a trial `changeset:version` gave 0.2.0 with the right entry, then was reverted: the version is still 0.1.8. `.github/CONTRIBUTING.md` has "Releases". Prettier, the build's lint, the type check, 345 tests and `actionlint` pass locally; CI and the release workflow have not seen the commit. The maintainer moved `v0.1.8` to `a4b6445` (T4). Left for the maintainer: releasing 0.2.0. Next: F11 with Git LFS, then the release; or Phase 4, or 5.1.            |
