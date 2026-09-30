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

Before the jobs, `validateConfiguration()` checks that brands and apps are configured, that
the default brand folder exists and that every platform has a processor, and `planJobs()`
turns the filters into the list of jobs. A filter value that is not configured, or filters
that select no job, fail with the configured values. Then the build removes the output: the
whole of `dist/` for a full build, the folders of the selected jobs for a filtered build with
`--clean`, nothing for a filtered build without it or with `--no-clean` (D6).

A source file that is a Git LFS pointer fails the build, since the output would be a pointer
too. `--allow-lfs-pointers`, or `CHASSIS_ALLOW_LFS_POINTERS=1`, copies the pointers, for a
job that needs no binaries. `--dry-run` runs the copy step without writing and prints the
jobs with their file counts.

## The modules

| Module                                                  | Owns                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build/build-assets.js`                                 | The library: `loadConfig()`, `parseArgs()`, `planJobs()`, `isLfsPointer()`, `keepsFile()` (the filter of a type per platform), the configuration check, the job loop, copying, the rename pass, `createCollisionTracker()`, the ignore list, `generateAssets(options)`. `package.json` is read when `generateAssets()` runs, from `options.cwd`. Only the entry at the bottom reads `process.argv` and exits. |
| `build/processors/shared.js`                            | `extractResolutionIndicator()`, `isAllowedFormat()`, `isExcludedFormat()`. Pure.                                                                                                                                                                                                                                                                                                                              |
| `build/processors/web.js`                               | The web processor: kebab-case names, indicator kept, fonts limited to `.woff`, `.woff2`, `.css`, `.scss`, no image or icon filter.                                                                                                                                                                                                                                                                            |
| `build/processors/ios.js`                               | The iOS processor: snake_case names, indicator kept, fonts `.ttf` and `.otf`, icons `.svg` and `.pdf`, images without `.webp`.                                                                                                                                                                                                                                                                                |
| `build/processors/android.js`                           | The Android processor: snake_case names, `ic_` prefix under `icons/`, indicator removed, density folders, fonts `.ttf` and `.otf`, icons `.svg`, images without `.webp`, `processImage()`.                                                                                                                                                                                                                    |
| `build/processors/index.js`                             | The registry `platformProcessors`, `getProcessor()`, `getPlatformNames()`. A platform of `chassis.build.apps` must be a key here.                                                                                                                                                                                                                                                                             |
| `build/asset-types.js`                                  | The extension lists per type and `isMetadataFile()`, used by the validator only.                                                                                                                                                                                                                                                                                                                              |
| `build/analyze-assets.js`                               | `AssetAnalyzer(options)`: sizes, types, largest files, duplicates by content hash, recommendations. `parseAnalyzerArgs()` for the entry. Takes `cwd` and `out`.                                                                                                                                                                                                                                               |
| `build/validate-assets.js`                              | `DistValidator(options)`: eight checks of an existing output against `source/` and the configuration. Takes `cwd` and `out`; `runValidation()` resolves to true or false.                                                                                                                                                                                                                                     |
| `build/api/index.js`                                    | `ChassisAssets(configPath, { cwd, out })`: the configuration as an object, the combinations, an inventory of a brand and app, `build({ brands, apps, platforms, clean, quiet })`, `getStats()`, `validate()`.                                                                                                                                                                                                 |
| `build/change-version.js`                               | Bumps the version in `package.json`, `README.md` and `site/config.yml`. Replaced by Changesets in roadmap session 3.2.                                                                                                                                                                                                                                                                                        |
| `build/build-site.js`, `html-validate.js`, `vnu-jar.js` | The site's checks. `build-site.js` is called by nothing. Roadmap session 5.1 replaces the two validators with the `chassis-docs` commands.                                                                                                                                                                                                                                                                    |

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

| Command                          | What it does                                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm assets`                    | Every job. Removes `dist/` first.                                                                                                                                                                                               |
| `--brand <name…>`                | Only these brands. One or more values. Keeps `dist/`.                                                                                                                                                                           |
| `--app <name…>`                  | Only these apps.                                                                                                                                                                                                                |
| `--platform <name…>`             | Only these platforms.                                                                                                                                                                                                           |
| `--clean`                        | Remove the output first: all of `dist/` without filters, the folders of the selected jobs with filters.                                                                                                                         |
| `--no-clean`                     | Keep `dist/` even without filters.                                                                                                                                                                                              |
| `--out <dir>`                    | Write to another folder than `dist/`. The analyzer and the validator take it too.                                                                                                                                               |
| `--cwd <dir>`                    | The repository root, where `package.json` and `source/` are.                                                                                                                                                                    |
| `--dry-run`                      | Print the jobs and their file counts, write nothing.                                                                                                                                                                            |
| `--allow-lfs-pointers`           | Copy Git LFS pointer files instead of failing. `CHASSIS_ALLOW_LFS_POINTERS=1` does the same.                                                                                                                                    |
| `--quiet`, `--help`, `--version` | Errors only; the options; the version of `package.json`.                                                                                                                                                                        |
| `pnpm assets:site`               | `pnpm assets --clean --brand chassis --app docs`: the job the sites consume.                                                                                                                                                    |
| `pnpm assets:analyze [filters]`  | The analyzer over `source/` and `dist/`.                                                                                                                                                                                        |
| `pnpm assets:validate`           | `dist/` exists; `source/` exists; every job has a folder; every type folder is present; every source file is in `dist/` under its platform name; the counts; no empty folder; the naming rules. Exit code 1 when a check fails. |
| `pnpm test`                      | Vitest over `test/`, on the fixture in `test/fixtures/`, into temporary folders. Needs no Git LFS files. See `test/README.md`.                                                                                                  |

A filter value that is not configured, or filters that together select no job, fail the build and name the configured values.

## Output contract

The layout is `dist/<platform>/<app>/<brand>/<type>/…`, with the subfolders of `source/`
kept. Changing a path or a name in it is a breaking change while the version is `0.x`, see
the roadmap.

### Web

- Names: kebab-case, lowercase; `@2x` and `@3x` kept. `MyFont@2x.woff2` becomes
  `my-font@2x.woff2`. A dot inside a name becomes a hyphen: `chassis-icons.min.css` becomes
  `chassis-icons-min.css`, `default.tokens.json` becomes `default-tokens.json`.
- `fonts/`: `.woff`, `.woff2`, `.css`, `.scss` and `.txt` files, nothing else. The stylesheets `text.css`, `display.css` and `code.css` declare one `@font-face` per file of the folder, by the real family name, with the weight of each role. The `<role>-license.txt` files are the licenses of the families.
- `images/`, `icons/` and every other folder: every file.
- The docs job, `dist/web/docs/chassis/`, is what every Chassis site copies to `/static/`. The
  files it reads are listed in the roadmap's consumer contract.

### iOS

- Names: snake_case, lowercase; `@2x` and `@3x` kept.
- `fonts/`: `.ttf`, `.otf` and the `.txt` license files.
- `images/`: every format except `.webp`.
- `icons/`: `.svg`, `.pdf` and `.png`. The icon font and its stylesheets are left out.
- Other folders: every file.

### Android

- Names: snake_case, lowercase; the resolution indicator is removed from the name. Under
  `icons/`, the name gets `ic_` unless it has it.
- `fonts/`: `.ttf`, `.otf` and the `.txt` license files.
- `images/`: every format except `.webp`. A file with an indicator goes into
  `drawable-mdpi/` (`@1x`), `drawable-hdpi/` (`@1.5x`), `drawable-xhdpi/` (`@2x`),
  `drawable-xxhdpi/` (`@3x`) or `drawable-xxxhdpi/` (`@4x`); a file without one goes into
  `drawable/`. Both are created under the folder the file came from, so `images/logo/x@2x.png`
  becomes `images/logo/drawable-xhdpi/x.png` (roadmap F4, D5).
- `icons/`: `.svg` only, as SVG. No conversion to vector drawables (roadmap F5). A PNG icon is not kept, since the build places only `images/` in density folders (D15).
- Other folders: every file.

## Checks

| Command                                                 | Checks                                                                                                                                                                                          |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm assets:lint`                                      | ESLint over `build/` and `test/`.                                                                                                                                                               |
| `pnpm lint:prettier`                                    | Prettier over the repository.                                                                                                                                                                   |
| `pnpm test`                                             | The unit tests, the golden test of the fixture against `test/golden/`, the analyzer, the validator, the API and the command line. `test/README.md` lists the files.                             |
| `pnpm assets:validate`                                  | `dist/` exists; `source/` exists; every job has a folder; every type folder is present; every source file is in `dist/` under its platform name; the counts; no empty folder; the naming rules. |
| `pnpm site:lint`, `pnpm check:astro`, `pnpm site:build` | The site.                                                                                                                                                                                       |
| CI                                                      | Lint, Assets (test, build, validate), Site, Audit, on `develop` and on pull requests.                                                                                                           |

## Known oddities

Kept on purpose until a decision of the roadmap says otherwise. Do not fix one without a
changeset that says what breaks.

- A dot inside a source name becomes a hyphen on the web (`chassis-icons-min.css`,
  `default-tokens.json`) and an underscore on iOS and Android. Consumers read the renamed
  names.
- Eight screenshots under `images/figma/` carry a Figma export number after the resolution
  indicator, `card-orientation-top-2x-1.png`. The web build wrote that name from
  `card-orientation-top@2x-1.png`, and session 1.2 renamed the sources to the output names,
  so `chassis-figma` keeps reading them. They are not `@2x` files to the build.
- `icons/icons/preview.html` and `chassis-icons.json` of the icon package are copied to the
  web output with the rest of the package.
- A collision after renaming warns and the file renamed last wins.
- The copy of `@chassis-ui/icons` under `icons/` is behind the package: 15 SVG files of
  0.3.1 are missing, and the icon font differs. See "Refreshing the icons".

## Refreshing the icons

The `icons/` folders of `source/default/docs/` and `source/default/demo/` hold the build
output of `@chassis-ui/icons`, plus `cx-sprite.svg`, which is this repository's. To bring
them level with the package, on a machine with Git LFS:

```shell
pnpm install
for app in docs demo; do
  rm -rf source/default/$app/icons/icons source/default/$app/icons/svgs
  cp -r node_modules/@chassis-ui/icons/icons source/default/$app/icons/icons
  cp -r node_modules/@chassis-ui/icons/svgs source/default/$app/icons/svgs
done
pnpm assets && pnpm assets:validate
```

Commit the result with a changeset: the web output of both brands changes, and the icon
font files are Git LFS objects, so the commit must be made where `git lfs` is installed.

## History

- 0.1.0 to 0.1.8: the build as described here, one `package.json`, tests as scripts.
- 2026-09-29 to 2026-09-30: a rewrite was started and reverted; see
  `ref/ROADMAP-2026-09-29-superseded.md`. The discarded work is at
  `archive/rewrite-2026-09`.
- 2026-09-30: this document and the roadmap that governs the next changes.
- 2026-09-30: the tests become a Vitest suite on a fixture, with a golden baseline (roadmap
  session 2.1).
