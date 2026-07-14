# Changelog

All notable changes to the Chassis Assets project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Enhanced change-version.js script with improved functionality
- Updated and optimized documentation images for better performance
- Improved home page images (component gallery, Figma screenshots, platforms, tokens)
- Refined token visualization SVGs (tokens-scheme.svg, tokens-visual.svg)

### Fixed
- Image file sizes reduced across multiple documentation assets

## [0.1.3] - 2026-03-16

### Changed
- Updated build path configuration
- Modified asset build paths in build script and site configuration
- Updated path utilities and SCSS settings for improved asset management

## [0.1.2] - 2026-03-12

### Changed
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
