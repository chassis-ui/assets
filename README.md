# Chassis Assets

> The build of the fonts, images, icons and other design files of the Chassis Design System, and of any team's: from one source tree into the names, formats and folders of the web, iOS and Android.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version: 0.6.1](https://img.shields.io/badge/Version-0.6.1-blue.svg)](https://github.com/chassis-ui/assets)
[![CI](https://github.com/chassis-ui/assets/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/chassis-ui/assets/actions/workflows/ci.yml)

## Overview

A repository of assets holds the design files a designer exports, in `source/<brand>/<app>/<type>/`, and `@chassis-ui/assets` copies them to `dist/<platform>/<app>/<brand>/` with the naming and the formats of each platform. The build is file-driven: add a file to `source/` and it is in the output of the next build. There is no manifest to maintain.

The build is published to npm as [`@chassis-ui/assets`](https://www.npmjs.com/package/@chassis-ui/assets), with the `chassis-assets` command, and `chassis-assets init` writes a repository of assets for a team. The assets of the Chassis sites are in [chassis-ui/website-assets](https://github.com/chassis-ui/website-assets), which this repository vendors as `vendor/assets` to build, to check and to show in its documentation site. The [documentation site](https://chassis-ui.com/assets/docs/getting-started/introduction/) covers the asset types and how to use the output on each platform.

## Getting started

To build the assets of your own brands and apps, install the package in an empty folder and let it write the repository; the [Quick Start](https://chassis-ui.com/assets/docs/getting-started/quick-start/) page takes it from there:

```shell
npx @chassis-ui/assets init --brand acme --app docs:web
```

To work on the build, the site or the Chassis assets, you need:

- **Node.js** 22.12 or later, see `engines` in `package.json`. The repository pins 24 in `.nvmrc`.
- **pnpm**, the version named by `packageManager` in `package.json`. Run `corepack enable` once and pnpm is used at that version.
- **Git LFS**, from [git-lfs.com](https://git-lfs.com), for the submodule. Run `git lfs install` once on your machine. The fonts and the raster images of website-assets are Git LFS files.

Clone the repository, check out the submodule with its Git LFS files, and build the assets:

```shell
git clone https://github.com/chassis-ui/assets.git chassis-assets
cd chassis-assets
pnpm vendor
pnpm assets
```

The build imports Node.js modules only, so it runs on a fresh clone with nothing installed. Install the dependencies to run the tests, the checks, the documentation site and the options that load a package:

```shell
pnpm install
```

A submodule checked out without Git LFS has pointer files in place of the fonts and the images. The build fails on them and lists them; run `pnpm vendor`.

## Repository layout

A pnpm workspace. Run every command from the root.

```
vendor/assets/            -> The chassis-ui/website-assets submodule: the assets of the Chassis sites
vendor/assets/dist/       -> The build output, as dist/<platform>/<app>/<brand>/. Not committed
package.json              -> The commands; the root scripts run the build on vendor/assets
packages/assets/          -> @chassis-ui/assets: the build in build/, its templates in build/templates/, its tests in test/
packages/site/            -> The documentation site, built with Astro
build/                    -> Scripts of the repository: the release notes, the version references
docs/architecture.md      -> How the build works, module by module
docs/decisions.md         -> The decisions behind the build, by number
ref/OPEN.md               -> What is left to do, decide or check
.changeset/               -> The changesets of the next version
```

### Source

A repository of assets, `vendor/assets` here, has this layout. `chassis-assets init` writes the files around it.

```
package.json              -> The `chassis` configuration: the brands, the apps and their platforms
chassis.checks.json       -> What the checks verify: the consumer contracts, the names the lint keeps
source/
├── _default/             -> The fallback brand: the files every brand gets
│   ├── _shared/          -> The files every app gets
│   └── <app>/            -> The files of one app, such as `docs` or `demo`
│       ├── images/       -> Images, with the @2x and @3x variants the designer exported
│       └── icons/        -> Icons
└── <brand>/              -> The files of a brand, such as `chassis` and `sinefil`
    ├── _shared/          -> The files every app of the brand gets, such as the fonts and the logos
    └── <app>/
        ├── fonts/        -> Font files, their stylesheet and their licenses
        ├── images/       -> The logos, the favicons and the other images of the app
        └── other/        -> Any other folder name is copied as it is
```

A job of a brand and an app reads four folders, and a file of a later folder replaces the file of the same path in an earlier one: `source/_default/_shared/`, `source/_default/<app>/`, `source/<brand>/_shared/`, `source/<brand>/<app>/`. A brand needs only the files that differ, and a file that every app of a brand uses is in its `_shared/` folder once. In website-assets each brand holds its fonts, its logos and its favicons, and `_default` holds what every brand shares. A name that starts with `_` is no brand and no app.

### Output

The output of website-assets, in `vendor/assets/dist/` after `pnpm assets`:

```
dist/
├── web/
│   └── docs/
│       ├── chassis/      -> What the Chassis sites read, built by pnpm assets:site
│       └── sinefil/
├── ios/
│   └── demo/
│       ├── chassis/
│       └── sinefil/
└── android/
    └── demo/
        ├── chassis/
        └── sinefil/
```

What each platform gets:

| Platform | Names                                   | Fonts                           | Images                                              | Icons            |
| -------- | --------------------------------------- | ------------------------------- | --------------------------------------------------- | ---------------- |
| Web      | kebab-case, `@2x` and `@3x` kept        | WOFF, WOFF2 and the stylesheets | Every format                                        | Every file       |
| iOS      | snake_case, `@2x` and `@3x` kept        | TTF and OTF                     | Every format but WebP                               | SVG, PDF and PNG |
| Android  | snake_case, `ic_` prefix under `icons/` | TTF and OTF                     | Every format, in density folders, indicator removed | SVG              |

On Android an image without an indicator goes to `drawable/`, `@2x` to `drawable-xhdpi/` and `@3x` to `drawable-xxhdpi/`, under the subfolder the image is in. The license of a font is copied with it on every platform. Files such as `.DS_Store` are left out, and two files that get the same name after renaming are reported.

## Commands

### Build

```shell
pnpm assets                                   # Every brand, app and platform
pnpm assets --brand chassis                   # One brand
pnpm assets --brand chassis sinefil           # --brand, --app and --platform take one or more values
pnpm assets --app docs --platform web         # Filters combine
pnpm assets:site                              # The output the Chassis sites read: --clean --brand chassis --app docs
```

| Option                   | What it does                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--brand <name...>`      | Only these brands                                                                                                                                                                                                       |
| `--app <name...>`        | Only these apps                                                                                                                                                                                                         |
| `--platform <name...>`   | Only these platforms                                                                                                                                                                                                    |
| `--type <name...>`       | Only these type folders of an app, such as `images` and `icons`                                                                                                                                                         |
| `--include <pattern...>` | Only the files that match a pattern, by their path in the folder of the app, such as `"images/home/**"`                                                                                                                 |
| `--clean`                | Remove the output first, of the selected jobs when filtered                                                                                                                                                             |
| `--no-clean`             | Keep the output even for a full build                                                                                                                                                                                   |
| `--out <dir>`            | Output folder, default `dist`                                                                                                                                                                                           |
| `--cwd <dir>`            | Repository root, default the nearest folder upward whose `package.json` has a `chassis` block                                                                                                                           |
| `--watch`                | Build, then build the jobs of a brand and an app again when a file of theirs under `source/` changes                                                                                                                    |
| `--dry-run`              | Print the jobs and their file counts, write nothing                                                                                                                                                                     |
| `--allow-lfs-pointers`   | Copy Git LFS pointer files instead of failing. Also `CHASSIS_ALLOW_LFS_POINTERS=1`                                                                                                                                      |
| `--vector-drawables`     | Write the SVG icons of Android as vector drawables, `.xml` in place of `.svg`. Needs `pnpm install`                                                                                                                     |
| `--asset-catalog`        | Write the images of iOS as an asset catalog, `Assets.xcassets` in place of `images/`                                                                                                                                    |
| `--res`                  | Write the fonts, images and icons of Android as a `res/` folder, `res/font/` and `res/drawable*/`                                                                                                                       |
| `--optimize`             | Write the images again under their names where that makes them smaller, with the settings of `chassis.optimize`. Needs `pnpm install`                                                                                   |
| `--webp`                 | Write the PNG and JPEG images as WebP too: beside the file on the web, in place of it on Android. Needs `pnpm install`                                                                                                  |
| `--avif`                 | Write the PNG and JPEG images of the web as AVIF too. Needs `pnpm install`                                                                                                                                              |
| `--subset [range...]`    | Write the WOFF and WOFF2 fonts of the web again under their names with the characters of the ranges only, such as `latin` or `U+0370-03FF`. Default: `chassis.subset`, or `latin` and `latin-ext`. Needs `pnpm install` |
| `--split`, `--no-split`  | With `--subset`, write each declared font once per range too, with a rule per range in its stylesheet, or one file. Default: `split` of `chassis.subset`, or one file                                                   |
| `--quiet`                | Print errors only                                                                                                                                                                                                       |
| `--help`, `-h`           | Print the options                                                                                                                                                                                                       |
| `--version`, `-v`        | Print the version                                                                                                                                                                                                       |

A full build removes `dist/` first; a filtered build keeps it. A filter value that is not configured fails the build and names the configured values.

### Check

| Command                                                        | What it does                                                                                                                                                                                                                                                          | Options                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm test`                                                    | The tests of the build, on the fixture in `packages/assets/test/fixtures/`. Needs no Git LFS files                                                                                                                                                                    |                                                                  |
| `pnpm test:ci`                                                 | The Lint, Assets, Site and Audit jobs of CI in one command, without the iOS catalogs, the changeset check and the report of `pnpm audit`                                                                                                                              |                                                                  |
| `pnpm test:golden`                                             | Writes `packages/assets/test/golden/` again, after an intended change to the output                                                                                                                                                                                   |                                                                  |
| `pnpm test:ios`                                                | Compiles the asset catalogs of an output with `actool`, after `pnpm assets --asset-catalog`. Needs Xcode                                                                                                                                                              | A folder, default `dist`                                         |
| `pnpm assets:analyze`                                          | Sizes, types, largest files and files with the same content, of `source/` and of an existing output                                                                                                                                                                   | `--brand`, `--app`, `--platform`, `--out`, `--cwd`, `--quiet`    |
| `pnpm assets:validate`                                         | Checks an existing output against `source/` and the configuration                                                                                                                                                                                                     | `--out`, `--cwd`                                                 |
| `pnpm assets:archive`                                          | One zip per platform, app and brand of an existing output, `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, for a release. Writes to `archives/`                                                                                                              | `--out`, `--to`, `--prefix`, `--release`, `--cwd`                |
| `chassis-assets init [dir]`                                    | Writes the baseline of a repository of assets into a folder: `package.json` with the `chassis` block and the scripts, `chassis.checks.json`, the Git LFS attributes, a README, a CI and a release workflow. Through the CLI: `node packages/assets/build/cli.js init` | `--name`, `--brand`, `--app <name:platforms>`, `--pm <npm        | pnpm>`, `--force`, `--dry-run` |
| `chassis-assets static-font <font> <output...> <axis>=<value>` | The static font of a variable font with every axis fixed, the given ones at their value: the files by weight of a role, with the names of `STAT`. Writes the font to each output, WOFF2 where the output ends so. Needs `subset-font`                                 | `--help`                                                         |
| `pnpm assets:lfs`                                              | Prints the Git LFS paths that a build with the same filters reads, for `git lfs pull --include`                                                                                                                                                                       | `--brand`, `--app`, `--platform`, `--type`, `--include`, `--cwd` |
| `pnpm assets:contract`                                         | Checks that each output has the files of its contracts in `chassis.checks.json`                                                                                                                                                                                       | `--out`, `--cwd`                                                 |
| `pnpm assets:verify`                                           | The validator, then the contract check                                                                                                                                                                                                                                | `--out`, `--cwd`                                                 |
| `pnpm assets:lint:source`                                      | The names and the layout of `source/`, LFS pointers, the fonts against their stylesheets and against each other                                                                                                                                                       | `--cwd`, `--allow-lfs-pointers`                                  |
| `pnpm assets:lint`                                             | ESLint over the build, its tests and the repository scripts                                                                                                                                                                                                           |                                                                  |
| `pnpm assets:typecheck`                                        | TypeScript over `packages/assets/build/`, from its JSDoc                                                                                                                                                                                                              |                                                                  |
| `pnpm lint:prettier`                                           | Formatting, across the repository                                                                                                                                                                                                                                     |                                                                  |
| `pnpm check`                                                   | The types of the site, then `pnpm check:pnpm`: `pnpm audit --prod --audit-level moderate`                                                                                                                                                                             |                                                                  |

Every `pnpm assets*` command prints its options with `--help`. [docs/architecture.md](docs/architecture.md#checks-per-changed-area) says which checks to run for which change.

### Documentation site

```shell
pnpm dev                # Build the docs assets and run the site at http://localhost:4325/assets/
pnpm site:build         # Build the docs assets, the site and its search index into _site/
pnpm site:assets        # Build the docs assets with the fonts of the site: subsetted, a file per range
pnpm astro:dev          # Run the site without building the assets
pnpm astro:build        # Build the site without the assets and the search index
pnpm site:lint          # ESLint, Stylelint, unused Sass variables and Prettier over the site
pnpm site:lint:html     # html-validate over _site/, after a build
pnpm site:lint:vnu      # The Nu Html Checker over _site/, after a build; skipped without Java
```

### Release

```shell
pnpm changeset              # Describe a change to the build
pnpm changeset:version      # Bump the version and write the changelog
pnpm assets:archive         # Write the archives of the submodule's output to vendor/assets/archives/, after pnpm assets --optimize
```

See [Releases](.github/CONTRIBUTING.md#releases) and the [changelog](packages/assets/CHANGELOG.md). The archives of the Chassis assets are released by website-assets.

## Configuration

The `chassis` block of the `package.json` of a repository of assets names the brands and, for each app, its platforms. The one of website-assets:

```json
"chassis": {
  "defaults": {
    "brandFolder": "_default"
  },
  "build": {
    "brands": ["chassis", "sinefil"],
    "apps": {
      "docs": ["web"],
      "demo": ["ios", "android"]
    }
  }
}
```

- `defaults.brandFolder` is the folder of `source/` that every brand falls back to, `_default` when it is not set.
- `build.brands` and `build.apps` take no name that starts with `_`: such a name is a folder of `source/` that is no brand and no app, as `_default` and `_shared` are.
- `build.brands` are the brands to build. A brand without a folder in `source/` is built from the fallback alone.
- `build.apps` maps each app to its platforms: `web`, `ios` or `android`.
- `optimize`, optional, holds the settings of `--optimize`, `--webp` and `--avif`, such as `"jpeg": { "quality": 80 }`. Without it the options change no visible pixel. It turns nothing on.
- `ignore`, optional, lists names of files and folders that the build leaves out beside its own list, such as `["*.bak", "drafts"]`. A pattern is a name with `*` for any run of characters, and matches at any depth. The checks read the same list.
- `formats`, optional, names for a platform and a type folder the extensions the platform keeps, such as `{ "web": { "fonts": [".woff2", ".ttf", ".css", ".txt"] } }`. The types are `fonts`, `images` and `icons`. A list replaces the rule of the platform for the type; what the block does not name keeps its rule.
- `subset`, optional, holds the settings of `--subset`. `ranges` are the ranges, such as `["latin", "greek"]`; without it the option keeps `latin` and `latin-ext`. `axes` are the axes of a variable font that are fixed at a value for a brand, such as `{ "chassis": { "opsz": 14 } }`; without it no axis is fixed. `split`, `true` or `false`, writes a font that a stylesheet declares once per range too, as `ui-latin.woff2`, and the rule of the stylesheet once per range with its `unicode-range`; without it a font is one file, and `--split` and `--no-split` win over it. It turns nothing on.

What the checks verify is in `chassis.checks.json`, beside `package.json`. The build does not read it, and the file is optional:

- `contracts` lists, for a job, the files that a consumer reads by name from its output. `pnpm assets:contract` checks them.
- `lint.allow` lists the source files that break a naming rule and are kept, each with the reason. `pnpm assets:lint:source` warns about them instead of failing.

The build in `packages/assets/build/` names no brand, app or file: a team's repository holds its own `source/`, `chassis` block and checks file, which `chassis-assets init` writes. The [build system page](https://chassis-ui.com/assets/docs/getting-started/build-system/#configuration) has the schema of both.

The build writes one job per brand, app and platform: the files of `source/_default/_shared/` and `source/_default/<app>/`, replaced by those of `source/<brand>/_shared/` and `source/<brand>/<app>/`, with the processing of the platform, into `dist/<platform>/<app>/<brand>/`.

## What consumers rely on

Every repository of assets relies on the commands, the flags and the output layout of the build, which are its public API: a change to one of them is a breaking change for every adopting team.

Every Chassis site vendors website-assets as the submodule `vendor/assets` and builds it with `pnpm install --ignore-workspace && pnpm assets:site`, which `chassis-docs vendor` of `@chassis-ui/docs` runs, then copies `dist/web/docs/chassis/` to `/static/`. The files a site reads by name are `contracts` of the `chassis.checks.json` of website-assets, and `pnpm assets:verify` checks them here on the pinned submodule on every commit. sinefil.org takes the archive of its job from a release of website-assets instead.

## Branches and CI

Work goes to `develop`. CI runs there and on pull requests, with the jobs Lint, Assets, Site and Audit, and Changeset on pull requests. The Assets, Native iOS and Site jobs check out `vendor/assets` with its Git LFS files, so the pin of the submodule has to be pushed to website-assets first. The commit that passed is then pushed to `staging` and `main`, which accept only a commit with those checks. A push to `main` with a new version publishes the package and creates its tag and its GitHub release, see [Releases](.github/CONTRIBUTING.md#releases).

## Chassis ecosystem

| Project                                                  | What it is                                                                  | Docs                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| [chassis-website](https://github.com/chassis-ui/website) | chassis-ui.com and `@chassis-ui/docs`, which every site is built on         | [chassis-ui.com](https://chassis-ui.com)   |
| [chassis-tokens](https://github.com/chassis-ui/tokens)   | Design tokens, published as `@chassis-ui/tokens`                            | [/tokens/](https://chassis-ui.com/tokens/) |
| [chassis-css](https://github.com/chassis-ui/css)         | The CSS framework, published as `@chassis-ui/css`                           | [/css/](https://chassis-ui.com/css/)       |
| [chassis-icons](https://github.com/chassis-ui/icons)     | The icon library, published as `@chassis-ui/icons`                          | [/icons/](https://chassis-ui.com/icons/)   |
| **chassis-assets**                                       | This repository: the build of the assets, published as `@chassis-ui/assets` | [/assets/](https://chassis-ui.com/assets/) |
| [chassis-figma](https://github.com/chassis-ui/figma)     | Documentation of the Figma libraries                                        | [/figma/](https://chassis-ui.com/figma/)   |
| [chassis-react](https://github.com/chassis-ui/react)     | React components, published as `@chassis-ui/react`                          | Not yet routed on chassis-ui.com           |

## Contributing

Branch from `develop` and open a pull request against `develop`. [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) covers the setup, changing assets, the build and the site, the checks to run for each, changesets and releases. [WRITING.md](WRITING.md) is the style guide of the documentation, and [AGENTS.md](AGENTS.md) holds the rules for AI coding agents. Everyone taking part follows the [Code of Conduct](.github/CODE_OF_CONDUCT.md); report a vulnerability as [SECURITY.md](.github/SECURITY.md) says.

## License

MIT License. See [LICENSE](LICENSE).
