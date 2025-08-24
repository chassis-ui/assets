# Chassis Assets

Design asset manager for the Chassis Design System, a robust foundation for enterprise-grade, multi-brand, multi-app, and multi-platform design systems.

This project is part of the Chassis ecosystem and specifically handles asset management and distribution. It provides tools to copy, rename, and distribute design assets (fonts, images, icons, illustrations) across different brands, applications, and platforms.

> [!NOTE]
> This project is part of the multi-repository Chassis Design System. It focuses exclusively on asset management, while design tokens and icon generation are handled by separate repositories (`chassis-tokens` and `chassis-icons`).

> [!WARNING]
> This project uses `pnpm` for package management. Ensure you have `pnpm` installed globally before running the commands below.

## Install

```shell
git clone git@github.com:ozgurgunes/chassis-assets.git
cd chassis-assets
pnpm install
```

## Generate Distribution

```shell
pnpm dist
```

Copies and processes design assets from the `source` directory to create platform-specific distributions in the `dist` folder. The build process handles:

- **Multi-brand support**: Assets for different brands (chassis, test, etc.)
- **Multi-platform distribution**: Web, iOS, and Android formats
- **File naming conventions**: Automatic renaming for platform requirements (e.g., Android underscore naming)
- **Asset overrides**: Brand-specific assets override default assets when available
- **Error handling**: Comprehensive validation and error reporting
- **Build statistics**: Detailed reporting of processed files and operations

### Additional Commands

```shell
# Development workflow
pnpm dev                    # Clean and build
pnpm clean                  # Remove dist directory
pnpm test                   # Run build tests
pnpm validate               # Lint build scripts
pnpm stats                  # Analyze asset distribution

# Release workflow
pnpm release                # Full release process (clean, build, test)
```

## Asset Distribution Process

The build system processes assets in the following structure:

```
source/
├── default/           # Default brand assets (fallback)
│   ├── docs/         # Documentation app assets
│   │   ├── fonts/    # Font files
│   │   ├── images/   # Images and illustrations
│   │   └── icons/    # Icon assets
│   └── test/         # Test app assets
└── [brand]/          # Brand-specific overrides
    └── [app]/        # App-specific assets
```

Output distribution:

```
dist/
├── web/              # Web platform assets
│   ├── chassis-docs/ # Chassis brand, docs app
│   └── test-docs/    # Test brand, docs app
├── ios/              # iOS platform assets
│   └── test-test/    # Test brand, test app
└── android/          # Android platform assets
    └── test-test/    # Test brand, test app (with naming conventions)
```

### Platform-Specific Processing

- **Web**: Direct copy of assets
- **iOS**: Direct copy of assets
- **Android**: Files renamed to lowercase with underscores, icons prefixed with `ic_`

## Configuration

The `chassis` key in `package.json` defines the build configuration for asset distribution:

```json
"chassis": {
  "defaults": {
    "brandFolder": "default",
    "tokensTheme": "light"
  },
  "build": {
    "brands": ["chassis", "test"],
    "themes": ["light", "dark"],
    "apps": {
      "docs": ["web"],
      "test": ["ios", "android"]
    }
  }
}
```

### Configuration Details

#### `defaults`
- **`brandFolder`**: Default source folder for assets (fallback when brand-specific assets don't exist)
- **`tokensTheme`**: Legacy configuration (used in the original multi-purpose repository)

#### `build.apps`
Maps applications to their target platforms:
- **`docs`**: Documentation website assets → `web` platform
- **`test`**: Test application assets → `ios` and `android` platforms

### Platform Support
- **`web`**: Web applications and documentation sites
- **`ios`**: iOS mobile applications
- **`android`**: Android mobile applications

### Brand and App Processing
For each combination of brand and app:
1. Copy assets from `source/default/[app]/` as base
2. Override with brand-specific assets from `source/[brand]/[app]/` if they exist
3. Apply platform-specific processing (naming conventions, file transformations)
4. Output to `dist/[platform]/[brand]-[app]/`

## Designer Workflow

### Adding Assets to the Project

As a designer, you'll export assets to the appropriate locations in the `source` directory:

#### Asset Types and Locations

- **Fonts**: `source/[brand]/[app]/fonts/`
  - Use font names that match your design tokens (e.g., `text-normal.ttf`)
  - Place in brand-specific folders or `default` for shared fonts

- **Images & Illustrations**: `source/[brand]/[app]/images/`
  - Bitmap images (PNG, JPG)
  - SVG illustrations
  - Colored icons and graphics

- **Icons**: `source/[brand]/[app]/icons/`
  - SVG icon files
  - Use consistent naming conventions

#### File Organization Strategy

```
source/
├── default/              # Assets used by all brands (fallback)
│   ├── docs/            # Documentation site assets
│   └── test/            # Test app assets
├── chassis/             # Chassis brand-specific assets
│   └── docs/           # Override default docs assets
└── test/               # Test brand-specific assets
    └── test/           # Override default test assets
```

### Verification Process

After adding assets, verify the distribution:

```shell
pnpm dist
```

Check the `dist` folder to ensure assets are correctly distributed across platforms and brands.

## Chassis Design System Ecosystem

This project is part of the Chassis Design System's multi-repository architecture:

- **`chassis-tokens`**: Design token generation and management
- **`chassis-assets`**: Asset management and distribution (this repository)
- **`chassis-icons`**: Icon generation and sprite creation
- **`chassis-css`**: Production CSS framework
- **`chassis-figma`**: Figma plugins and design tools

### Integration with Other Repositories

The asset manager works alongside other Chassis repositories:

1. **Design tokens** define font names and asset references
2. **Assets** provide the actual font files, images, and illustrations
3. **Icons** are managed separately for scalability and performance
4. **CSS framework** references the distributed assets

### Version Management

```shell
npm run release-version old_version new_version
npm run release
```

## Contributing

This project follows the Chassis Design System contribution guidelines. For asset-related contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/asset-update`)
3. Add or update assets in the appropriate `source` directories
4. Test distribution with `pnpm dist`
5. Commit changes and create a pull request

## License

MIT License - see LICENSE file for details.

## Development

### Testing
The project includes a comprehensive testing framework:

```shell
# Run all tests
pnpm test

# Run with verbose output
DEBUG=chassis:assets pnpm test
```

### Asset Analysis
Analyze your asset distribution for optimization opportunities:

```shell
pnpm stats
```

This provides insights into:
- File size distribution
- Platform and brand coverage
- Potential duplicates
- Optimization recommendations

### Programmatic API
Use the Chassis Assets API for custom integrations:

```javascript
import ChassisAssets from '@ozgurgunes/chassis-assets/build/api.js'

const assets = new ChassisAssets()

// Get asset inventory
const inventory = assets.getAssetInventory('chassis', 'docs')

// Build specific combinations
await assets.build({
  brands: ['chassis'],
  apps: ['docs'],
  platforms: ['web']
})

// Get statistics
const stats = assets.getStats()
```

## Related Documentation

- [Asset Guidelines](docs/ASSET_GUIDELINES.md)
- [Chassis Design System Knowledge Base](_knowledge/)
- [Multi-Repository Architecture](_knowledge/planning/multi-repo.md)
- [Development Process](_knowledge/development/DEVELOPMENT_LOG.md)
- [Changelog](CHANGELOG.md)

