# Chassis Assets

A design asset manager for Chassis UI, providing a robust foundation for enterprise-grade, multi-brand, multi-app, and multi-platform design systems.

> [!NOTE]
> This project is part of the Chassis UI ecosystem and handles asset management and distribution. It provides tools to copy, rename, and distribute design assets (fonts, images, icons, illustrations) across different brands, applications, and platforms.

> [!WARNING]
> This project uses `pnpm` for package management. Ensure you have `pnpm` installed globally before running the commands below.

## 🚀 Quick Start

### Clone Repository

Clone the repository from GitHub:

```shell
git clone git@github.com:chassis-ui/assets.git
cd chassis-assets
```

Or add it to your project as a Git submodule:

```shell
git submodule add https://github.com/chassis-ui/assets.git assets
cd chassis-assets
```

### Install Dependencies

```shell
pnpm install
```

### Generate Distribution

```shell
pnpm assets
```

Copies and processes design assets from the `source` directory to create platform-specific distributions in the `dist` folder. The build process handles:

- **Multi-brand support**: Assets for different brands (chassis, example, etc.)
- **Multi-platform distribution**: Web, iOS, and Android formats
- **File naming conventions**: Automatic renaming for platform requirements (e.g., snake_case for Android)
- **Collision detection**: Warns about filename conflicts during renaming
- **Asset overrides**: Brand-specific assets override default assets when available
- **System file filtering**: Automatically excludes .DS_Store and other system files
- **Empty directory cleanup**: Removes empty folders after filtering
- **Error handling**: Comprehensive validation with retry logic for macOS compatibility
- **Build statistics**: Detailed reporting of processed files, renames, and warnings

### Selective Builds

Build only the assets you need using command-line filters:

```shell
# Build only chassis brand assets
pnpm assets --brand chassis

# Build only web platform assets
pnpm assets --platform web

# Build only docs app assets
pnpm assets --app docs

# Combine filters for specific builds
pnpm assets --brand chassis --app docs --platform web
```

**Benefits:**
- Faster builds during development
- Reduced output size
- Optimized CI/CD pipelines

### Additional Commands

Manage, analyze, and validate your asset distribution:

```shell
# Development workflow
pnpm assets:analyze         # Analyze asset distribution (supports filtering)
pnpm assets:validate        # Validate distribution integrity
pnpm assets:test            # Run test suite

# Update version
pnpm change-version [old_version] [new_version]
```

### Documentation Site

The documentation site is built with Astro and provides interactive guides for asset management and integration:

```shell
# Generate assets and run development server
pnpm dev

# Run development server only
pnpm astro:dev

# Generate assets and build site
pnpm build

# Build site only
pnpm astro:build
```

## Asset Distribution Process

The build system processes assets in the following structure:

```
source/
├── default/              -> Default brand assets (fallback)
│   ├── docs/             -> Documentation website assets
│   │   ├── fonts/        -> Font files
│   │   ├── images/       -> Images and illustrations
│   │   └── icons/        -> Icon library
│   └── demo/             -> Demo app assets
└── [brand]/              -> Brand-specific overrides
    └── [app]/            -> App-specific assets
```

Output structure:

```
dist/
├── web/                  -> Web platform assets
│   ├── chassis-docs/     -> Chassis brand, docs app
│   └── example-docs/     -> Example brand, docs app
├── ios/                  -> iOS platform assets
│   └── example-demo/     -> Example brand, demo app
└── android/              -> Android platform assets
    └── example-demo/     -> Example brand, demo app
```

### Platform-Specific Processing

The build system applies intelligent transformations for each platform:

#### Web
- Files renamed to **kebab-case** (lowercase with hyphens)
- Resolution indicators (@2x, @3x) preserved in filenames
- Font formats: WOFF/WOFF2 only (TTF/OTF excluded)
- Image formats: All formats supported
  
#### iOS
- Files renamed to **snake_case** (lowercase with underscores)
- Resolution indicators (@2x, @3x) preserved in filenames
- Font formats: TTF/OTF only (WOFF/WOFF2 excluded)
- Image formats: WebP excluded
- Icon formats: SVG and PDF supported
  
#### Android
- Files renamed to **snake_case**
- Icons prefixed with `ic_`
- Font formats: TTF/OTF only (WOFF/WOFF2 excluded)
- Image formats: WebP excluded
- Icon formats: SVG only
- **Image organization:**
  - Images with @2x/@3x → density folders (drawable-xhdpi/, drawable-xxhdpi/)
  - Images without resolution indicators → drawable/ folder
  - Resolution indicators stripped from filenames in density folders

**Additional Features:**
- Case-insensitive filesystem handling (macOS compatibility)
- Collision detection with warnings for duplicate target filenames
- Automatic filtering of system files (.DS_Store, Thumbs.db, hidden files)
- Empty directory cleanup after processing

## Configuration

The `chassis` key in `package.json` defines the build configuration for asset distribution:

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

### Configuration Details

#### `defaults`

- **`brandFolder`**: Default source folder for assets (fallback when brand-specific assets don't exist)

#### `build.apps`

Maps applications to their target platforms:

- **`docs`**: Documentation website assets → `web` platform
- **`demo`**: Demo application assets → `ios` and `android` platforms

### Platform Support

- **`web`**: Web applications and documentation sites
- **`ios`**: iOS mobile applications
- **`android`**: Android mobile applications

### Brand and App Processing

For each brand-app-platform combination:

1. Copy assets from `source/default/[app]/` as the base
2. Override with brand-specific assets from `source/[brand]/[app]/` if they exist
3. Apply platform-specific processing (naming conventions, file transformations)
4. Output to `dist/[platform]/[brand]-[app]/`

## Chassis UI Ecosystem

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

## Contributing

This project follows the Chassis Design System contribution guidelines. For asset-related contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/asset-update`)
3. Add or update assets in the appropriate `source` directories
4. Test distribution with `pnpm assets`
5. Commit changes and create a pull request

## License

MIT License - see LICENSE file for details.

