# Chassis Assets Roadmap

> **Superseded on 2026-09-30.** This roadmap is kept as a record and must not be worked on.
> It was written without a proper read of the documentation in `site/content/docs/`, and
> its plan changed what the project is: the workflow of designers and developers, the
> distribution of the assets, and the source layout. Decisions D2, D4, D5 and D8 and the
> manifests of session 2.2 are the wrong ones, and Phases 1 to 5 fall with them. A new plan
> is written from the documentation, with the file-driven build as its specification.
>
> **What was kept:** Phase 0, that is CI on pull requests and on `develop`, the dependency
> upgrades, Prettier, the Node.js pin, the `--brand` fix, `pnpm test`, the README corrections,
> the ruleset and the branch flow through `develop`.
>
> **What was reverted on `main`:** the core of the new build and the switch to it (session
> 2.1), its type check and comparison job in CI, and `docs/architecture.md` (sessions 1.1
> and 1.2). The build, the tests, the scripts and the docs page of the build system are as
> at the end of Phase 0 again, which produces the output of 0.1.8.
>
> **What was discarded on `develop`:** session 2.2, which moved `source/`, removed 1206
> files, required `images.json` and `fonts.json`, and deleted the build of 0.1.8. The
> branch `archive/rewrite-2026-09` holds the discarded commits for reference.

> **Scope:** what it takes to make `chassis-assets` a professional, production-ready and
> easy-to-contribute-to package, with a build system rewritten from the ground up: optional
> image and font optimization, native output that apps can drop in, and output that the
> Chassis ecosystem can rely on. Written to be worked through over several sessions.
>
> **This roadmap changes this repository only.** Work that belongs in a sibling repository
> is recorded in [Tasks for the siblings](#tasks-for-the-siblings) and in
> `ref/SIBLING_TASKS.md` of `chassis-website`. No task below edits a sibling.
>
> **Baseline:** reviewed 2026-09-29 at `main` `cbb861d`, version 0.1.8. Every finding was
> checked against the code, a fresh install, a full build and the sibling repositories
> `chassis-ui/tokens` and `chassis-ui/website` on that date. Re-check a finding before
> acting on it if the baseline has moved.

## How to use this document

1. Pick the lowest-numbered phase that still has unchecked tasks. Phase 0 and Phase 1 come
   first, in that order. Phase 2 is the rewrite and depends on Phase 1. Phases 3 to 5 can
   be interleaved once Phase 2 has a working pipeline.
2. Each phase lists its tasks as checkboxes, grouped into session-sized blocks. Tick a task
   when it is merged, not when it is started.
3. Each phase has exit criteria. A phase is done when all of them hold.
4. Add a line to the [session log](#session-log) at the end of every session.
5. Open decisions are collected in [Decisions](#decisions). A task that depends on one
   names it. Decide before starting the session, or start the session by deciding.
6. When a session finds work for a sibling, add it to
   [Tasks for the siblings](#tasks-for-the-siblings) and do not do it.
7. The [consumer contract](#the-consumer-contract) holds in every session. A change to it
   is a breaking change and follows the rules under [Breaking changes](#breaking-changes).

## Summary

| Phase                                | Goal                                                              | Sessions | Depends on | Model            |
| ------------------------------------ | ----------------------------------------------------------------- | -------- | ---------- | ---------------- |
| [0](#phase-0-green-baseline)         | CI runs where the work is and means something                     | 2        | none       | Opus             |
| [1](#phase-1-scope-and-contract)     | What this repository holds, and what each consumer can rely on    | 1 to 2   | 0          | Fable            |
| [2](#phase-2-build-system-rewrite)   | A new build: pure, tested, optimizing, native, reproducible       | 5 to 6   | 1          | Fable, then Opus |
| [3](#phase-3-package-and-release)    | One layout, one version, one release pipeline                     | 2 to 3   | 2          | Opus             |
| [4](#phase-4-contributor-experience) | A new contributor gets from clone to pull request unaided         | 2        | 2          | Opus             |
| [5](#phase-5-ecosystem-alignment)    | The docs site and the consumers take the new build without a hack | 2        | 3          | Opus             |

### Which model for which session

Fable is the more capable model. Use it where the design is still open, or where a mistake
reaches every consumer. Use Opus where the task is already specified and a check tells you
whether it worked.

| Session                        | Model | Why                                                                                                                                       |
| ------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1 Make CI run and pass       | Opus  | Workflow triggers, formatting, dependency upgrades. CI confirms the result.                                                               |
| 0.2 Make CI mean something     | Opus  | Small, specified changes to scripts and workflows.                                                                                        |
| 1.1 Scope and contract         | Fable | Decides what the repository is for, what stays in `source/`, and the output contract of every platform. Every later session builds on it. |
| 1.2 Architecture document      | Fable | Writes the design of the new build before code exists. Reads the tokens build to match its conventions.                                   |
| 2.1 Core pipeline              | Fable | The main design of the roadmap. Plan, rules and pipeline as pure modules, with a golden check against the current output.                 |
| 2.2 Source rules and manifests | Opus  | Rules written against the contract of session 1.1.                                                                                        |
| 2.3 Image optimization         | Opus  | Specified transforms with measurable output. Take it to Fable if determinism across platforms turns out hard.                             |
| 2.4 Font optimization          | Opus  | Specified transforms. Subsetting decisions are in D8.                                                                                     |
| 2.5 Native output              | Fable | Asset catalogs, density folders and vector drawables have to compile in Xcode and Gradle. A wrong layout fails silently for an app.       |
| 2.6 Tests, verify and diff     | Opus  | Tests written against code that exists, in the pattern of `chassis-tokens`.                                                               |
| 3.1 Layout and package         | Opus  | Mirrors `chassis-tokens`. D3 decides the layout first.                                                                                    |
| 3.2 Release pipeline           | Opus  | `chassis-tokens` has a working pipeline to read and copy from.                                                                            |
| 4.1 Accurate docs              | Opus  | Rewriting docs from `package.json` and the CLI's own help.                                                                                |
| 4.2 Repository hygiene         | Opus  | Standard files and settings.                                                                                                              |
| 5.1 The docs site              | Opus  | Follows `UPGRADING.md` of `@chassis-ui/docs` and the sibling tasks written for this repository.                                           |
| 5.2 Consumers                  | Opus  | A lighter vendor step, measured. Use Fable if the website's build has to change.                                                          |

Switch to Fable in any session when a task turns out to be less specified than it looked.

## Breaking changes

Backward compatibility with the current build code is not a goal. Compatibility with the
consumers is.

- The [consumer contract](#the-consumer-contract) holds on `app/docs` at every commit. A
  consumer's build must not break because this repository moved.
- The rewrite ships as **0.2.0**. Everything under `dist/` may change in it, except what the
  contract names. The changelog lists every path that moved, and the sibling tasks say what
  each consumer has to change, if anything.
- After 0.2.0, while the version is `0.x`, a change to a documented output path, file name or
  layout is a minor bump whose changelog entry says that it breaks. Everything else is a patch.
- **1.0 requires:** the contract is documented and tested by a fixture consumer, every
  platform output compiles in a native check, releases are automated, and the docs site of
  this repository uses `@chassis-ui/docs` 0.6 or later.

### What 0.2.0 changes for a consumer

Recorded in session 1.2, from the contracts of `docs/architecture.md`. The table of every
path is under "What 0.2.0 changes" of that document.

| Consumer                          | What stays                                                                                                                                                                        | What changes                                                                                                                                                                                                                                           | Has to do                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| The six sites                     | The branch `app/docs`, `git lfs pull`, `pnpm install --ignore-workspace`, `pnpm assets:site`, `dist/web/docs/chassis/`, and every file of the consumer contract, by path and name | The derived images have other bytes. `/static/icons/icons/`, `/static/icons/svgs/`, `/static/fonts/` and `/static/other/` are no longer served. `/static/chassis-assets.json` is. The build runs `sharp`, which the lockfile already has through Astro | Nothing. A site moves its pin when it wants the new build                  |
| An app that reads `dist/ios/`     | Nothing                                                                                                                                                                           | The folder is a Swift package with an asset catalog. Names are `PascalCase` from the path                                                                                                                                                              | Add the package, and load images by their new names                        |
| An app that reads `dist/android/` | Nothing                                                                                                                                                                           | The folder holds a `res/` tree. Names are `snake_case` from the path, and SVG files are vector drawables                                                                                                                                               | Merge the `res/` tree, and load resources by their new names               |
| A script that imports the build   | Nothing                                                                                                                                                                           | `ChassisAssets` of `build/api/` and `generateAssets` are gone. The library is `build()`, `plan()`, `lint()`, `verify()`, `diff()` and `analyze()` of `build/index.js`                                                                                  | Call the new functions                                                     |
| A script that calls the scripts   | `pnpm assets`, `pnpm assets:site`, `pnpm assets:analyze`, and `--brand`, `--app` and `--platform`                                                                                 | `--clean` and `--no-clean` are gone: a job removes what it did not write. `pnpm assets:validate` becomes `pnpm assets:verify`. A filter value that the configuration does not have fails                                                               | Remove `--clean`                                                           |
| A fork with its own brands        | `chassis.build.brands` and `chassis.build.apps`                                                                                                                                   | The layout of `source/`, the manifests, one master per image, the licenses of the fonts. `chassis.defaults.brandFolder` is gone                                                                                                                        | Move the files as session 2.2 does here, and run `pnpm assets:lint:source` |

Nothing reads `dist/ios/` or `dist/android/` in the ecosystem today, and no script outside
this repository imports the build.

### Draft of the changelog entry of 0.2.0

Session 3.2 writes the entry from this draft, and corrects it against what Phase 2 built.

```markdown
## [0.2.0]

The build is rewritten. **This release changes the output for apps.** The Chassis
documentation sites need no change: every file they read keeps its path and its name.

### Added

- Image variants are derived from one master per image. `images.json` names the
  densities, the sizes and the formats.
- Web fonts: WOFF2 files and `fonts/fonts.css`, written from one OTF or TTF file per face
  and `fonts.json`.
- The licenses of the fonts, in `licenses/` of every output that holds fonts.
- Android: a `res/` tree with density folders, vector drawables and font families.
- iOS: a Swift package per brand and app, with an asset catalog and the fonts.
- `chassis-assets.json` in every output folder: every file with its size, its hash and
  its source.
- Optional optimization of images, SVG files and fonts, with `--optimize` or
  `chassis.build.options`.
- The commands `lint`, `verify` and `diff`, and `--dry-run`, `--out` and `--config`.
- The web output of the demo app, `dist/web/demo/`.
- A release archive per brand, app and platform.

### Changed

- **Breaking:** `dist/android/` and `dist/ios/` have a new layout and new names.
- **Breaking:** the layout of `source/`: `source/<brand>/shared/` holds what every app
  gets, and a committed variant of a derived image is an error.
- The derived images have other bytes than the committed ones they replace.
- A build of one job removes the files of that job that it did not write.
- A filter value that the configuration does not have fails the build.
- Two files that would get one name fail the build. They were a warning.

### Removed

- **Breaking:** the copy of `@chassis-ui/icons` under `icons/icons/` and `icons/svgs/`.
  Take the icons from the package. `icons/cx-sprite.svg` stays.
- **Breaking:** `other/default-tokens.json`. Take the tokens from `@chassis-ui/tokens`.
- **Breaking:** `fonts/` of the docs output, with `text.css` and `code.css`, which named
  files that did not exist.
- **Breaking:** `ChassisAssets` and `generateAssets`. Use `build()`.
- `--clean` and `--no-clean`, and `chassis.defaults.brandFolder`.
- The package is no longer marked for npm.

### Fixed

- The analyzer finds files with the same content.
- A checkout without Git LFS fails with a message that says so.
```

## The consumer contract

What the rest of the ecosystem reads from this repository today. Found in
`packages/docs/src/cli/assets.js` and `packages/docs/src/layouts/` of `chassis-website`,
and in `packages/docs/README.md` of `@chassis-ui/docs` 0.6.1.

Session 1.1 read the sources of the six sites and corrected the table, see F27. The
contract is kept in [`docs/architecture.md`](../docs/architecture.md#consumer-contract)
from now on, file by file. This table is its summary.

| Consumers rely on                                                                                                                                                                                                                                                                                                                                                                                                                                                | Where                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The `app/docs` branch. Every Chassis site vendors this repository as the submodule `vendor/assets`, pinned to a commit of that branch.                                                                                                                                                                                                                                                                                                                           | `DEFAULT_BRANCH` in the `chassis-docs` command; `.gitmodules` of website, tokens, css, react, icons, figma           |
| `git lfs pull` gives the real files. Fonts and raster images are stored with Git LFS.                                                                                                                                                                                                                                                                                                                                                                            | `.gitattributes`; `buildCheckout()` in the command                                                                   |
| `pnpm install --ignore-workspace` at the root, then `pnpm assets:site`, writes `dist/web/docs/chassis`.                                                                                                                                                                                                                                                                                                                                                          | `ASSETS_OUTPUT` in the command; `getChassisAssetsFsPath()` of the package                                            |
| That folder is copied to `/static/` of every site. The layouts read `images/site-logo.svg`, `images/favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` and `images/social-image.png`. The build of a site fails when `social-image.png` is missing. The layouts link to `images/manifest.json`, which each site has in its own `static/`; it names `android-chrome-192x192.png` and `android-chrome-512x512.png` of this repository. | `Head.astro`, `Favicons.astro`, `BaseLayout.astro` of the package; F51 of the website roadmap                        |
| `icons/cx-sprite.svg`, the sprite of the home page icons. The home page of every site imports it at build time, so the build of a site fails without it.                                                                                                                                                                                                                                                                                                         | `index.astro` of the six sites                                                                                       |
| The home page images under `images/home/`, by name: `comp-gallery-*` as PNG and WebP with the `-small` and `@2x` variants, `figma-*` as WebP with `@2x`, and four SVG files.                                                                                                                                                                                                                                                                                     | `GalleryImage.astro` and the home page components of the website and of `chassis-tokens`; F59 of the website roadmap |
| Four logos under `images/logo/`, as SVG: `chassis-{logo,icon}-{brand,white}-banner.svg`.                                                                                                                                                                                                                                                                                                                                                                         | `BrandingSection.astro` of the website                                                                               |
| The screenshots under `images/figma/components/<component>/{light,dark}/`, as PNG with `@2x`.                                                                                                                                                                                                                                                                                                                                                                    | `ExampleImage.astro` and `CxVariant.astro` of `chassis-figma`                                                        |
| Icons come from `@chassis-ui/icons` on npm, not from this repository.                                                                                                                                                                                                                                                                                                                                                                                            | `getChassisIconsFsPath()`; `/static/icons/chassis-icons.svg` in the package                                          |
| Fonts come from Google Fonts, not from this repository.                                                                                                                                                                                                                                                                                                                                                                                                          | `Head.astro` and `scss/fonts.scss` of the package; decision D15 of the website roadmap                               |

Nothing consumes `dist/ios/` or `dist/android/` today. They are a feature for adopters, like
the presets of `chassis-tokens`, and Phase 2 gives them a shape an app can use.

## Findings

### This repository

| ID  | Finding                                                                                                                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                      | Phase |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| F1  | CI never runs on `main`, the default branch, and never on pull requests against it.                                                            | `.github/workflows/ci.yml` and `tag-release.yml` trigger on `app/docs` only. `main` is one commit ahead of `origin/app/docs`. Releases are tagged from `app/docs`.                                                                                                                                                                                                                                                                            | 0     |
| F2  | Site lint fails, and nothing runs it.                                                                                                          | `pnpm site:lint:prettier` flags the four components in `site/src/components/homepage/`. `pnpm site` and `pnpm site:lint` exit 1. CI runs `assets:lint` only.                                                                                                                                                                                                                                                                                  | 0     |
| F3  | `pnpm audit` reports 37 advisories: 1 critical, 28 high, 8 moderate.                                                                           | The critical one is `astro` 7.0.6, below 7.2.4. `check:pnpm` exists and is not in CI.                                                                                                                                                                                                                                                                                                                                                         | 0     |
| F4  | Two checks cannot fail.                                                                                                                        | `check:lockfile` lints `package-lock.json`, which does not exist, and exits 0. `check` runs its jobs with `&` and ends with `wait`, which always exits 0.                                                                                                                                                                                                                                                                                     | 0     |
| F5  | The analyzer cannot find duplicates, and the test that says it finds none passes because of the bug.                                           | `storeFileHash()` in `build/analyze-assets.js` keys the map by content hash, so a second identical file overwrites the first. `source/` holds 1078 groups of byte-identical files: `demo/icons/svgs` mirrors `docs/icons/svgs`, and 776 of the 3184 Figma screenshots have an identical light and dark copy.                                                                                                                                  | 2     |
| F6  | The README describes an output layout the code does not produce, and commands that do not exist.                                               | `README.md:139` says `dist/web/chassis-docs/`; `build-assets.js:505` writes `dist/web/docs/chassis/`. Line 248 says `pnpm dist && pnpm test`; neither script exists. Lines 29 and 36 `cd chassis-assets` after cloning into `assets`. The site docs say Node 18, CI uses 24.                                                                                                                                                                  | 0, 4  |
| F7  | The site docs promise CLI behaviour the CLI does not have.                                                                                     | `build-system.mdx` shows `pnpm assets --brand chassis example`. `parseArgs()` takes one brand. It also names `pnpm test`, which does not exist.                                                                                                                                                                                                                                                                                               | 0, 4  |
| F8  | The programmatic API cannot be used as a library.                                                                                              | `generateAsssets` is misspelled at 19 call sites. It reads `process.argv`, reads `package.json` from the working directory at import time, ignores the options `ChassisAssets.build()` documents, and calls `process.exit()` in five places.                                                                                                                                                                                                  | 2     |
| F9  | The package says it is published to npm and that it is not.                                                                                    | `publishConfig` is public and `files` ships `source/**` and `build/**`. The release notes in `tag-release.yml` say "not published to npm". No `exports`, no `engines`, no `main`.                                                                                                                                                                                                                                                             | 3     |
| F10 | The font stylesheets reference files that do not exist.                                                                                        | `source/default/docs/fonts/text.css` loads 18 `Inter-*.woff2` files and `code.css` five `woff/FiraCode-*.woff`. The folder holds `text-*`, `display-*` and `code-*` files. The demo app has the same two files. No consumer loads them, see the contract, so nobody noticed.                                                                                                                                                                  | 1, 2  |
| F11 | `source/` holds copies of other repositories' output.                                                                                          | `docs/icons/` and `demo/icons/` are `@chassis-ui/icons` 0.3.1 with `svgs/`, the icon font and `preview.html` of svg-sprite, and already stale: `css-brand.svg`, `cut-outline.svg` and `cut-solid.svg` are missing. `docs/other/default.tokens.json` is a Figma variables export that belongs to `chassis-tokens`.                                                                                                                             | 1     |
| F12 | Every variant of an image is made by hand and committed.                                                                                       | `images/home/comp-gallery-light` exists as 8 files: PNG and WebP, at 1x and 2x, full and `-small`. Most home images exist as 4. The 3184 Figma screenshots exist at 1x and 2x. The build copies; it derives nothing and optimizes nothing.                                                                                                                                                                                                    | 2     |
| F13 | The fonts are shipped unoptimized and unused.                                                                                                  | 48 WOFF2, 24 OTF and 14 TTF files, 22 MB of `source/` with LFS. No subsetting, no generated `@font-face`. Every site loads Google Fonts instead (website decision D15).                                                                                                                                                                                                                                                                       | 1, 2  |
| F14 | The iOS and Android outputs do not match what an app or the tokens package expects.                                                            | Android writes `images/logo/drawable-xhdpi/*.png` under the source folder path; `chassis-tokens` writes under `res/`. WebP is excluded although Android supports it. iOS gets loose `snake_case` files; Xcode wants an asset catalog with `Contents.json` per image set, which the tokens package writes for its icons.                                                                                                                       | 2     |
| F15 | The tests are slow, not hermetic, and cannot fail for the right reasons.                                                                       | Hand-rolled runners. `build.test.js` runs seven full builds of the real 4537-file source and deletes `dist/` on exit. `api.test.js` needs the `dist/` that `build.test.js` just deleted. Every result prints twice. The pure functions in `build/processors/` have no unit test.                                                                                                                                                              | 2     |
| F16 | There is no type check, and half the build files have no license header.                                                                       | No `tsconfig.json`. Ten files under `build/` lack the header that `change-version.js` and `build-site.js` carry.                                                                                                                                                                                                                                                                                                                              | 2     |
| F17 | Consumers build 61 MB to use about 2 MB, on every CI run.                                                                                      | Website decision D9. `chassis-docs vendor` pulls every LFS file, installs 50 development dependencies of the docs site and runs the build, in each of six repositories.                                                                                                                                                                                                                                                                       | 2, 5  |
| F18 | Community health files, agent instructions and an architecture document are missing.                                                           | No `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CODEOWNERS`, issue or pull request templates, Dependabot, `AGENTS.md` or `docs/`. `chassis-tokens` has all of them.                                                                                                                                                                                                                                                               | 4     |
| F19 | The Node version is not pinned anywhere.                                                                                                       | No `engines`, `.nvmrc` or `.node-version`. Website decision D7 settles it for the ecosystem: `.nvmrc` 24, `engines` `>=22.12.0`.                                                                                                                                                                                                                                                                                                              | 0     |
| F20 | The workflows are not hardened.                                                                                                                | Actions pinned by tag. No `persist-credentials: false`. `tag-release.yml` has no timeout. No branch ruleset. `chassis-tokens` pins by commit and sets least-privilege permissions per job.                                                                                                                                                                                                                                                    | 0     |
| F21 | The branch flow is undocumented.                                                                                                               | `main`, `staging`, `app/docs`, `dev/build-test` and `migration` exist on the remote. Vercel deploys `main` and `staging`. Consumers follow `app/docs`. Nothing says which branch a contributor targets or how a commit reaches `app/docs`.                                                                                                                                                                                                    | 0, 4  |
| F22 | The build is a single package that carries the site's toolchain.                                                                               | One `package.json` with 51 `devDependencies`, most of them Astro and its lint tools. A consumer installs all of them to run `assets:site`. Several appear unused here: `@floating-ui/dom`, `vanilla-calendar-pro`, `standard`.                                                                                                                                                                                                                | 3     |
| F23 | The two apps duplicate each other.                                                                                                             | `source/default/demo/fonts` and `docs/fonts` are the same 37 files; the icon folders are identical. There is no layer for assets shared by every app.                                                                                                                                                                                                                                                                                         | 1, 2  |
| F24 | The site copies scripts that `@chassis-ui/docs` ships.                                                                                         | `site/static/static/js/example-mode.js` and `validate-forms.js`. The package has `js/example-mode.js`. Task A4 of the website's sibling tasks removes the library copies; these two go with them.                                                                                                                                                                                                                                             | 5     |
| F25 | Astro 7.3 logs a Vite warning for every MDX page. Found in session 0.1.                                                                        | `[MODULE_LEVEL_DIRECTIVE]` for `"use astro:head-inject"`, which `astro/dist/content/vite-plugin-content-assets.js` itself emits, 11 times per build. The newer Rolldown bundler reports it. The built pages are not affected. Leave it for Astro to fix.                                                                                                                                                                                      | none  |
| F26 | A checkout without Git LFS builds nothing. Found in session 0.1.                                                                               | The cloud container had no `git-lfs`, so every PNG was a pointer file and the site build failed in `imageSize()` of `BaseLayout`. The README says to install it; the build does not say what is wrong. Session 2.2's source lint catches pointer files.                                                                                                                                                                                       | 2     |
| F27 | The consumer contract of the review missed files that the sites read, and named one that this repository does not write. Found in session 1.1. | `icons/cx-sprite.svg` is imported by the home page of all six sites, and only `source/default/docs/icons/` has it. The website reads four logos of `images/logo/`, and `chassis-figma` the screenshots of `images/figma/`. `images/manifest.json` is in `static/static/images/` of each site, not in `dist/`.                                                                                                                                 | 1     |
| F28 | The renaming of the web build is what makes a file of a consumer exist. Found in session 1.1.                                                  | 32 screenshots have capitals and spaces: `Alert Window.png`, `Group.png` and `Meta 1@2x-3.png` under `figma/components/`. The build writes `alert-window.png`, which `alert/specs.mdx` of `chassis-figma` shows. No page shows the `group` and `meta-1` files.                                                                                                                                                                                | 2     |
| F29 | The fonts are redistributed without their licenses. Found in session 1.1.                                                                      | The files are Inter, Archivo Narrow and Fira Code, renamed by role, and Roboto Serif and Roboto Mono in the example brand. `source/` has no license file, and `isMetadataFile()` would keep one out of `dist/`. The SIL Open Font License asks for the license text with every copy.                                                                                                                                                          | 2     |
| F30 | A `Package.swift` at the root cannot work here. Found in session 1.1.                                                                          | `chassis-tokens` commits `dist/`, so the root package names folders that a checkout has. Here `dist/` is ignored and D11 keeps it so: Swift Package Manager would find no folder. A Swift target also needs a source file, and the iOS output has none.                                                                                                                                                                                       | 2     |
| F31 | Deriving the variants cannot be an option. Found in session 1.1.                                                                               | D6 removes the committed variants, and the consumer contract names them: `comp-gallery-light-small@2x.webp`. A site that builds with the optimizations off still needs them, so `sharp` is installed and runs in the build of every consumer.                                                                                                                                                                                                 | 2, 5  |
| F32 | 45 of the 62 MB of the docs output are read by one site. Found in session 1.1.                                                                 | `images/figma/` holds 3184 files and 44.8 MB. Only `chassis-figma` reads them; the other five sites pull and copy them on every build. D4 and D8 take 6 MB out of the output, this would take 45.                                                                                                                                                                                                                                             | 5     |
| F33 | The two copies of the logos differ. Found in session 1.1.                                                                                      | 24 of the 48 files of `docs/images/logo/` and `demo/images/logo/` differ, by a few bytes each. The sites show the copy of `docs`.                                                                                                                                                                                                                                                                                                             | 2     |
| F34 | Files with the same content share a folder, and the pages need each of them. Found in session 1.2.                                             | 323 groups, 866 files, all under `images/figma/`: `card-orientation-top@2x.png` and `card-size-medium@2x.png` are one picture, and the Figma documentation reads both names. 210 of the 1592 light and dark pairs are the same file; the 776 of F5 could not be measured again. The lint rule of session 1.1 would have failed on all of them.                                                                                                | 2     |
| F35 | `build/build-site.js` is called by nothing. Found in session 1.2.                                                                              | No script of `package.json`, no workflow and no page names it. `html-validate.js`, `vnu-jar.js` and `change-version.js` are called.                                                                                                                                                                                                                                                                                                           | 2     |
| F36 | The siblings have an integration branch that the review did not see. Found on 2026-09-30.                                                      | `chassis-website`, `chassis-css` and `chassis-react` run CI on pushes to `develop`, and push the commit that passed to `staging` and `main`. `ref/DEPLOYMENT.md` of the website describes it, and its D1 decides it. `chassis-tokens` has no `develop` and works with pull requests against `main`. Here CI ran on pushes to `main` and `app/docs`, the branches that the ruleset protects, so no commit could have passed before it arrived. | 0     |
| F37 | macOS writes `.DS_Store` into `dist/` while a build runs. Found in session 2.1.                                                                | The repository is in a folder that the Finder and Dropbox watch. `checkWebNaming()` of `test/build.test.js` took the file for a name with capitals, so `pnpm test` failed in about one run of three, on macOS only. The test leaves out hidden files now, and a job of the new build removes them from its folder.                                                                                                                            | 2     |
| F38 | 43 file names of `source/` break the rules of the source contract, not 32. Found in session 2.1.                                               | 40 screenshots under `images/figma/`: the 32 of F28, and 8 with an indicator inside the name, `card-orientation-top@2x-1.png` and `list-item-text-basic@2x-1.png`, which the build writes as `card-orientation-top-2x-1.png`. Then `other/default.tokens.json` and the two `chassis-icons.min.css`, which D4 removes. Session 2.2 finds whether a page shows the 8.                                                                           | 2     |

### How the ecosystem consumes this repository

| ID  | Finding                                                                                        | Evidence                                                                                                                                                                                    | Here |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| S1  | Six repositories vendor `app/docs`, pinned to `04fd3a7` or, in icons and figma, `a0bb3f8`.     | Website roadmap table "How the sibling repositories consume this one", and A10.                                                                                                             | 0    |
| S2  | The vendor step is the same command everywhere since `@chassis-ui/docs` 0.6.1.                 | `chassis-docs vendor` and `chassis-docs sync-submodules`. Before 0.6.1 each site had a copy of `sync-submodules.js`; the react fork checked `dist/web/chassis-docs`, the wrong path (RCT4). | 5    |
| S3  | The website's own tasks for this repository are open.                                          | `SIBLING_TASKS.md`: AST1 to AST5, and A1, A3, A4, A5, A7, A8, A9, A11, A12, A13, A16, A17, A22, A23 where they apply to assets.                                                             | 0, 5 |
| S4  | The tokens package is the tooling reference, and its native conventions are the ones to match. | `chassis-tokens` writes `Icons.xcassets` image sets with `Contents.json`, `res/drawable/` vector drawables, a root `Package.swift`, and compiles both in CI.                                | 2    |
| S5  | The tag `v0.1.8` exists. AST4 of the website is stale.                                         | `git ls-remote --tags` lists `v0.1.6`, `v0.1.7`, `v0.1.8`.                                                                                                                                  | none |

## Phase 0: Green baseline

**Goal:** CI runs on the default branch and on pull requests, a red check means a real
problem, and the repository is safe to change.

### Session 0.1: make CI run and pass

- [x] Change `ci.yml` to run on `pull_request`, `workflow_dispatch` and `workflow_call`, as
      `chassis-tokens` does, and on pushes to `main` and `app/docs` until Phase 3 replaces
      the release flow. Fixes F1. Only a pull request cancels a superseded run. Since
      2026-09-30 the pushes that start CI are those to `develop`, see D1 and F36.
- [x] Run Prettier with `--write` over `site/`. Commit the four files as a formatting-only
      change. Fixes F2.
- [x] Upgrade dependencies within their ranges, Astro to 7.2.4 or later. Aim for
      `pnpm audit --audit-level moderate` exiting 0 without overrides. Build the site before
      and after and compare the HTML. Fixes F3. Website task A8. `pnpm update` took Astro to
      7.3.5 and the audit to none, with no overrides. The site moved off the 0.5.0-0
      prereleases: `@chassis-ui/css` 0.5.2, `@chassis-ui/tokens` 0.5.3, `@chassis-ui/docs`
      0.5.1. The HTML is the same apart from whitespace and the "View on GitHub" link. The
      compiled Chassis CSS changes some colours, two border radii and dark-mode backgrounds,
      as it did for the website. See F25 and F26.
- [x] Set `sitePath` in `config.yml`, which `@chassis-ui/docs` 0.5.1 reads for the "View on
      GitHub" link, and add `sitePath` and `siteBranch` to the site's schema. Website task
      A1. Added in session 0.1, since the upgrade brought 0.5.1.
- [x] Bring `app/docs` level with `main`, and say in the commit which is which. Website task
      AST1. Left for the maintainer: it is a push to the branch the sites vendor. It is a
      fast-forward from `04fd3a7` to `cbb861d`, and the sites pin commits, so no build
      changes. Done by the maintainer on 2026-09-29: `main`, `app/docs` and `staging` are
      at `cbb861d`. CI passed on the push, and no tag was made, since `v0.1.8` exists.

### Session 0.2: make CI mean something

- [x] Make `check` run its jobs in sequence so it can fail. Delete `check:lockfile` or point
      it at `pnpm-lock.yaml` if the tool supports it. Fixes F4. Website task A13.
      lockfile-lint reads npm and Yarn lockfiles only, so the check and the dependency are
      deleted. `pnpm install --frozen-lockfile` already rejects a lockfile that does not
      match. `check` is `check:astro`, then `check:pnpm`.
- [x] Add jobs to CI: Prettier, site lint, `astro check`, the audit, and the site build.
      Keep the assets lint, tests, build and validation. Four jobs: Lint, Assets, Site and
      Audit. Prettier runs over the whole repository through the new `lint:prettier`, and
      five files were formatted. The Git LFS objects are cached by the list of their ids.
- [x] Add `.nvmrc` with `24` and `engines.node` `>=22.12.0`. CI reads `.nvmrc`. Fixes F19.
      Website task A7.
- [x] Pin every action by commit, set `persist-credentials: false` on every checkout, a
      `timeout-minutes` on every job, and `permissions: contents: read` at the top of both
      workflows. Fixes F20. Only the release job of `tag-release.yml` may write. Both
      workflows pass actionlint 1.7.12.
- [x] Add the ruleset "Protect main and app/docs": no force push, no deletion, CI required.
      Done by the maintainer on 2026-09-30, and read back from the API: the ruleset is
      active on the default branch and on `app/docs`, with no bypass, and requires `Lint`,
      `Assets`, `Site` and `Audit` of GitHub Actions. A commit reaches `main` when it has
      passed them, so through a pull request.
- [x] Turn on secret scanning, push protection and Dependabot alerts. Done by the
      maintainer on 2026-09-30, and read back from the API: the three are on, with the
      dependency graph, which lists 998 packages. No secret and no vulnerable dependency
      is reported. Dependabot security updates stay off until session 4.2.
- [x] Fix the README drift that does not wait for the rewrite: the output layout, the
      contributing commands and the clone directory. Fixes F6 for now; Phase 4 rewrites it.
      Also the Node.js version, the new scripts and chassis-react.
- [x] Fix the misspelled `generateAsssets`. Fixes the name in F8; the API itself is Phase 2.
- [x] Fix the site docs that claim multiple `--brand` values, or make the CLI accept them.
      Fixes F7 for now. `--brand` takes one or more values in the build and the analyzer,
      with a test. `pnpm test` runs the three suites, as the Build System page says.

### Exit criteria

- [x] CI is green on `main`, `app/docs` and a pull request against `main`. Green on this
      session's branch, started by hand; `main` and `app/docs` follow when it is merged.
      The maintainer works alone and merges locally, and D1 makes `develop` the branch
      that CI runs on. So the criterion is: CI is green on `develop`, and `main` and
      `app/docs` are at that commit. Met on 2026-09-30 at `5da1168`: `Lint`, `Assets`,
      `Site` and `Audit` passed on `develop`, and the ruleset took the commit on `main`
      and `app/docs`.
- [x] A deliberate Prettier violation, a deliberate type error and a deliberate test failure
      each fail CI. Checked locally with the commands CI runs: `pnpm lint:prettier`,
      `pnpm check:astro` and `pnpm test` each exit 1.
- [x] `pnpm audit --audit-level moderate` exits 0.
- [x] A force push to `main` is rejected. Read from the rules that are active on `main` and
      on `app/docs`: `non_fast_forward` and `deletion`, with no bypass. No force push was
      tried.

### Left for you

Every task of Phase 0 is done. One thing is left to decide, and it needs an administrator
of the repository.

1. **`Audit` is a required check.** On the website the audit runs and does not block. Here
   an advisory that is published tomorrow blocks every push to `staging`, `main` and
   `app/docs` until a fix exists, also when nothing changed. To take it out: **Settings →
   Rules → Rulesets → Protect main and app/docs**, remove `Audit` under "Require status
   checks to pass", and save. It still runs on every push to `develop` and shows red.

## Phase 1: Scope and contract

**Goal:** it is written down what this repository holds, what it does not, and what each
consumer of `dist/` can rely on. Phase 2 implements that document.

### Session 1.1: scope and contract

- [x] Decide what stays in `source/`. Recommended: remove the copies of `@chassis-ui/icons`
      and the Figma tokens export, since both come from their own repositories. See D4.
      Fixes F11. Decided as recommended, except `docs/icons/cx-sprite.svg`, which is not a
      copy and which every site reads. See F27.
- [x] Decide what the fonts are for. If the sites stay on Google Fonts, the docs app has no
      font consumer, and the demo app is the only reason to keep them. See D8. Fixes F13.
      The fonts leave the docs app. The demo app keeps them and gets the `web` platform,
      so that the font pipeline of session 2.4 has a job to run in.
- [x] Decide the source layout: a layer shared by every app, then the app, then the brand.
      Recommended: `source/<brand>/shared/`, `source/<brand>/<app>/`, with `default` as the
      brand fallback, as today. See D5. Fixes F23. Decided as recommended. A later layer
      overrides an asset, not a file.
- [x] Decide the image policy: one master per image, variants derived by the build from a
      manifest, or committed variants as today. Recommended: derived, with the manifest
      naming the sizes, densities and formats each image needs. See D6. Fixes F12. Decided
      as recommended. The rounding of the contract gives the sizes of the committed
      variants, checked on three images.
- [x] Decide the distribution model, website task AST3. Recommended: not on npm, tagged
      releases with one archive per platform and app attached, `app/docs` for the sites.
      See D2. Fixes F9. Decided as recommended, with one archive per job.
- [x] Write the **output contract** for each platform: folder layout, naming, which formats
      go where, what a manifest holds. Web keeps `dist/web/docs/chassis` and the file names
      in the [consumer contract](#the-consumer-contract). Android writes a `res/` tree with
      density and drawable folders. iOS writes an asset catalog. See D9 and D10. In
      `docs/architecture.md`, with the table of what 0.2.0 changes.
- [x] Write the **source contract**: what a contributor puts where, the naming rules, the
      manifest format, and the rules the source lint enforces. In `docs/architecture.md`.

### Session 1.2: architecture document

- [x] Write `docs/architecture.md` in the shape of the tokens one: the build in one picture,
      design decisions, configuration, output contract, checks, known oddities, history.
      Session 1.1 started the file with the scope and the three contracts. This session
      adds the rest.
      The `chassis.build` configuration in `package.json` keeps `brands` and `apps`; it gains
      per-platform `options` for the optimizations. One option, `optimize`, which
      `--optimize` and `--no-optimize` override, so that the sites and the release build
      from one configuration.
- [x] Write the module layout of the new build and the responsibility of each module, so
      that session 2.1 starts from a plan and not from the old code. Under "Modules", with
      the data that moves between them and which modules are pure.
- [x] Record what changes for consumers in 0.2.0 and what does not, in the
      [Breaking changes](#breaking-changes) section and in a draft changelog entry.

### Exit criteria

- [x] `docs/architecture.md` exists and names every output path of every platform.
- [x] D2, D4, D5, D6, D8, D9 and D10 are decided. D7 and D12 too, since the contracts
      depend on them.
- [x] The consumer contract above is copied into the architecture document and marked as
      the part that holds through the rewrite. Corrected on the way, see F27.

## Phase 2: Build system rewrite

**Goal:** a build that is small enough to read in one sitting, pure where it can be,
tested where it is not, reproducible byte for byte, and able to optimize what it ships.

The shape follows the tokens build: a **plan** computed by pure functions, **rules** per
platform that are pure functions of a file's path and metadata, a **pipeline** that does
the I/O, and a **verify** step that compares a fresh build with a committed reference.

### Session 2.1: core pipeline

- [x] Create the new build beside the old one, under `build/`, with a `logger.js` in the
      pattern of the tokens package, and move to it module by module. The old scripts are
      deleted in session 2.6. `pnpm assets` and `pnpm assets:site` run the new build.
      The old scripts stay for `assets:analyze`, `assets:validate`, the old tests and
      `assets:compare`. Added `errors.js`, `concurrency.js` and `types.js`.
- [x] `config.js`: loads `chassis.build` from `package.json` or from `--config <file>`,
      validates it, and fails with a message that names the key. No file reads at import
      time. Fixes the working-directory dependence in F8. It takes the root as an option.
- [x] `plan.js`: a pure function from configuration and filters to the list of jobs, one per
      brand, app and platform, with the source layers each job reads in override order.
      `--brand`, `--app` and `--platform` take one or more values. `--dry-run` prints the
      plan. Fixes F7. A job has the four layers of D5 already: the inventory skips the
      two `shared` layers, which do not exist before session 2.2.
- [x] `inventory.js`: walks the source layers of a job and returns the files with their
      layer, asset type, base name, resolution indicator and extension. Ignores system files.
      Pure apart from the directory read, which is injected. It reads the size of an image
      with `image-size`, not with `sharp`. A later layer overrides an asset with every
      file of it, as D5 says. On the source of today that gives the files that the
      override by file of 0.1.8 gave. A file outside a type folder fails, and so does a
      Git LFS pointer, which starts F26.
- [x] `rules/<platform>.js`: pure functions `include(asset, job)`, `files(asset, job)` and
      `extras(assets, job)` per platform, as the architecture document describes. A file
      has its path and its step. The web rules reproduce the current output, with its
      renaming, until session 2.2 renames the source, see F28. Collisions are errors, not
      warnings, with both source paths named, and `planFiles` finds them before a file is
      written. The rules of iOS and Android reproduce the output of 0.1.8 too, until
      session 2.5, so that one build writes every job. What is of 0.1.8 is in
      `rules/legacy.js`. Two paths that differ by case only are a collision. The source
      of today has none.
- [x] `pipeline.js`: runs a job, with async I/O, a bounded concurrency, and a content-hash
      cache in `.cache/assets/` so that an unchanged input is not processed again. A failure
      names the file and the rule. A job removes the files of its folder that it did not
      write, and `--clean` goes. It removes before it writes, see `docs/architecture.md`.
      No step exists before session 2.3, so the cache is proven by a step of the tests.
- [x] `manifest.js`: writes `chassis-assets.json` into the folder of every job. It also
      reads a manifest and compares two.
- [x] `cli.js` with `node:util` `parseArgs`: `build`, `verify`, `diff`, `lint`, `analyze`,
      `--out`, `--config`, `--dry-run`, `--quiet`, `--help`, `--version`. The library API is
      `build(options)` and returns a report; it never reads `process.argv` and never exits.
      Fixes F8. `parseArgs` takes one value per option: read its `tokens` to give a filter
      the values that follow it. Tried in session 1.2 on Node.js 24. The command line has
      `build` only, so that the help names what runs: `lint` comes with session 2.2, and
      `verify`, `diff` and `analyze` with session 2.6. The library has `build()` and
      `plan()`. `--optimize` and `--no-optimize` are parsed and reach the jobs.
- [x] Acceptance: with optimizations off, the new build writes exactly the files of the old
      build for `web`, compared by a manifest of paths and hashes. Differences are the
      documented fixes only. Met for the six jobs, not only for `web`: 10121 files, the
      same paths, sizes and hashes. The one difference is `chassis-assets.json`.
      `pnpm assets:compare` runs both builds into a scratch folder and compares them, and
      CI runs it until session 2.2 moves the source.
- [x] Added to the session: Vitest and 169 unit tests in `test/unit/`, which run in under
      a second on source trees that the tests write, and `tsconfig.json` with
      `pnpm assets:typecheck` over the new modules. Both were tasks of session 2.6, and
      the new code should not wait four sessions for them. CI runs both.

### Session 2.2: source rules and manifests

- [ ] Move the files to the source layout of D5, which the plan and the inventory have
      since session 2.1. Remove the folders of D4, and keep `docs/icons/cx-sprite.svg`.
      Fixes F11 and F23. The logos go to `shared/` from the copy of `docs`, see F33. The
      fonts leave `docs`, and those of the example brand go to `example/demo/`. The build
      of 0.1.8 cannot read the new layout: remove `pnpm assets:compare`, its step in CI
      and `test/compare-0.1.8.js`, and decide what becomes of `pnpm assets:validate` and
      the old tests before session 2.6 deletes them.
- [ ] Rename the screenshots of F28 to the names the build gives them today, and delete
      the `group` and `meta-1` files that no page shows. Fixes F28. The rename is of 43
      files, see F38. Then the web rules copy a name as it is, and the names of the web
      leave `rules/legacy.js`.
- [ ] Add the **image manifest**, `images.json` at the root of `images/`: a list of rules
      that name the variants each image needs, as the source contract describes. A file
      without a rule is copied as it is.
- [ ] Add the **font manifest**, `fonts.json`: family, style, weight and file per face, from
      which the build writes the `@font-face` stylesheet. Fixes F10.
- [ ] Add the license of every font family under `fonts/licenses/`, and write them to
      `licenses/` of every output that holds the fonts. Fixes F29.
- [ ] Add `lint`: the source lint. Rules: naming (lowercase, hyphens, a resolution indicator
      only on rasters), a manifest entry for every image that has variants, no committed
      variant that the build derives, no stylesheet that references a missing file, no two
      files with the same content in one folder, an LFS pointer where a real file should be.
      Every message names the file. Fixes F5. The rule for the same content leaves out the
      images of a `committed` rule, see F34. The full list is in the source contract.

### Session 2.3: image optimization

- [ ] Add `sharp` as the one raster dependency. Derive from a master: densities (`@1x` from
      `@2x` or `@3x`), sizes (`-small` from the manifest), and formats (WebP, AVIF where the
      manifest asks). Never upscale.
- [ ] Optimize what is copied: PNG with palette quantization where the manifest allows,
      JPEG with a stated quality, metadata stripped. Report the bytes saved.
- [ ] Add `svgo` with a conservative preset: keep `viewBox`, ids and `currentcolor`; remove
      editor metadata and comments. Sprites are left alone.
- [ ] Make the output **deterministic**: no timestamps, fixed encoder settings, pinned
      versions of `sharp` and `svgo`. Two builds of the same input give the same bytes.
      Check it on Linux and macOS; record any difference as a known oddity.
- [ ] Add size budgets to the manifest, checked by `lint`: a variant over its budget fails.
- [ ] Optimizations are **opt-in per platform** in `chassis.build.options`, off by default,
      so that a consumer's build stays fast and the golden check stays simple. The docs app
      turns them on. Deriving the variants is not an optimization and always runs, see
      F31. Measure what it adds to `pnpm assets:site`.

### Session 2.4: font optimization

- [ ] Convert TTF and OTF to WOFF2 for the web output, and keep TTF and OTF for the native
      outputs, from one source file. Decided in D8. Add `web` to the platforms of the demo
      app: its job is the one that writes fonts for the web.
- [ ] Check the license of every family before subsetting: a font with a reserved name
      cannot keep its name when it is changed. See F29.
- [ ] Subset by a Unicode range from the font manifest, with `subset-font` or an equivalent
      pure-JavaScript tool, opt-in.
- [ ] Write the `@font-face` stylesheet from the manifest, with `font-display: swap` and
      `unicode-range` where subsetting is on. Delete the hand-written `text.css` and
      `code.css`. Fixes F10.
- [ ] Write a font report: family, faces, bytes before and after.

### Session 2.5: native output

- [ ] **Android:** write a `res/` tree per job. Rasters go to `drawable-mdpi` to
      `drawable-xxxhdpi` by density, density-independent images to `drawable`, SVG icons to
      `drawable` as vector drawables with `svg2vectordrawable`, as the tokens package does.
      Names are `snake_case`, icons prefixed `ic_`. WebP is allowed. Fonts go to `font/`.
      See D9. Fixes F14.
- [ ] **iOS:** write `ChassisAssets.xcassets` per job: an image set per image with `1x`,
      `2x` and `3x` files and a `Contents.json`, template rendering for icons, vector
      preserved for SVG. Fonts go beside the catalog, in `Fonts/`, with a `Fonts.plist`
      fragment listing them. See D10. Fixes F14.
- [ ] Write `Package.swift` and `ChassisAssets.swift` into the folder of every iOS job, so
      that the folder is a Swift package: the library `ChassisAssets<App><Brand>`, with the
      catalog and the fonts as resources. Checked by a test. Not at the root, see F30.
- [ ] **Android:** write `res/font/<id>.xml` per font family, from the font manifest.
- [ ] Add native compile checks under `test/native/`: `actool` and a sample package on
      macOS, a Gradle library with `aapt2` on Linux, copied from the tokens package and
      reduced to what assets need. Run them in CI only when native paths change.

### Session 2.6: tests, verify and diff

- [ ] Unit-test what sessions 2.2 to 2.5 added, in `test/unit/`, where session 2.1 put
      Vitest and the tests of its modules: every rule of every platform, the manifests and
      the lint rules. No test reads the real `source/`. A test writes its source tree, in
      memory or into a scratch folder. Add `test/fixtures/` when a tree is too large to
      read in a test. Fixes F15.
- [ ] Add `verify`: builds into a scratch directory and compares the output manifest of
      every job with the committed `test/golden/<platform>/<app>-<brand>.json`. `dist/` is
      not committed. See D11. `--update` writes the golden files.
- [ ] Add `contract.js`, the files of the consumer contract as patterns, and make `verify`
      fail when the docs output lacks one.
- [ ] Add `diff`: the report of what a change adds, removes, renames or changes in the output
      of each job, as Markdown for the pull request summary, in the pattern of the tokens
      diff. It reads the golden files of two commits, and builds nothing.
- [ ] Remove the list of `exclude` from `tsconfig.json`, which session 2.1 added with
      `pnpm assets:typecheck`: it names the scripts of 0.1.8. Add the license header to
      every build file that is left. Fixes F16.
- [ ] Replace `analyze-assets.js` and `validate-assets.js` with `analyze` and `verify` of
      the new CLI, and delete `build/api/`, `build/build-site.js` and the old tests.
- [ ] Update CI: lint, source lint, typecheck, test, build, verify, and the diff summary on
      pull requests.

### Exit criteria

- [ ] `pnpm assets` on `app/docs` still writes `dist/web/docs/chassis` with every file the
      consumer contract names, and `chassis-docs vendor` in a scratch clone of
      `chassis-website` builds the site with it.
- [ ] Two builds of the same commit give the same output manifest, on Linux and macOS.
- [ ] `pnpm verify` fails when a rule changes and the golden files were not updated.
- [ ] The native checks compile the iOS and Android output in CI.
- [ ] The unit tests run in under ten seconds without the real `source/`.
- [ ] The docs app's images are derived from masters; the committed variants are gone.

## Phase 3: Package and release

**Goal:** the repository has the layout of the ecosystem's tooling reference, one version,
and a release that needs no manual step after the version commit.

### Session 3.1: layout and package

- [ ] Decide the layout. See D3. Recommended: a pnpm workspace with `packages/assets` (the
      source, the build, the tests) and `packages/site`, as `chassis-tokens` and
      `chassis-react`. It needs one change in `chassis-docs vendor` first; see the sibling
      tasks. Until that ships, keep `pnpm assets:site` at the root working.
- [ ] Give the assets package `engines`, `exports` for the build API and the CLI, a `bin`
      named `chassis-assets`, a `files` list that ships the build only, and `private: true`
      if D2 keeps it off npm. Fixes F9 and F22.
- [ ] Move the site's dependencies to `packages/site`. The root keeps the lint tools. A
      consumer installs the assets package only. Remove the dependencies nothing imports.
- [ ] Add a root `LICENSE` and one in the package.

### Session 3.2: release pipeline

- [ ] Adopt Changesets, with `changedFilePatterns` for `source/`, `build/` and the golden
      files, and a CI job that requires a changeset on such a pull request. Replace
      `build/change-version.js` with `changeset version` and a `sync-version-refs.js` that
      updates `config.yml` of the site.
- [ ] Add `publish-release.yml`: on a push to `main`, run CI through `workflow_call`, then
      version, then tag `v<version>` and create a GitHub release with the changelog entry as
      the body and one archive per platform and app attached, with `fail_on_unmatched_files`.
      If D2 chooses npm for the build tool, publish with trusted publishing and provenance.
- [ ] Make `app/docs` follow `main` in the release workflow: after a release, fast-forward
      `app/docs` to the released commit. Consumers then pin releases, not arbitrary commits.
      Decided in D1.
- [ ] Give the package its own `CHANGELOG.md`, and write the 0.2.0 entry from the draft of
      session 1.2.

### Exit criteria

- [ ] A release needs no manual step after the version commit reaches `main`.
- [ ] Each release has one archive per platform attached, built by CI from a verified build.
- [ ] `app/docs` points at the released commit after every release.

## Phase 4: Contributor experience

**Goal:** a first-time contributor can clone, run, add an asset, check it and submit
without asking.

### Session 4.1: accurate docs and one way to run things

- [ ] Add top-level scripts that match what people type: `build`, `lint`, `format`, `test`,
      `typecheck`, `verify`, `check`, `dev`. Keep the `assets:*` and `site:*` scripts behind
      them. `lint` runs what CI runs.
- [ ] Rewrite `README.md` from `package.json` and the CLI's `--help`: what the repository
      is, the contract, the commands and their options, the configuration, the manifests,
      the ecosystem table, and a short contributing section that links to
      `CONTRIBUTING.md`. Fixes F6.
- [ ] Rewrite the site docs from the same sources: Quick Start, Build System, the asset type
      pages and the three platform pages. Every command on a page runs. Fixes F7.
- [ ] Write `AGENTS.md` in the shape of the tokens one, and a one-line `CLAUDE.md` that
      imports it: layout, commands, the checks per changed area, the rules an agent breaks
      without being told (never edit `dist/` or the golden files by hand, never commit a
      derived variant, run the lint before adding an asset), and the cautions.
- [ ] Write `test/README.md`: principles, the test files, the fixtures, the golden files,
      the native checks.
- [ ] Take `WRITING.md` from `chassis-tokens` for the site's pages, unchanged where it
      applies.
- [ ] Document the branch flow in `CONTRIBUTING.md`: which branch a contributor targets,
      what `app/docs` is, how a release moves it. Fixes F21.

### Session 4.2: repository hygiene

- [ ] Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CODEOWNERS`, a pull
      request template and issue forms for a bug, an asset request and a brand request, in
      `.github/`, copied from `chassis-tokens` and adjusted. Fixes F18. Website task A11.
- [ ] Turn on Dependabot security updates in the settings, which Phase 0 left off, and set
      `target-branch: develop` in `dependabot.yml`, as the website does: D1 makes `develop`
      the branch that a pull request targets.
- [ ] Add Dependabot: npm weekly with the `@chassis-ui/*` packages and `sharp`, `svgo` and
      `svg2vectordrawable` each in their own pull request since they change the output;
      github-actions weekly; gradle for the native check. Website task A12.
- [ ] Add a pre-commit hook with simple-git-hooks and lint-staged: ESLint and Prettier on
      staged code, the source lint on staged files under `source/`.
- [ ] Add a `spellcheck` script that runs cspell over Markdown and MDX, in the Lint job.
- [ ] Add labels for area (`build`, `source`, `site`, `ci`, `native`) and triage.

### Exit criteria

- [ ] Every command in `README.md` and `CONTRIBUTING.md` runs on a fresh clone.
- [ ] GitHub's community profile shows every item complete.
- [ ] A dependency update arrives as a pull request without anyone asking for it.

## Phase 5: Ecosystem alignment

**Goal:** this repository's own docs site follows the ecosystem, and the consumers get the
new build without a workaround.

### Session 5.1: the docs site

- [ ] Move the site to `@chassis-ui/docs` 0.6 or later, following `UPGRADING.md` of the
      package. Website tasks A3, A4, A16, A17, A19, A20. Delete the copied libraries under
      `site/src/libs/` and the copied scripts under `site/static/static/js/`. Fixes F24.
- [ ] Replace the copied build scripts with the `chassis-docs` commands. Website task A5.
- [ ] Take `@chassis-ui/tokens` 0.6 and the current `@chassis-ui/css`. Website task A9.
- [ ] Fix the site's sitemap index and its broken links. Website tasks A22 and A23.
- [ ] Call the reusable workflows of `chassis-ui/website` for lint, type check and site
      build, if they fit. Website task A14.

### Session 5.2: consumers

- [ ] Make the vendor step cheap. Measure `chassis-docs vendor` on a clean checkout before
      and after: pull only the LFS files of the docs app (`lfs.fetchinclude`), install only
      the assets package, build only the docs job with optimizations off. Fixes F17.
- [ ] Propose, and record for the website, the next step for D9 there: download the release
      archive of the docs app instead of building, with a fallback to the build. Written up
      in [Tasks for the siblings](#tasks-for-the-siblings), not done here.
- [ ] Add a canary: a CI job that clones `chassis-website` at its default branch, points
      `vendor/assets` at this commit and builds the site. Reports only.
- [ ] Give the native outputs a consumer: extend the sample apps under `test/native/` to load
      one image and one font, so that a change that breaks an app is seen here.

### Exit criteria

- [ ] The site builds with `@chassis-ui/docs` 0.6 or later and no copied library.
- [ ] The vendor step on a consumer takes a fraction of what it took, with the number in the
      session log.
- [ ] A change that breaks the website's build is reported before it reaches `app/docs`.

## Parked

Considered and left out for now. Each needs a reason to come back.

| Item                               | Why it is parked                                                                                                                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Publishing the binaries to npm     | Website decision D9: too large to upload and download on every install. Release archives cover the non-Node consumers.                                                                                                                       |
| A CDN for the built assets         | `ARCHITECTURE.md` of the website shows fonts loaded from `chassis-assets.vercel.app`, but no site does it, and D15 keeps fonts on Google.                                                                                                    |
| Serving fonts from this repository | Website decision D15. Revisit if the privacy page or performance work of the website asks for it.                                                                                                                                            |
| Flutter and other platforms        | The multi-platform notes of the website's deleted `build/README.md` mention them. No consumer asks. Website task AST5 keeps the notes.                                                                                                       |
| Rewriting the build in TypeScript  | The ecosystem's build code is JavaScript with JSDoc checked by `tsc`. Keep it, so the same rules apply everywhere.                                                                                                                           |
| A Figma export step                | The Figma screenshots are exported by hand. An export from the Figma API is a project of its own, and the manifest of session 2.2 fits it.                                                                                                   |
| The icon library in the demo app   | D4 removes the copies. The apps of the tokens package get their icons from the tokens. The `icons` type and its native rules stay, proven on fixtures, for the icons a brand owns. Come back when the demo app shows an icon of the library. |
| An `.aar` per Android job          | The tokens package attaches one to its releases. The archive of a job holds the same `res/` tree. Session 3.2 can add it if an app asks.                                                                                                     |

## Decisions

| ID  | Decision                                                                                | Recommendation or outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Status  |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| D1  | What is the branch flow, what is `app/docs`, and how are they protected?                | `develop` is the integration branch, as in `chassis-website`, `chassis-css` and `chassis-react`: work is merged into it, locally by the maintainer or by a pull request against it, and CI runs on every push to it. The same commit then moves to `staging`, which deploys the staging site, to `main`, which deploys the site, and to `app/docs`, which the sites vendor. Each is a fast-forward push, and CI does not run again. The ruleset on `main`, `staging` and `app/docs` blocks force pushes and deletion, and requires the four checks on the commit. Until Phase 3, a push to `app/docs` that changes the version makes the tag. Delete `dev/build-test` and `migration` if merged. Decided in the settings session of 2026-09-30. | decided |
| D2  | How is the output distributed?                                                          | Not on npm. A release attaches one archive per job, `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, built with the optimizations on and verified by CI. The sites keep the submodule on `app/docs`. The build tool is not published either; session 3.1 removes `publishConfig`. Decided in session 1.1.                                                                                                                                                                                                                                                                                                                                                                                                                               | decided |
| D3  | Single package with `site/`, or a workspace with `packages/assets` and `packages/site`? | Workspace, as tokens, css and react. It lets a consumer install the assets package alone. It needs `chassis-docs vendor` to install with `--filter @chassis-ui/assets`, see the sibling tasks; until then `pnpm install --ignore-workspace` at the root must still make `pnpm assets:site` work.                                                                                                                                                                                                                                                                                                                                                                                                                                                | open    |
| D4  | What stays in `source/`?                                                                | The fonts, images and logos that this repository owns, and `docs/icons/cx-sprite.svg`, which every site reads (F27). The copies of `@chassis-ui/icons` and `default.tokens.json` are removed in session 2.2. The demo app gets no icon of the library, see Parked. Decided in session 1.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | decided |
| D5  | What is the source layout?                                                              | `source/<brand>/shared/<type>/`, `source/<brand>/<app>/<type>/`. Override order for a job: `default/shared`, `default/<app>`, `<brand>/shared`, `<brand>/<app>`. Types are `fonts`, `images`, `icons` and `other`. A later layer overrides an asset, not a file, and `shared` cannot be the name of an app. Decided in session 1.1.                                                                                                                                                                                                                                                                                                                                                                                                             | decided |
| D6  | Committed variants or derived variants?                                                 | Derived. One master per image at the highest density, and `images.json` with rules that name the densities, sizes and formats. The Figma screenshots keep 1x and 2x as they are exported, under a rule with `"committed": true`. Sizes are rounded half up, which gives the sizes of the variants committed today. Decided in session 1.1.                                                                                                                                                                                                                                                                                                                                                                                                      | decided |
| D7  | Are optimizations on by default?                                                        | Off by default, on per platform with `chassis.build.options.<platform>.optimize`. Deriving the variants, the WOFF2 files and the native files is not an optimization and always runs, since the consumer contract names derived files (F31). Decided in session 1.1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | decided |
| D8  | What happens to the fonts?                                                              | The fonts leave the docs app. The demo app keeps them: one OTF or TTF file per face, named by role, with `fonts.json` and the license of every family. The demo app gets the `web` platform, where the build writes WOFF2 and `fonts/fonts.css`. Subsetting is an optimization. Decided in session 1.1.                                                                                                                                                                                                                                                                                                                                                                                                                                         | decided |
| D9  | What does the Android output look like?                                                 | A `res/` tree per job, as the tokens package writes: rasters by density in `drawable-*`, also at 1x, vector drawables from SVG in `drawable`, fonts in `font/` with one `font-family` resource per family. One raster format per image, WebP if its rule lists it. Names `snake_case` from the path below the type folder, icons `ic_`. A collision fails the job. Decided in session 1.1.                                                                                                                                                                                                                                                                                                                                                      | decided |
| D10 | What does the iOS output look like?                                                     | The folder of a job is a Swift package, `ChassisAssets<App><Brand>`: `Package.swift`, `ChassisAssets.swift`, `ChassisAssets.xcassets` and `Fonts/` with `Fonts.plist`. Image sets are named in `PascalCase` from the path, icons `Icon`, rendered as templates. No package at the root, since `dist/` is not committed (F30). The catalog is not named `Assets.xcassets`, the name of the catalog of every app. Decided in session 1.1.                                                                                                                                                                                                                                                                                                         | decided |
| D11 | What is the golden reference: a committed `dist/` or a manifest?                        | A manifest per job, `test/golden/<platform>/<app>-<brand>.json`: the output manifest that the job writes, without the version. `dist/` is not committed. `verify` builds into a scratch directory and compares; `diff` reads the golden files of two commits. The hash of a derived file is compared on the operating system of CI, until session 2.3 has measured the others. Decided in session 1.2.                                                                                                                                                                                                                                                                                                                                          | decided |
| D12 | What happens to the identical light and dark Figma screenshots?                         | Keep every file. They are exports: a component that looks the same in both modes, and a state that is exported under two names, are facts of the design, and the pages read each file by its name (F34). The lint reports files with the same content in one folder, and leaves out the images of a `committed` rule. Decided in session 1.1, corrected in session 1.2.                                                                                                                                                                                                                                                                                                                                                                         | decided |
| D13 | Which version does the rewrite ship as?                                                 | 0.2.0. A minor bump that the changelog marks as breaking, under the `0.x` rule of the tokens package. 1.0 waits for the requirements under Breaking changes. Decided in session 1.2, with the draft of the changelog entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | decided |

## Tasks for the siblings

Work that belongs in another repository and was found while reviewing this one. Recorded
here and, when a session gets to it, in `ref/SIBLING_TASKS.md` of `chassis-website`.

| ID  | Repository                     | Task                                                                                                                                                                                                                                                        | Needs                   | Status |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| W1  | chassis-website                | `chassis-docs vendor`: install with `pnpm install --frozen-lockfile --filter @chassis-ui/assets` when the submodule is a workspace, and fall back to the current command. Needed before this repository moves to the workspace layout of D3.                | D3 decided              | open   |
| W2  | chassis-website                | `chassis-docs vendor`: pull only the LFS files the docs app needs, with `git lfs pull --include`, and skip the build when a release archive for the pinned commit exists. The next step of the website's D9.                                                | Phase 3 of this roadmap | open   |
| W3  | chassis-website                | Mark AST4 in `SIBLING_TASKS.md` as done: the tag `v0.1.8` exists.                                                                                                                                                                                           | nothing                 | open   |
| W4  | chassis-website                | Update the "Assets submodule" column and A10 when `app/docs` moves to the first release of the new build, and record the paths that 0.2.0 changed for every site.                                                                                           | 0.2.0 released          | open   |
| W5  | chassis-tokens                 | If the demo app's assets are meant for the same apps as the tokens, add the assets library of `Package.swift` and the Android `res/` tree to the native sample apps there, so that tokens and assets are proven together.                                   | Phase 2 of this roadmap | open   |
| W6  | chassis-css                    | The default of `$icon-url-prefix` is `/static/icons/svgs/`, a path that only the copy of the icons in this repository serves. No compiled CSS uses it today. Point it at a path that `@chassis-ui/icons` serves, or document that a site sets it.           | 0.2.0 released          | open   |
| W7  | chassis-website                | `chassisStatic()` of the starter says that the fonts come from `chassis-assets`. The docs output has no fonts from 0.2.0 on. Correct the comment.                                                                                                           | 0.2.0 released          | open   |
| W8  | chassis-website, chassis-figma | Give the screenshots of the Figma components a job of their own, so that five sites stop pulling and copying 45 MB that only `chassis-figma` reads (F32). It needs an app `figma` here, and a way for `chassis-docs vendor` to build the jobs a site names. | Phase 3 of this roadmap | open   |

## Session log

| Date       | Session       | What was done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-29 | Review        | Reviewed the repository, ran the lint, the tests, a full build and the validator, and read `chassis-ui/tokens` and `chassis-ui/website` for the conventions and the consumer contract. Wrote this roadmap. No code changed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-29 | 0.1           | CI runs on pull requests and on pushes to `main` and `app/docs`. Prettier fixed on four site files. Dependencies upgraded within their ranges: audit from 37 advisories to none, Astro 7.3.5, the Chassis packages off their prereleases. `sitePath` set for the "View on GitHub" link of `@chassis-ui/docs` 0.5.1 (website task A1). Site built before and after: HTML identical apart from whitespace and that link. Lint, `astro check`, the 39 build tests, the asset build and the validator pass. Added F25 and F26. `app/docs` is left for the maintainer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-29 | 0.2           | `check` can fail, and the lockfile check that could not is deleted. CI has four jobs, Lint, Assets, Site and Audit, reading Node.js from `.nvmrc`, with a Git LFS cache. Both workflows are pinned by commit, keep no credentials and have timeouts; only the release job writes. `.nvmrc` 24 and `engines` `>=22.12.0`. Prettier covers the repository. `generateAsssets` renamed. `--brand` takes several values, and `pnpm test` exists. README layout, commands and clone steps corrected. CI started by hand on the branch. The ruleset and the security settings are left for the maintainer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-09-30 | 1.1           | Read the build, `source/`, a full build of 0.1.8 and the sources of the six sites. Corrected the consumer contract: the sites also read `icons/cx-sprite.svg`, four logos and the Figma screenshots, and `images/manifest.json` is their own (F27). Decided D2, D4, D5, D6, D7, D8, D9, D10 and D12. Wrote the scope, the consumer contract, the source contract and the output contract in `docs/architecture.md`, with the image and font manifests, the rules of the source lint, the native names and what 0.2.0 changes. Differences from the recommendations: `cx-sprite.svg` stays, the demo app gets the `web` platform, deriving always runs, the iOS output is a Swift package per job and its catalog is `ChassisAssets.xcassets`. Added F27 to F33 and W6 to W8, and changed the tasks of sessions 2.2 to 2.5 to match. No code changed.                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-09-30 | 1.2           | Completed `docs/architecture.md`: the build in one picture, ten design decisions, the modules with their responsibility and the data between them, the configuration and the command line, the checks, the known oddities and the history. Read the build of `chassis-tokens` for the conventions. Decided D11 and D13. Recorded what 0.2.0 changes for each consumer, and drafted its changelog entry. Corrected the contract of session 1.1: 323 groups of files with the same content share a folder under `images/figma/`, and the pages read each by name, so the lint leaves out the images of a `committed` rule (F34, D12). Added F35. Changed the tasks of sessions 2.1, 2.2 and 2.6 to match. Phase 1 is done. No code changed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-30 | 0.2, settings | The maintainer brought `app/docs` level with `main` and added the ruleset. Read back from the API: `main`, `app/docs` and `staging` are at `cbb861d`; the ruleset "Protect main and app/docs" is active, without a bypass, with no deletion, no force push and the four required checks. Secret scanning, push protection and Dependabot alerts are still off. Ticked AST1, the ruleset and the force push criterion. Open in Phase 0: the security settings, and CI green on `main`, `app/docs` and a pull request, which waits for the pull request of `dev/rewrite`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-09-30 | 0.2, settings | Read the settings again: secret scanning and push protection are on, with no alert. Dependabot alerts are still off. The maintainer merges locally, without pull requests: recorded how a commit passes the ruleset that way, by a run started by hand on the branch and a fast-forward push.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-30 | 0.2, settings | Decided D1 with the maintainer: `develop` is the integration branch, as in the website, css and react. CI now runs on pushes to `develop` and on pull requests, and no longer on pushes to `main` and `app/docs`, where the ruleset needs the checks before the push. Added F36. "Left for you" has the steps, and two settings to bring in line with the website: `staging` in the ruleset, and `Audit` not required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-30 | 0.2, settings | Merged `dev/rewrite` into `develop` as a fast-forward and pushed it. CI passed on `develop` at `5da1168`, with the four checks. Pushed the same commit to `staging`, where the site and the files of the consumer contract answered, then to `main` and `app/docs`. The ruleset took each push. Vercel deployed production, and `chassis-ui.com/assets/` answers. Tag Release ran on `app/docs` and made no tag, since the version is 0.1.8. Phase 0 has one task open: Dependabot alerts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-30 | 0.2, settings | The maintainer turned on the dependency graph and Dependabot alerts. Read back from the API: on, 998 packages, no open alert. Every task and every exit criterion of Phase 0 is ticked. Open for the maintainer to decide: `staging` in the ruleset, and `Audit` as a required check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-30 | 0.2, settings | The maintainer added `staging` to the ruleset. Read back from the API: `main`, `staging` and `app/docs` have no deletion, no force push and the four required checks; `develop` has no rule. `Audit` is still a required check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-30 | 2.1           | Built the core of the new build beside the old one: `config.js`, `plan.js`, `inventory.js`, `names.js`, the rules of the three platforms, `pipeline.js` with `cache.js`, `manifest.js`, the library `index.js` with `build()` and `plan()`, `cli.js` with the command `build`, and `logger.js`. Acceptance met for all six jobs: the new build writes the 10121 files of 0.1.8 byte for byte, and `chassis-assets.json`, in about a second. `pnpm assets` and `pnpm assets:site` run the new build, and `--clean` fails with what replaced it. Pulled forward from session 2.6: Vitest with 169 unit tests, and the type check of the new modules. CI has the type check and the comparison with 0.1.8. Ran locally: lint, Prettier, type check, the unit tests, the three old suites, the validator, the comparison and the site build. Corrected the Build System page and the README where they named `--clean`. Differences from the plan: the command line has `build` only until the other commands exist, the rules of iOS and Android reproduce 0.1.8 too, a job removes before it writes, and paths that differ by case collide. Added F37 and F38, and changed the tasks of sessions 2.2 and 2.6 to match. Not pushed, and CI has not run on it. |
| 2026-09-30 | Recovery      | The roadmap is superseded, see the notice at the top. Archived the rewrite at `archive/rewrite-2026-09` and reverted session 2.1 and `docs/architecture.md` on top of `main`. `develop` is reset to `main` by the maintainer, since a force push is left to a person. Lint, the tests, the build and the validator pass on the reverted tree.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
