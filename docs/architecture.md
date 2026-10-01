# Architecture

How the build of Chassis Assets works, as it is. Every claim here points at a line of code or
at a page of the documentation site; where the two disagree, the roadmap's findings say which
one is corrected. This document describes; the pages in `packages/site/content/docs/` specify.

Written in session 1.1 of [the roadmap](../ref/ROADMAP.md), 2026-09-30, at `develop`
`2bcbd96`.

## The layout

```
package.json          The workspace root: the `chassis` block, the scripts, the lint tools
source/               The assets, `<brand>/<app>/<type>/`
dist/                 The output, not committed
packages/assets/      `@chassis-ui/assets`: the build in `build/`, its tests in `test/`
packages/site/        `chassis-assets-site`: the documentation site
build/                The site's checks and the version script
```

A pnpm workspace, as `chassis-tokens` (roadmap D3). `source/`, `dist/` and the configuration
stay at the root, where the designer and the consumers find them. The build runs from the
root scripts with `node packages/assets/build/cli.js <command>`, never through
`pnpm --filter` or a package name, and imports Node.js modules only: `pnpm install --ignore-workspace`, which
is what `chassis-docs vendor` runs in a site, installs the root package and none of the
build's or the site's packages, and `pnpm assets:site` works with nothing installed at all
(Principle 8). CI builds that way first, in the Assets job.

The repository root of a run is the nearest folder, from the working directory upward, whose
`package.json` has a `chassis` block (`findRoot()` in `root.js`), so the build finds
`source/` from `packages/assets/` too. `--cwd`, or the `cwd` option, names it instead and is
taken as it is. The version is that of `packages/assets/package.json` (`buildVersion()`),
the one place a version is written.

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

One **job** is a brand, an app and a platform. `generateAssets()` in `packages/assets/build/build-assets.js`
loops over every brand of `chassis.build.brands`, every app of `chassis.build.apps` and every
platform listed for that app, skips the ones the filters leave out, and runs
`processAssets()` for each. A job writes `dist/<platform>/<app>/<brand>/`
(`jobDir()`).

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
   While copying, the build works out where each file ends up, `outputLocation()`: the
   folder, with the density folder that `imageFolder()` of the processor names, and the name
   after `renameFile()`. Two source files with different names that end up at one place are
   a **collision**: the build warns and the file copied last wins
   (`createCollisionTracker()`). A brand file over the default file of the same name is not
   one, and the output file is counted once.
4. **Rename** every file in the output folder with the processor's `renameFile()`
   (`renameFilesRecursively()`). The copy keeps the source name; the rename pass runs after.
5. **Remove empty folders** left by the filters (`cleanupEmptyDirectories()`).
6. **Convert**, only with `--vector-drawables` and only for a processor that has
   `vectorDrawables`: each SVG under `icons/` of the job is written as a vector drawable
   beside itself and removed (`convertVectorDrawables()`, `convertFolder()`). See
   "Vector drawables".

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

| Module                                        | Owns                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/assets/build/build-assets.js`       | The library: `loadConfig()`, `parseArgs()`, `planJobs()`, `isLfsPointer()`, `keepsFile()` (the filter of a type per platform), the configuration check, the job loop, copying, the rename pass, `createCollisionTracker()`, the ignore list, `generateAssets(options)`. `package.json` is read when `generateAssets()` runs, from `options.cwd`. Only the entry at the bottom reads `process.argv` and exits. |
| `packages/assets/build/processors/shared.js`  | `extractResolutionIndicator()`, `isAllowedFormat()`, `isExcludedFormat()`. Pure.                                                                                                                                                                                                                                                                                                                              |
| `packages/assets/build/processors/web.js`     | The web processor: kebab-case names, indicator kept, fonts limited to `.woff`, `.woff2`, `.css`, `.scss`, no image or icon filter.                                                                                                                                                                                                                                                                            |
| `packages/assets/build/processors/ios.js`     | The iOS processor: snake_case names, indicator kept, fonts `.ttf` and `.otf`, icons `.svg` and `.pdf`, images without `.webp`.                                                                                                                                                                                                                                                                                |
| `packages/assets/build/processors/android.js` | The Android processor: snake_case names, `ic_` prefix under `icons/`, indicator removed, density folders, fonts `.ttf` and `.otf`, icons `.svg`, every image format, `processImage()`.                                                                                                                                                                                                                        |
| `packages/assets/build/processors/index.js`   | The registry `platformProcessors`, `getProcessor()`, `getPlatformNames()`. A platform of `chassis.build.apps` must be a key here.                                                                                                                                                                                                                                                                             |
| `packages/assets/build/vector-drawables.js`   | The conversion of `--vector-drawables`: `loadConverter()`, which imports `svg2vectordrawable` when it is called and says how to install it when it is missing, `drawsSomething()` and `convertFolder()`. The one module that uses a package.                                                                                                                                                                  |
| `packages/assets/build/asset-types.js`        | The extension lists per type and `isMetadataFile()`, used by the validator only.                                                                                                                                                                                                                                                                                                                              |
| `packages/assets/build/analyze-assets.js`     | `AssetAnalyzer(options)`: sizes, types, largest files, duplicates by content hash, recommendations. `parseAnalyzerArgs()` for the entry. Takes `cwd` and `out`.                                                                                                                                                                                                                                               |
| `packages/assets/build/validate-assets.js`    | `DistValidator(options)`: eight checks of an existing output against `source/` and the configuration. Takes `cwd` and `out`; `runValidation()` resolves to true or false.                                                                                                                                                                                                                                     |
| `packages/assets/build/contract.js`           | The check of the consumer contracts, which are data of the repository: `contracts` of `chassis.checks.json`. `expand()`, `missingFromSet()` and `missingFromContract()` (pure), and `checkContracts({ cwd, out })` over the output of each job that has a contract. It names no job and no file itself. The CLI entry is `pnpm assets:contract`.                                                              |
| `packages/assets/build/verify.js`             | `verify({ cwd, out })`: the validator, then the contract check. `pnpm assets:verify`.                                                                                                                                                                                                                                                                                                                         |
| `packages/assets/build/lint-source.js`        | `checkName()` (pure), `lintSource({ cwd, allowLfsPointers })`: the naming rules of the design-guidelines page, the type folder, Git LFS pointers, brands and apps the build does not read. A name of `lint.allow` of `chassis.checks.json` is a warning. `pnpm assets:lint:source`.                                                                                                                           |
| `packages/assets/build/root.js`               | `findRoot()`, `resolveRoot(cwd)`, `buildVersion()`, `isEntry()`: the repository root of a run, the version of the build, and whether a module was started or imported.                                                                                                                                                                                                                                        |
| `packages/assets/build/cli.js`                | The entry of the root scripts and of `bin`: `build`, `analyze`, `validate`, `contract`, `verify`, `lint-source`, each the `cli(argv)` of its module. Every module still runs on its own, `node packages/assets/build/build-assets.js`.                                                                                                                                                                        |
| `packages/assets/build/types.js`              | The shared JSDoc types: `BuildConfig`, `BuildOptions`, `Job`, `BuildStats`, `Processor` and the problems of the checks. Exports nothing at run time. `tsconfig.json` checks `packages/assets/build/` against them with `checkJs`.                                                                                                                                                                             |
| `packages/assets/build/api/index.js`          | `ChassisAssets(configPath, { cwd, out })`: the configuration as an object, the combinations, an inventory of a brand and app, `build({ brands, apps, platforms, clean, quiet })`, `getStats()`, `validate()`.                                                                                                                                                                                                 |
| `build/sync-version-refs.js`                  | Copies the version of `packages/assets/package.json` to `packages/site/config.yml` and to the badge of `README.md`. The second half of `pnpm changeset:version`.                                                                                                                                                                                                                                              |
| `build/release-notes.js`                      | Prints the entry of a version in `packages/assets/CHANGELOG.md`, for the text of the GitHub release. `pnpm release:notes`.                                                                                                                                                                                                                                                                                    |
| `build/release-archives.js`                   | Writes one archive per platform, app and brand of an existing `dist/`, with the `zip` command. `pnpm release:archives`.                                                                                                                                                                                                                                                                                       |
| `build/check-changeset.js`                    | Fails when the commits since a base change `source/` or `packages/assets/build/` and add no changeset. The Changeset job of CI.                                                                                                                                                                                                                                                                               |

The processors are the only platform knowledge. Everything else is the same for every
platform. A new platform is a new file in `packages/assets/build/processors/` and a key in the registry, as
the build-system page describes; it may add `processImage()` as Android does, with
`imageFolder()` to say where an image goes.

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

`chassis.checks.json`, beside `package.json`, holds what the checks verify. It is optional,
`loadConfig()` reads it with the configuration, and the build uses none of it:

- `contracts`: for a job, `<platform>/<app>/<brand>`, the files a consumer reads by name from
  its output, as a list of entries with `reader`, `files` and `sets`. Read by
  `pnpm assets:contract`. The entries of this repository are those of the Chassis sites: the
  roadmap's consumer contract, as data.
- `lint.allow`: the source files that break a naming rule and are kept, each with `pattern`
  and `reason`. Read by `pnpm assets:lint:source`.

Nothing in `packages/assets/build/` names a brand, an app or a file of this repository
(roadmap Principle 9). A team that adopts the repository changes `source/`, the root
`package.json` and `chassis.checks.json`; the build, the checks and their tests stay as they are, and the tests run
on the fixture, which has its own configuration.

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
| `--cwd <dir>`                    | The repository root, where `package.json` and `source/` are. Default: the nearest folder upward whose `package.json` has a `chassis` block.                                                                                     |
| `--dry-run`                      | Print the jobs and their file counts, write nothing.                                                                                                                                                                            |
| `--allow-lfs-pointers`           | Copy Git LFS pointer files instead of failing. `CHASSIS_ALLOW_LFS_POINTERS=1` does the same.                                                                                                                                    |
| `--vector-drawables`             | Write the SVG icons of Android as vector drawables, `.xml` in place of `.svg`. Off by default. Needs `pnpm install`.                                                                                                            |
| `--quiet`, `--help`, `--version` | Errors only; the options; the version of `packages/assets/package.json`.                                                                                                                                                        |
| `pnpm assets:site`               | `pnpm assets --clean --brand chassis --app docs`: the job the sites consume.                                                                                                                                                    |
| `pnpm assets:analyze [filters]`  | The analyzer over `source/` and `dist/`.                                                                                                                                                                                        |
| `pnpm assets:validate`           | `dist/` exists; `source/` exists; every job has a folder; every type folder is present; every source file is in `dist/` under its platform name; the counts; no empty folder; the naming rules. Exit code 1 when a check fails. |
| `pnpm assets:verify`             | `assets:validate`, then the consumer contract of `dist/web/docs/chassis/`. Exit code 1 when either fails.                                                                                                                       |
| `pnpm assets:contract`           | The consumer contract alone. Run it after `pnpm assets:site`.                                                                                                                                                                   |
| `pnpm assets:lint:source`        | The names and the layout of `source/`, Git LFS pointers. `--allow-lfs-pointers` without Git LFS. Exit code 1 on an error; the known oddities are warnings.                                                                      |
| `pnpm assets:typecheck`          | `tsc -p tsconfig.json` in `packages/assets/`: `build/` against its JSDoc, with `checkJs`. No TypeScript file.                                                                                                                   |
| `pnpm test`                      | Vitest over `packages/assets/test/`, on the fixture in `packages/assets/test/fixtures/`, into temporary folders. Needs no Git LFS files. See `packages/assets/test/README.md`.                                                  |

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
- `images/`: every format, WebP too (D14). A file with an indicator goes into
  `drawable-mdpi/` (`@1x`), `drawable-hdpi/` (`@1.5x`), `drawable-xhdpi/` (`@2x`),
  `drawable-xxhdpi/` (`@3x`) or `drawable-xxxhdpi/` (`@4x`); a file without one goes into
  `drawable/`. Both are created under the folder the file came from, so `images/logo/x@2x.png`
  becomes `images/logo/drawable-xhdpi/x.png` (roadmap F4, D5).
- `icons/`: `.svg` only, as SVG. With `--vector-drawables`, as vector drawables: the same folder and name, `.xml` (roadmap 6.2, D9). A PNG icon is not kept, since the build places only `images/` in density folders (D15).
- Other folders: every file.

### Vector drawables

`pnpm assets --vector-drawables` is the first option of Phase 6 of the roadmap: off by
default, and the default output is the same file for file with and without the code.

- The processor says what is converted: `vectorDrawables: { type: 'icons', from: '.svg', to: '.xml' }`
  on Android, nothing on the web and iOS. The SVG images under `images/` are not converted:
  several exist as PNG under the same name, and two files of one name are one resource.
- The converter is `svg2vectordrawable` with `fillBlack` and three decimals, the options
  `chassis-tokens` uses for its icons. It is an `optionalDependencies` entry of
  `packages/assets/package.json`, so `pnpm install` brings it and
  `pnpm install --ignore-workspace` does not. `loadConverter()` imports it when the option
  is given, before the output is removed; without the package the build fails there and
  the output stays.
- A file that converts to a drawable without a `<path>` stays as SVG, with a warning:
  the SVG file of the icon font, `icons/icons/ic_chassis_icons.svg`. A file that the
  converter throws on is an error of the build.
- The layout does not change: `icons/svgs/ic_arrow_right_solid.xml`. A `res/drawable/`
  layout is roadmap 6.4.
- The validator takes the converted name for the source file, so `pnpm assets:verify`
  passes on either output. The release archives are built without the option.
- Not compiled here: no machine of this repository has the Android SDK, so no `aapt2` run
  has read the drawables.

## Checks

| Command                                                 | Checks                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm assets:lint`                                      | ESLint over `packages/assets/build/` and `packages/assets/test/`.                                                                                                                                                         |
| `pnpm assets:lint:source`                               | The names and the layout of `source/` against the design-guidelines page, and Git LFS pointers.                                                                                                                           |
| `pnpm assets:typecheck`                                 | TypeScript over `packages/assets/build/`, from JSDoc.                                                                                                                                                                     |
| `pnpm lint:prettier`                                    | Prettier over the repository.                                                                                                                                                                                             |
| `pnpm test`                                             | The unit tests, the golden test of the fixture against `packages/assets/test/golden/`, the analyzer, the validator, the API and the command line. `packages/assets/test/README.md` lists the files.                       |
| `pnpm assets:validate`                                  | `dist/` exists; `source/` exists; every job has a folder; every type folder is present; every source file is in `dist/` under its platform name; the counts; no empty folder; the naming rules.                           |
| `pnpm assets:verify`                                    | `assets:validate` and the consumer contract.                                                                                                                                                                              |
| `pnpm site:lint`, `pnpm check:astro`, `pnpm site:build` | The site.                                                                                                                                                                                                                 |
| CI                                                      | Lint (Prettier, the site), Assets (the consumer build with nothing installed, lint, source lint, type check, test, full build, verify), Site, Audit, on `develop` and on pull requests. Changeset, on pull requests only. |

### Checks per changed area

What to run before a commit, by what the commit changes. CI runs all of it.

| Changed                                                  | Run                                                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source/`                                                | `pnpm assets:lint:source`, then `pnpm assets && pnpm assets:verify`. Needs Git LFS for the build.                                                           |
| `packages/assets/build/processors/` or `build-assets.js` | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`; `pnpm test:golden` when the output is meant to change, and review `packages/assets/test/golden/`. |
| The analyzer, validator, contract or lint                | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`, and the command on a full build.                                                                  |
| `packages/assets/test/`                                  | `pnpm assets:lint`, `pnpm test`.                                                                                                                            |
| `chassis.checks.json`                                    | `pnpm assets:lint:source`, `pnpm assets:verify` on a full build.                                                                                            |
| `packages/site/`                                         | `pnpm site:lint`, `pnpm check:astro`, `pnpm site:build`.                                                                                                    |
| Anything                                                 | `pnpm lint:prettier`.                                                                                                                                       |

## Releases

The version is made on `develop` and released from `main`, as in `chassis-website`. The
steps are in `.github/CONTRIBUTING.md`, "Releases".

- A change to `source/` or to `packages/assets/build/` carries a changeset in `.changeset/`.
  `changeset status` sees the build only: `source/` is at the root, outside the package that
  has the version, so `build/check-changeset.js` checks both on a pull request.
- `pnpm changeset:version` runs `changeset version`, which bumps
  `packages/assets/package.json`, writes `packages/assets/CHANGELOG.md` with the entries of
  `.changeset/changelog.js` and deletes the changesets, then `build/sync-version-refs.js`.
- `.github/workflows/release.yml` runs on a push to `main`. When `v<version>` has no tag,
  it reads the results of Lint, Assets, Site and Audit on the commit, builds every job,
  verifies the output, and creates the tag and the GitHub release with one
  `chassis-assets-<platform>-<app>-<brand>-<version>.zip` per job. It installs nothing.
- Nothing is published to npm (roadmap D2). `@chassis-ui/assets` is private.

The tags before this pipeline were made by `tag-release.yml`, which tagged `app/docs` when
a push changed the version there. `v0.1.6` is an annotated tag. `v0.1.8` was moved to its
version commit, `a4b6445`, on 2026-10-01. `v0.1.7` points at `867611c`, a commit of 0.1.6;
its version commit is `992e47e` (roadmap T4).

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
- `icons/icons/chassis-icons.json` of the icon package is copied to the web output with the
  rest of the package.
- A collision of two source files on one output name warns and the file copied last wins.
- On Android, a file with an indicator outside `images/` loses the indicator and gets no
  density folder: `data/poster@2x.png` is `data/poster.png`. Beside a `poster.png` that is a
  collision, and the build warns.
- Eight screenshots under `images/figma/components/` are Figma export copies of another
  screenshot, `card-orientation-top-1.png` and `card-orientation-top-2x-1.png` beside
  `card-orientation-top.png`, in both modes and
  without `@2x`. No page of `chassis-figma` reads them. The contract check requires both
  modes for them, and not the `@2x`: they are the `except` patterns of the screenshot set in
  `chassis.checks.json`.
- `source/default/docs/other/default.tokens.json` and the two `icons/icons/chassis-icons.min.css`
  break the naming rules; `pnpm assets:lint:source` warns about them (`lint.allow` of `chassis.checks.json`).
- The copy of `@chassis-ui/icons` under `icons/` is made by hand, so it is as new as its
  last refresh: 0.3.1, on 2026-10-01. See "Refreshing the icons".
- Chassis CSS builds the URL of a named icon from `$icon-url-prefix`, `/static/icons/svgs/`
  by default, so a site may read any file of `icons/svgs/` by its name. The contract check
  names none of them, because no stylesheet of the siblings names one.

## Refreshing the icons

The `icons/` folders of `source/default/docs/` and `source/default/demo/` hold the build
output of `@chassis-ui/icons`, plus `cx-sprite.svg`, which is this repository's. To bring
them level with the package, on a machine with Git LFS:

```shell
pnpm install
for app in docs demo; do
  rm -rf source/default/$app/icons/icons source/default/$app/icons/svgs
  cp -r packages/site/node_modules/@chassis-ui/icons/icons source/default/$app/icons/icons
  cp -r packages/site/node_modules/@chassis-ui/icons/svgs source/default/$app/icons/svgs
done
pnpm assets && pnpm assets:validate
```

Commit the result with a changeset: the icon output of every job changes, and the icon
font files are Git LFS objects, so the commit must be made where `git lfs` is installed.
The package ships no `preview.html`, so the copy has none. Compare `dist/` before and after:
a name that was under `icons/svgs/` and is gone breaks a site that reads it.

## History

- 0.1.0 to 0.1.8: the build as described here, one `package.json`, tests as scripts.
- 2026-09-29 to 2026-09-30: a rewrite was started and reverted; see
  `ref/ROADMAP-2026-09-29-superseded.md`. The discarded work is at
  `archive/rewrite-2026-09`.
- 2026-09-30: this document and the roadmap that governs the next changes.
- 2026-09-30: the tests become a Vitest suite on a fixture, with a golden baseline (roadmap
  session 2.1).
- 2026-09-30: the consumer contract check, `assets:verify`, the source lint and the type
  check, all in CI (roadmap session 2.2).
- 2026-10-01: a pnpm workspace: the build in `packages/assets/`, the site in `packages/site/`,
  `source/` and `dist/` at the root, one `cli.js` for the commands (roadmap session 3.1).
- 2026-10-01: Changesets, versions made on `develop`, and a release workflow on `main` that
  attaches one archive per platform, app and brand (roadmap session 3.2).
- 2026-10-01: the icons of the default brand are `@chassis-ui/icons` 0.3.1, where they were
  0.1.0 (roadmap F11).
- 2026-10-01: every command has `--help`, the README is written from `package.json` and the
  help texts, and `build/build-site.js`, which nothing called, is deleted (roadmap session
  4.1).
- 2026-10-01: the consumer contracts and the names the source lint keeps are data of
  `chassis.checks.json`, and the build names nothing of this
  repository (roadmap session 3.3).
- 2026-10-01: the contributing guide, the community files, `AGENTS.md` and `WRITING.md`
  (roadmap session 4.2).
- 2026-10-01: `--vector-drawables`, the first optional feature, and the first package the
  build loads, only with its option (roadmap 6.2).
