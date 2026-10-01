# Changelog

All notable changes to the Chassis Assets project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `display.css` in the docs and demo fonts of the default brand: the `@font-face` rules of
  the display family.
- The licenses of the fonts, `text-license.txt`, `display-license.txt` and
  `code-license.txt`, beside the fonts of every brand and app that has them. The build copies
  them to the `fonts/` folder of every platform.
- Build options `--out <dir>`, `--cwd <dir>`, `--dry-run`, `--allow-lfs-pointers`,
  `--quiet`, `--help` and `--version`. The analyzer and the validator take `--out` and
  `--cwd`.
- `pnpm assets:verify`: the validator, then the consumer contract, the files the Chassis
  sites read from `dist/web/docs/chassis/`. `pnpm assets:contract` runs the contract check
  alone.
- `pnpm assets:lint:source`: the names and the layout of `source/` against the naming
  conventions of the design-guidelines page, and Git LFS pointers.
- `pnpm assets:typecheck`: TypeScript checks `build/` against its JSDoc, with the shared
  types in `build/types.js`.
- `packages/assets/build/cli.js`, one entry for the build and its checks: `build`, `analyze`,
  `validate`, `contract`, `verify` and `lint-source`. The `pnpm assets*` scripts run it with
  `node`, so the build works with nothing installed.
- `generateAssets(options)` takes `brands`, `apps`, `platforms`, `clean`, `quiet`, `cwd`,
  `out`, `dryRun` and `allowLfsPointers`, and `ChassisAssets.build()` passes its filters on.
  The library no longer reads the command line or exits the process; the command-line entry
  does.

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- `text.css` and `code.css` of the default brand declare the font files that are in the
  folder, one `@font-face` per file, instead of Inter and Fira Code files that were not.
- `--clean` with `--brand`, `--app` or `--platform` removes the output of the selected jobs
  only. A full build without filters removes `dist/` whole, as before.
- A filter value that is not configured, or filters that select no job, fail the build and
  name the configured values. They built nothing and exited 0.
- A source file that is a Git LFS pointer fails the build with the list of files, unless
  `--allow-lfs-pointers` or `CHASSIS_ALLOW_LFS_POINTERS=1` is given.
- PNG files under `icons/` are kept for iOS.
- 40 Figma screenshots in `source/` are renamed to the names the web build writes, so the
  output does not change.

### Fixed

- The analyzer finds files with the same content. It kept one file per hash and found none.
- The validator prints each result once, and exits with 1 when a check fails.
- `*~`, `*.swp`, `*.tmp` and `*.temp` files in `source/` are left out of the build, as the
  ignore list says. The wildcard escaped its own dot and matched none of them. No such file
  is in `source/`, so the output does not change.
- `pnpm assets:analyze --platform <name>` counts the files of that platform in `dist/`. It
  left out the whole of `dist/`.
- `ChassisAssets.getStats()` and `validate()` read `source/` and `dist/` from the `cwd` and
  `out` of the instance, not from the working directory. `getAssetInventory()` sorts a file
  by its type folder, as the build does, so an SVG under `images/logo/` is an image.

### Tests

- The tests run with Vitest on a fixture in `test/fixtures/` and compare a build of it with
  `test/golden/`. They need no Git LFS files and never write to `dist/`. `pnpm test:golden`
  writes the baseline again. The scripts `assets:test:build`, `assets:test:analyze` and
  `assets:test:api` are gone; `assets:test` runs `pnpm test`.

## [0.1.8] - 2026-07-14

### Added

- Webp formats of home page images

## [0.1.7] - 2026-07-14

### Added

- Small size variants of home page component gallery images (`comp-gallery-dark-small.png`, `comp-gallery-light-small.png`, and `@2x` versions)

### Updated

- Home page images (component gallery, Figma docs, Figma library, Figma tokens) with new designs

## [0.1.6] - 2026-07-06

### Updated

- Default docs social image (`source/default/docs/images/social-image.png`) with new design and size (1600 x 630 pixels)

## [0.1.5] - 2026-04-25

### Added

- Figma component screenshots (light & dark)
- Example brand font style (`source/example/docs/fonts/fonts.scss`) with Figtree and Lora Google Fonts import

## [0.1.4] - 2026-04-11

### Added

- SVG sprite for icon library (cx-sprite.svg)
- New SVG icon library visualization assets (icon-library-dark.svg, icon-library-light.svg)

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Enhanced change-version.js script with improved functionality
- Updated and optimized documentation images for better performance
- Improved home page images (component gallery, Figma screenshots, platforms, tokens)
- Refined token visualization SVGs (tokens-scheme.svg, tokens-visual.svg)

### Fixed

- Image file sizes reduced across multiple documentation assets

## [0.1.3] - 2026-03-16

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Updated build path configuration
- Modified asset build paths in build script and site configuration
- Updated path utilities and SCSS settings for improved asset management

## [0.1.2] - 2026-03-12

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Reorganized documentation images
- Renamed `chassis-social.png` to `social-image.png`
- Replaced multiple chassis logo variants with unified `site-logo.svg`

### Removed

- Removed deprecated logo files: `chassis-logo-black.svg`, `chassis-logo-white.svg`, `chassis-logo.svg`
- Removed logo shadow image variants

## [0.1.1] - 2026-02-27

### Added

- Comprehensive CI/CD pipeline with GitHub Actions
- Asset analysis tool for statistics and optimization recommendations
- Testing framework for build process validation
- Enhanced error handling and logging in build scripts
- Asset guidelines documentation
- Platform-specific processing improvements
- **Modular processor architecture**: Platform-specific processors in dedicated modules (build/processors/)
  - `web.js` - Web platform processor (kebab-case transformation)
  - `ios.js` - iOS platform processor (snake_case transformation)
  - `android.js` - Android platform processor (snake_case, ic_ prefix, density mapping)
  - `shared.js` - Common utilities (resolution indicator extraction)
  - `index.js` - Processor registry with `getProcessor()` and `platformProcessors` exports
- **Asset types module**: Canonical asset type definitions in build/asset-types.js
  - Single source of truth for asset types (fonts, icons, images, logo)
  - Centralized extension validation with `getValidExtensions()` and `getAllValidExtensions()`
  - Metadata file detection with `isMetadataFile()`
- **Quiet mode**: Suppress verbose output for automated testing and CI/CD pipelines
  - `generateAssets({ quiet: true })` - Silent build mode
  - `new AssetAnalyzer({ quiet: true })` - Silent analysis mode
  - Errors always visible even in quiet mode

### Changed

- The repository is a pnpm workspace. The build moved from `build/` to
  `packages/assets/build/`, its tests from `test/` to `packages/assets/test/`, and the site
  from `site/` to `packages/site/`. `source/`, `dist/`, the `chassis` block of the root
  `package.json` and every `pnpm assets*` command stay where they were, and the output is
  the same file for file. A script that imports the library changes its path:
  `build/api/index.js` is `packages/assets/build/api/index.js`.
- `pnpm install --ignore-workspace` at the root, which a site runs before
  `pnpm assets:site`, installs the lint tools of the root only: 449 packages where it
  installed 906. The build uses none of them.
- The repository root is found from the working directory upward, as the nearest folder
  whose `package.json` has a `chassis` block, so the commands work from any folder of the
  repository. `--cwd` names it instead.
- The version is in `packages/assets/package.json`, and `pnpm assets --version` prints it
  whatever `--cwd` is. The root `package.json` is private and has no version, no
  `publishConfig`, no `files` and no `keywords`: the assets are not published to npm.
- Improved build script with validation and detailed reporting
- Enhanced package.json configuration for asset-focused distribution
- Updated README with clearer project scope and usage instructions
- **Refactored build system**: Eliminated ~250+ lines of duplicated processor logic
- **Single source of truth**: Platform filters, transformations, and rules now imported from dedicated modules
- **Variable naming**: Clarified `buildConfig` (package.json config) vs `cliOptions` (command-line args)
- **API signatures**: Added optional `options` parameter to `generateAssets()` and `AssetAnalyzer` constructor

### Fixed

- Package files configuration to properly include distributed assets
- Build script error handling and user feedback
- Android file naming conventions and icon prefixing
- Variable naming collision (buildOptions used for two purposes)
- Infinite recursion in logger implementation

## [0.1.0] - 2025-08-24

### Added

- Initial asset management system
- Multi-brand, multi-platform asset distribution
- Basic build script for copying and processing assets
- Support for web, iOS, and Android platforms
- Brand override system with fallback to default assets
- Android-specific file naming and icon prefixing

### Infrastructure

- Project setup with pnpm package management
- ESLint configuration for code quality
- Basic documentation and README
