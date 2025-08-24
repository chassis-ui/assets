# Asset Guidelines

## Overview
This document provides guidelines for managing and organizing design assets within the Chassis Design System.

## Asset Organization

### Directory Structure
```
source/
├── default/              # Fallback assets for all brands
│   ├── [app]/           # Application-specific assets
│   │   ├── fonts/       # Typography assets
│   │   ├── images/      # Bitmap images and illustrations
│   │   └── icons/       # Icon assets (SVG preferred)
└── [brand]/             # Brand-specific overrides
    └── [app]/           # Application-specific assets
        ├── fonts/
        ├── images/
        └── icons/
```

### Asset Types

#### Fonts
- **Location**: `source/[brand]/[app]/fonts/`
- **Formats**: TTF, OTF, WOFF, WOFF2
- **Naming**: Use semantic names that match design tokens (e.g., `text-heading.ttf`)
- **Organization**: Group by font family in subdirectories if needed

#### Images
- **Location**: `source/[brand]/[app]/images/`
- **Formats**: PNG, JPG, SVG, WebP
- **Naming**: Use descriptive, kebab-case names (e.g., `hero-banner.png`)
- **Optimization**: Compress images before adding to source

#### Icons
- **Location**: `source/[brand]/[app]/icons/`
- **Format**: SVG preferred for scalability
- **Naming**: Use semantic names (e.g., `chevron-down.svg`, `user-profile.svg`)
- **Style**: Maintain consistent stroke width and style

## Platform Considerations

### Web Assets
- Use optimized formats (WebP for images where supported)
- Provide @2x and @3x variants for high-DPI displays
- Ensure accessibility with proper alt text references

### iOS Assets
- Follow Apple's Human Interface Guidelines
- Provide @2x and @3x variants
- Use appropriate color profiles (Display P3 for wide gamut)

### Android Assets
- Files automatically renamed to lowercase with underscores
- Icons automatically prefixed with `ic_`
- Follow Material Design guidelines
- Provide multiple density variants (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

## Brand Management

### Default Assets
Place shared assets in `source/default/[app]/` to be used across all brands unless overridden.

### Brand-Specific Assets
Override default assets by placing brand-specific versions in `source/[brand]/[app]/` with the same filename.

### Override Strategy
1. **Complete Override**: Replace entire asset with brand-specific version
2. **Selective Override**: Override only specific assets that need brand customization
3. **Fallback System**: System automatically falls back to default if brand-specific asset doesn't exist

## File Naming Conventions

### General Rules
- Use lowercase letters
- Use hyphens for word separation in source files
- Be descriptive but concise
- Include size/variant information when applicable

### Examples
```
Good:
- logo-primary.svg
- hero-image@2x.png
- button-background.png
- icon-chevron-right.svg

Avoid:
- Logo.svg (uppercase)
- heroImg.png (camelCase)
- bg_button.png (underscores in source)
- icon1.svg (non-descriptive)
```

## Quality Standards

### Images
- **Resolution**: Provide appropriate resolution for intended use
- **Compression**: Balance file size with quality
- **Format**: Use appropriate format for content type
  - PNG: Logos, graphics with transparency
  - JPG: Photos, complex images without transparency
  - SVG: Simple graphics, icons, logos
  - WebP: Modern format for web when supported

### Icons
- **Consistency**: Maintain consistent style across icon set
- **Scalability**: Design for multiple sizes
- **Simplicity**: Keep designs simple and recognizable at small sizes
- **Accessibility**: Ensure sufficient contrast and clarity

### Fonts
- **Licensing**: Ensure proper licensing for all platforms
- **Subsetting**: Consider font subsetting for web performance
- **Formats**: Provide modern formats (WOFF2) with fallbacks

## Asset Optimization

### Pre-Processing
Before adding assets to the source directory:

1. **Optimize Images**
   ```bash
   # Example optimization commands
   imageoptim *.png
   jpegoptim --max=85 *.jpg
   svgo *.svg
   ```

2. **Validate SVGs**
   - Remove unnecessary metadata
   - Ensure proper viewBox attributes
   - Validate markup

3. **Check File Sizes**
   - Keep individual files under reasonable size limits
   - Consider progressive loading for large images

### Build-Time Processing
The build system automatically handles:
- Platform-specific file naming
- Directory structure creation
- Brand override resolution

## Testing Assets

### Verification Process
After adding or updating assets:

1. **Run Build**
   ```bash
   pnpm run build
   ```

2. **Check Distribution**
   ```bash
   # Verify all platforms generated
   ls -la dist/

   # Check specific brand/app combination
   ls -la dist/web/chassis-docs/
   ```

3. **Validate Platform-Specific Processing**
   ```bash
   # Check Android naming conventions
   find dist/android -name "*" | grep -E "[A-Z-]"

   # Check icon prefixes
   ls dist/android/*/icons/
   ```

## Troubleshooting

### Common Issues

#### Missing Assets in Distribution
- **Cause**: Asset not in expected source location
- **Solution**: Verify file path matches expected structure

#### Incorrect Android Naming
- **Cause**: Build process Android renaming
- **Solution**: Check original filenames follow guidelines

#### Brand Override Not Working
- **Cause**: Filename mismatch between default and brand-specific asset
- **Solution**: Ensure exact filename match (case-sensitive)

#### Large Bundle Sizes
- **Cause**: Unoptimized assets
- **Solution**: Optimize images and fonts before adding to source

### Debugging
Enable verbose logging by setting environment variable:
```bash
DEBUG=chassis:assets pnpm run build
```

## Best Practices

1. **Start with Defaults**: Add assets to default folder first, then override as needed
2. **Consistent Naming**: Establish and follow naming conventions
3. **Regular Audits**: Periodically review and clean up unused assets
4. **Version Control**: Use meaningful commit messages for asset changes
5. **Documentation**: Document asset requirements for team members
6. **Testing**: Always test distribution after asset changes

## Integration with Design Tools

### Figma Export
When exporting from Figma:
1. Use appropriate naming conventions
2. Export at correct resolutions
3. Optimize exported assets
4. Verify asset placement in source structure

### Sketch Export
Similar guidelines apply for Sketch exports:
1. Use export presets for consistent naming
2. Export multiple resolutions as needed
3. Organize exports into appropriate directories

### Adobe Creative Suite
For Adobe exports:
1. Use export for screens functionality
2. Maintain consistent asset naming
3. Consider automation with scripts for large asset sets
