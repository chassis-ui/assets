# Chassis Assets

> Fonts, images, icons and other design files of the Chassis Design System, built from one source tree into the names, formats and folders of the web, iOS and Android.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version: 0.1.8](https://img.shields.io/badge/Version-0.1.8-blue.svg)](https://github.com/chassis-ui/assets)
[![CI](https://github.com/chassis-ui/assets/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/chassis-ui/assets/actions/workflows/ci.yml)

## Overview

Chassis Assets holds the design files a designer exports, in `source/<brand>/<app>/<type>/`, and a build that copies them to `dist/<platform>/<app>/<brand>/` with the naming and the formats of each platform. The build is file-driven: add a file to `source/` and it is in the output of the next build. There is no manifest to maintain.

The repository is not published to npm. The Chassis documentation sites vendor it as a Git submodule and build it; an app takes the archive of its platform, app and brand from a [GitHub release](https://github.com/chassis-ui/assets/releases), or vendors the repository too. The [documentation site](https://chassis-ui.com/assets/docs/getting-started/introduction/) covers the asset types and how to use the output on each platform.

## Getting started

The [Quick Start](https://chassis-ui.com/assets/docs/getting-started/quick-start/) page of the site has the same steps, and goes on to adding assets and using them in a project.

You need:

- **Node.js** 22.12 or later, see `engines` in `package.json`. The repository pins 24 in `.nvmrc`.
- **pnpm**, the version named by `packageManager` in `package.json`. Run `corepack enable` once and pnpm is used at that version.
- **Git LFS**, from [git-lfs.com](https://git-lfs.com). Run `git lfs install` once on your machine before cloning. Fonts and raster images are Git LFS files.

Clone the repository, or add it to a project as a Git submodule:

```shell
git clone https://github.com/chassis-ui/assets.git chassis-assets
cd chassis-assets
```

```shell
git submodule add https://github.com/chassis-ui/assets.git assets
cd assets
```

Build the assets:

```shell
pnpm assets
```

The build imports Node.js modules only, so it runs on a fresh clone with nothing installed. Install the dependencies to run the tests, the checks and the documentation site:

```shell
pnpm install
```

A clone made without Git LFS has pointer files in place of the fonts and the images. The build fails on them and lists them; run `git lfs pull`.

## Repository layout

A pnpm workspace. Run every command from the root.

```
source/                   -> The assets, as source/<brand>/<app>/<type>/
dist/                     -> The build output, as dist/<platform>/<app>/<brand>/. Not committed
package.json              -> The `chassis` configuration and the commands
chassis.checks.json       -> What the checks verify: the consumer contracts, the names the lint keeps
packages/assets/          -> @chassis-ui/assets: the build in build/, its tests in test/
packages/site/            -> The documentation site, built with Astro
build/                    -> Scripts of the repository: releases and the site's checks
docs/architecture.md      -> How the build works, module by module
ref/ROADMAP.md            -> Planned work on this repository
.changeset/               -> The changesets of the next version
```

### Source

```
source/
├── default/              -> The fallback brand, used by every brand
│   ├── docs/             -> The app `docs`
│   │   ├── fonts/        -> Font files, their stylesheets and their licenses
│   │   ├── images/       -> Images, with the @2x and @3x variants the designer exported
│   │   ├── icons/        -> The build output of @chassis-ui/icons, and cx-sprite.svg
│   │   └── other/        -> Any other folder name is copied as it is
│   └── demo/             -> The app `demo`
└── <brand>/              -> The files of a brand that differ from the default
    └── <app>/
```

A file under `source/<brand>/<app>/` replaces the file of the same path under `source/default/<app>/`. A brand needs only the files that differ.

### Output

```
dist/
├── web/
│   └── docs/
│       ├── chassis/      -> What the Chassis sites read, built by pnpm assets:site
│       └── example/
├── ios/
│   └── demo/
│       ├── chassis/
│       └── example/
└── android/
    └── demo/
        ├── chassis/
        └── example/
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
pnpm assets --brand chassis example           # --brand, --app and --platform take one or more values
pnpm assets --app docs --platform web         # Filters combine
pnpm assets:site                              # The output the Chassis sites read: --clean --brand chassis --app docs
```

| Option                 | What it does                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `--brand <name...>`    | Only these brands                                                                                                                     |
| `--app <name...>`      | Only these apps                                                                                                                       |
| `--platform <name...>` | Only these platforms                                                                                                                  |
| `--clean`              | Remove the output first, of the selected jobs when filtered                                                                           |
| `--no-clean`           | Keep the output even for a full build                                                                                                 |
| `--out <dir>`          | Output folder, default `dist`                                                                                                         |
| `--cwd <dir>`          | Repository root, default the nearest folder upward whose `package.json` has a `chassis` block                                         |
| `--dry-run`            | Print the jobs and their file counts, write nothing                                                                                   |
| `--allow-lfs-pointers` | Copy Git LFS pointer files instead of failing. Also `CHASSIS_ALLOW_LFS_POINTERS=1`                                                    |
| `--vector-drawables`   | Write the SVG icons of Android as vector drawables, `.xml` in place of `.svg`. Needs `pnpm install`                                   |
| `--asset-catalog`      | Write the images of iOS as an asset catalog, `Assets.xcassets` in place of `images/`                                                  |
| `--res`                | Write the fonts, images and icons of Android as a `res/` folder, `res/font/` and `res/drawable*/`                                     |
| `--optimize`           | Write the images again under their names where that makes them smaller, with the settings of `chassis.optimize`. Needs `pnpm install` |
| `--webp`               | Write the PNG and JPEG images as WebP too: beside the file on the web, in place of it on Android. Needs `pnpm install`                |
| `--avif`               | Write the PNG and JPEG images of the web as AVIF too. Needs `pnpm install`                                                            |
| `--quiet`              | Print errors only                                                                                                                     |
| `--help`, `-h`         | Print the options                                                                                                                     |
| `--version`, `-v`      | Print the version                                                                                                                     |

A full build removes `dist/` first; a filtered build keeps it. A filter value that is not configured fails the build and names the configured values.

### Check

| Command                   | What it does                                                                                                    | Options                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `pnpm test`               | The tests of the build, on the fixture in `packages/assets/test/fixtures/`. Needs no Git LFS files              |                                                               |
| `pnpm test:golden`        | Writes `packages/assets/test/golden/` again, after an intended change to the output                             |                                                               |
| `pnpm test:ios`           | Compiles the asset catalogs of an output with `actool`, after `pnpm assets --asset-catalog`. Needs Xcode        | A folder, default `dist`                                      |
| `pnpm assets:analyze`     | Sizes, types, largest files and files with the same content, of `source/` and of an existing output             | `--brand`, `--app`, `--platform`, `--out`, `--cwd`, `--quiet` |
| `pnpm assets:validate`    | Checks an existing output against `source/` and the configuration                                               | `--out`, `--cwd`                                              |
| `pnpm assets:contract`    | Checks that each output has the files of its contracts in `chassis.checks.json`                                 | `--out`, `--cwd`                                              |
| `pnpm assets:verify`      | The validator, then the contract check                                                                          | `--out`, `--cwd`                                              |
| `pnpm assets:lint:source` | The names and the layout of `source/` against the naming conventions of the design guidelines, and LFS pointers | `--cwd`, `--allow-lfs-pointers`                               |
| `pnpm assets:lint`        | ESLint over the build, its tests and the repository scripts                                                     |                                                               |
| `pnpm assets:typecheck`   | TypeScript over `packages/assets/build/`, from its JSDoc                                                        |                                                               |
| `pnpm lint:prettier`      | Formatting, across the repository                                                                               |                                                               |
| `pnpm check`              | The types of the site, then `pnpm audit`                                                                        |                                                               |

Every `pnpm assets*` command prints its options with `--help`. [docs/architecture.md](docs/architecture.md#checks-per-changed-area) says which checks to run for which change.

### Documentation site

```shell
pnpm dev                # Build the docs assets and run the site at http://localhost:4325/assets/
pnpm site:build         # Build the docs assets, the site and its search index into _site/
pnpm astro:dev          # Run the site without building the assets
pnpm astro:build        # Build the site without the assets and the search index
pnpm site:lint          # ESLint, Stylelint, unused Sass variables and Prettier over the site
pnpm site:lint:html     # html-validate over _site/, after a build
pnpm site:lint:vnu      # The Nu Html Checker over _site/, after a build; skipped without Java
```

### Release

```shell
pnpm changeset              # Describe a change to source/ or to the build
pnpm changeset:version      # Bump the version and write the changelog
pnpm release:archives       # Write the archives of a release to .cache/release/, after pnpm assets --optimize
```

See [Releases](.github/CONTRIBUTING.md#releases) and the [changelog](packages/assets/CHANGELOG.md).

## Configuration

The `chassis` block of the root `package.json` names the brands and, for each app, its platforms:

```json
"chassis": {
  "defaults": {
    "brandFolder": "default"
  },
  "build": {
    "brands": ["chassis", "example"],
    "apps": {
      "docs": ["web"],
      "demo": ["ios", "android"]
    }
  }
}
```

- `defaults.brandFolder` is the folder of `source/` that every brand falls back to.
- `build.brands` are the brands to build. A brand without a folder in `source/` is built from the fallback alone, as `chassis` is.
- `build.apps` maps each app to its platforms: `web`, `ios` or `android`.
- `optimize`, optional, holds the settings of `--optimize`, `--webp` and `--avif`, such as `"jpeg": { "quality": 80 }`. Without it the options change no visible pixel. It turns nothing on.

What the checks verify is in [chassis.checks.json](chassis.checks.json), beside `package.json`. The build does not read it, and the file is optional:

- `contracts` lists, for a job, the files that a consumer reads by name from its output. `pnpm assets:contract` checks them.
- `lint.allow` lists the source files that break a naming rule and are kept, each with the reason. `pnpm assets:lint:source` warns about them instead of failing.

A team that adopts the repository changes `source/`, the `chassis` block of `package.json` and this file, which it fills with its own lists or deletes. The build in `packages/assets/build/` names no brand, app or file. The [build system page](https://chassis-ui.com/assets/docs/getting-started/build-system/#configuration) has the schema of both.

The build writes one job per brand, app and platform: the files of `source/default/<app>/`, replaced by those of `source/<brand>/<app>/`, with the processing of the platform, into `dist/<platform>/<app>/<brand>/`.

## What consumers rely on

Every Chassis site vendors this repository as the submodule `vendor/assets`, pinned to a commit of the `app/docs` branch, and builds it with the two commands below. A change that breaks a row breaks the sites; `pnpm assets:contract` checks the files on every commit.

| Consumers rely on                             | Detail                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| The `app/docs` branch                         | `chassis-docs sync-submodules` moves the submodule of a site to its tip                                                                |
| Git LFS                                       | `git lfs pull` gives the real fonts and images                                                                                         |
| `pnpm install --ignore-workspace`             | Installs the root package only. The build needs none of it                                                                             |
| `pnpm assets:site`                            | Writes `dist/web/docs/chassis/`, which a site copies to `/static/`                                                                     |
| `images/` of that folder                      | `site-logo.svg`, the favicons, `apple-touch-icon.png`, `social-image.png`, the home page images under `home/`, the logos under `logo/` |
| `icons/cx-sprite.svg`                         | The sprite of the home page icons                                                                                                      |
| `images/figma/components/<component>/<mode>/` | The screenshots that the pages of chassis-figma read by name                                                                           |

The full list, with the code that reads each file, is `contracts` in [chassis.checks.json](chassis.checks.json).

## Branches and CI

Work goes to `develop`. CI runs there and on pull requests, with the jobs Lint, Assets, Site and Audit, and Changeset on pull requests. The commit that passed is then pushed to `staging`, `main` and `app/docs`, which accept only a commit with those checks. A push to `main` with a new version creates its tag and its GitHub release, see [Releases](.github/CONTRIBUTING.md#releases).

## Chassis ecosystem

| Project                                                  | What it is                                                          | Docs                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| [chassis-website](https://github.com/chassis-ui/website) | chassis-ui.com and `@chassis-ui/docs`, which every site is built on | [chassis-ui.com](https://chassis-ui.com)   |
| [chassis-tokens](https://github.com/chassis-ui/tokens)   | Design tokens, published as `@chassis-ui/tokens`                    | [/tokens/](https://chassis-ui.com/tokens/) |
| [chassis-css](https://github.com/chassis-ui/css)         | The CSS framework, published as `@chassis-ui/css`                   | [/css/](https://chassis-ui.com/css/)       |
| [chassis-icons](https://github.com/chassis-ui/icons)     | The icon library, published as `@chassis-ui/icons`                  | [/icons/](https://chassis-ui.com/icons/)   |
| **chassis-assets**                                       | This repository: fonts, images and other assets. Not on npm         | [/assets/](https://chassis-ui.com/assets/) |
| [chassis-figma](https://github.com/chassis-ui/figma)     | Documentation of the Figma libraries                                | [/figma/](https://chassis-ui.com/figma/)   |
| [chassis-react](https://github.com/chassis-ui/react)     | React components, published as `@chassis-ui/react`                  | Not yet routed on chassis-ui.com           |

## Contributing

Branch from `develop` and open a pull request against `develop`. [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) covers the setup, changing assets, the build and the site, the checks to run for each, changesets and releases. [WRITING.md](WRITING.md) is the style guide of the documentation, and [AGENTS.md](AGENTS.md) holds the rules for AI coding agents. Everyone taking part follows the [Code of Conduct](.github/CODE_OF_CONDUCT.md); report a vulnerability as [SECURITY.md](.github/SECURITY.md) says.

## License

MIT License. See [LICENSE](LICENSE).
