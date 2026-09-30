# Architecture

How the build of Chassis Assets works, as it is. Every claim here points at a line of code or
at a page of the documentation site; where the two disagree, the roadmap's findings say which
one is corrected. This document describes; the pages in `site/content/docs/` specify.

Written in session 1.1 of [the roadmap](../ref/ROADMAP.md), 2026-09-30, at `develop`
`2bcbd96`.

## The build in one picture

```
package.json                    source/                                   dist/
  chassis.defaults.brandFolder    default/<app>/<type>/…   ─┐               <platform>/<app>/<brand>/
  chassis.build.brands            <brand>/<app>/<type>/…   ─┴─ copy ──▶      <type>/…
  chassis.build.apps                                          │
                                                              ├─ filter by type and platform
        --brand --app --platform ─▶ jobs                      ├─ Android: density folders
        --clean --no-clean       ─▶ clean or keep dist/       ├─ rename per platform
                                                              └─ remove empty folders
```

One **job** is a brand, an app and a platform. `generateAssets()` in `build/build-assets.js`
loops over every brand of `chassis.build.brands`, every app of `chassis.build.apps` and every
platform listed for that app, skips the ones the filters leave out, and runs
`processAssets()` for each. A job writes `dist/<platform>/<app>/<brand>/`
(`build-assets.js:504`).

For each job, in order:

1. **Copy** `source/<brandFolder>/<app>/` into the output folder, then `source/<brand>/<app>/`
   over it (`processAssets()`, `copyFilesWithProcessor()`). A brand file with the same path as
   a default file overwrites it. That is the override: brand over default, per app. A missing
   brand folder is fine; a missing default folder is an error.
2. **Filter** while copying. The first folder under the app decides the type: `fonts`,
   `images` or `icons` get the processor's rules, any other folder is copied whole. Files and
   folders that match `IGNORE_PATTERNS`, and any name that starts with a dot, are skipped.
3. **Place images** for Android. `androidProcessor.processImage()` puts a file with a
   resolution indicator (`@2x`) into a density folder and a file without one into `drawable/`,
   in both cases under the folder the file came from.
4. **Rename** every file in the output folder with the processor's `renameFile()`
   (`renameFilesRecursively()`). The copy keeps the source name; the rename pass runs after.
   A rename that lands on an existing name is a **collision**: the build warns and the file
   renamed last wins (`trackRename()`).
5. **Remove empty folders** left by the filters (`cleanupEmptyDirectories()`).

Before the jobs, `validateConfiguration()` checks that brands and apps are configured and that
the default brand folder exists, and the build removes `dist/` when it is a full build, or
when `--clean` is given, and keeps it when a filter or `--no-clean` is given (`shouldClean`,
`build-assets.js:446-457`). With `--clean`, the whole of `dist/` goes, not only the selected
jobs; roadmap decision D6 changes that.

## The modules

| Module                                                  | Owns                                                                                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `build/build-assets.js`                                 | The CLI (`parseArgs()`), the configuration check, the job loop, copying, the rename pass, the collision tracker, the ignore list, `generateAssets()`. Reads `package.json` when loaded.    |
| `build/processors/shared.js`                            | `extractResolutionIndicator()`, `isAllowedFormat()`, `isExcludedFormat()`. Pure.                                                                                                           |
| `build/processors/web.js`                               | The web processor: kebab-case names, indicator kept, fonts limited to `.woff`, `.woff2`, `.css`, `.scss`, no image or icon filter.                                                         |
| `build/processors/ios.js`                               | The iOS processor: snake_case names, indicator kept, fonts `.ttf` and `.otf`, icons `.svg` and `.pdf`, images without `.webp`.                                                             |
| `build/processors/android.js`                           | The Android processor: snake_case names, `ic_` prefix under `icons/`, indicator removed, density folders, fonts `.ttf` and `.otf`, icons `.svg`, images without `.webp`, `processImage()`. |
| `build/processors/index.js`                             | The registry `platformProcessors`, `getProcessor()`, `getPlatformNames()`. A platform of `chassis.build.apps` must be a key here.                                                          |
| `build/asset-types.js`                                  | The extension lists per type and `isMetadataFile()`, used by the validator only.                                                                                                           |
| `build/analyze-assets.js`                               | `AssetAnalyzer`: sizes, types, largest files, duplicates by content hash, recommendations. Its own `parseArgs()`.                                                                          |
| `build/validate-assets.js`                              | `AssetValidator`: eight checks of an existing `dist/` against `source/` and the configuration.                                                                                             |
| `build/api/index.js`                                    | `ChassisAssets`: the configuration as an object, the combinations, an inventory of a brand and app, `build()`, `getStats()`, `validate()`.                                                 |
| `build/change-version.js`                               | Bumps the version in `package.json`, `README.md` and `site/config.yml`. Replaced by Changesets in roadmap session 3.2.                                                                     |
| `build/build-site.js`, `html-validate.js`, `vnu-jar.js` | The site's checks. `build-site.js` is called by nothing. Roadmap session 5.1 replaces the two validators with the `chassis-docs` commands.                                                 |

The processors are the only platform knowledge. Everything else is the same for every
platform. A new platform is a new file in `build/processors/` and a key in the registry, as
the build-system page describes; it may add `processImage()` as Android does.

## Configuration

```json
{
  "chassis": {
    "defaults": { "brandFolder": "default" },
    "build": {
      "brands": ["chassis", "example"],
      "apps": { "docs": ["web"], "demo": ["ios", "android"] }
    }
  }
}
```

- `defaults.brandFolder`: the folder under `source/` that every brand falls back to.
- `build.brands`: the brands to build. A brand needs no folder of its own; `chassis` has none
  and builds from `default` alone.
- `build.apps`: each app with the platforms it is built for. The jobs are every brand times
  every app times the app's platforms: six today.

## The command line

| Command                         | What it does                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm assets`                   | Every job. Removes `dist/` first.                                            |
| `--brand <name…>`               | Only these brands. One or more values. Keeps `dist/`.                        |
| `--app <name…>`                 | Only these apps.                                                             |
| `--platform <name…>`            | Only these platforms.                                                        |
| `--clean`                       | Remove `dist/` even with filters.                                            |
| `--no-clean`                    | Keep `dist/` even without filters.                                           |
| `pnpm assets:site`              | `pnpm assets --clean --brand chassis --app docs`: the job the sites consume. |
| `pnpm assets:analyze [filters]` | The analyzer over `source/` and `dist/`.                                     |
| `pnpm assets:validate`          | The validator over an existing `dist/`.                                      |
| `pnpm test`                     | The three test scripts under `test/`.                                        |

A filter value that is not configured selects nothing and the build exits 0 (roadmap F18).

## Output contract

The layout is `dist/<platform>/<app>/<brand>/<type>/…`, with the subfolders of `source/`
kept. Changing a path or a name in it is a breaking change while the version is `0.x`, see
the roadmap.

### Web

- Names: kebab-case, lowercase; `@2x` and `@3x` kept. `MyFont@2x.woff2` becomes
  `my-font@2x.woff2`. A dot inside a name becomes a hyphen: `chassis-icons.min.css` becomes
  `chassis-icons-min.css`, `default.tokens.json` becomes `default-tokens.json`.
- `fonts/`: `.woff`, `.woff2`, `.css` and `.scss` files, nothing else.
- `images/`, `icons/` and every other folder: every file.
- The docs job, `dist/web/docs/chassis/`, is what every Chassis site copies to `/static/`. The
  files it reads are listed in the roadmap's consumer contract.

### iOS

- Names: snake_case, lowercase; `@2x` and `@3x` kept.
- `fonts/`: `.ttf` and `.otf`.
- `images/`: every format except `.webp`.
- `icons/`: `.svg` and `.pdf`. The icon font and its stylesheets are left out.
- Other folders: every file.

### Android

- Names: snake_case, lowercase; the resolution indicator is removed from the name. Under
  `icons/`, the name gets `ic_` unless it has it.
- `fonts/`: `.ttf` and `.otf`.
- `images/`: every format except `.webp`. A file with an indicator goes into
  `drawable-mdpi/` (`@1x`), `drawable-hdpi/` (`@1.5x`), `drawable-xhdpi/` (`@2x`),
  `drawable-xxhdpi/` (`@3x`) or `drawable-xxxhdpi/` (`@4x`); a file without one goes into
  `drawable/`. Both are created under the folder the file came from, so `images/logo/x@2x.png`
  becomes `images/logo/drawable-xhdpi/x.png` (roadmap F4, D5).
- `icons/`: `.svg` only, as SVG. No conversion to vector drawables (roadmap F5).
- Other folders: every file.

## Checks

| Command                                                 | Checks                                                                                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm assets:lint`                                      | ESLint over `build/`.                                                                                                                                                                           |
| `pnpm lint:prettier`                                    | Prettier over the repository.                                                                                                                                                                   |
| `pnpm test`                                             | `test/build.test.js` (14 checks, full builds into `dist/`), `test/analyze.test.js` (10), `test/api.test.js` (16). Not hermetic; roadmap Phase 2 replaces them.                                  |
| `pnpm assets:validate`                                  | `dist/` exists; `source/` exists; every job has a folder; every type folder is present; every source file is in `dist/` under its platform name; the counts; no empty folder; the naming rules. |
| `pnpm site:lint`, `pnpm check:astro`, `pnpm site:build` | The site.                                                                                                                                                                                       |
| CI                                                      | Lint, Assets (test, build, validate), Site, Audit, on `develop` and on pull requests.                                                                                                           |

## Known oddities

Kept on purpose until a decision of the roadmap says otherwise. Do not fix one without a
changeset that says what breaks.

- A dot inside a source name becomes a hyphen on the web (`chassis-icons-min.css`,
  `default-tokens.json`) and an underscore on iOS and Android. Consumers read the renamed
  names.
- 40 screenshots under `images/figma/` have capitals or spaces in `source/`; the web output
  has them in kebab-case and `chassis-figma` reads those names. Roadmap F14 renames the
  sources to the output names, which changes nothing in `dist/`.
- `icons/icons/preview.html` and `chassis-icons.json` of the icon package are copied to the
  web output with the rest of the package.
- The validator prints every result twice (roadmap F19).
- A collision after renaming warns and the file renamed last wins.
- The two font stylesheets in `fonts/` declare files that are not in the folder (roadmap F3,
  fixed in session 1.2).

## History

- 0.1.0 to 0.1.8: the build as described here, one `package.json`, tests as scripts.
- 2026-09-29 to 2026-09-30: a rewrite was started and reverted; see
  `ref/ROADMAP-2026-09-29-superseded.md`. The discarded work is at
  `archive/rewrite-2026-09`.
- 2026-09-30: this document and the roadmap that governs the next changes.
