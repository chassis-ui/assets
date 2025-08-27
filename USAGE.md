# Chassis Assets Usage Guide

This guide explains different ways to use Chassis Assets in your projects.

## 🚀 Recommended: NPM Package (Source + Build)

**Best for:** Most projects, CI/CD pipelines, automated workflows

```bash
npm install @ozgurgunes/chassis-assets
```

```javascript
// Import the API
import { ChassisAssets } from '@ozgurgunes/chassis-assets/build/api.js'

// Initialize and build assets
const chassis = new ChassisAssets()
console.log('Available brands:', chassis.getBrands())
console.log('Available apps:', chassis.getApps())

// Build all assets (as configured in package.json)
await chassis.build()

// Or build specific brands/platforms
await chassis.build({
  brands: ['chassis'],
  platforms: ['web'],
  clean: true
})
```

**Advantages:**
- ✅ Semantic versioning
- ✅ Automatic dependency management
- ✅ Build on demand (only what you need)
- ✅ Smallest download size
- ✅ Works with all package managers
- ✅ CI/CD friendly

## 🔧 Git Submodule (For Advanced Use Cases)

**Best for:** Complex customizations, direct source access, multiple brand management

```bash
# Add as submodule
git submodule add https://github.com/ozgurgunes/chassis-assets.git assets/chassis

# Initialize and update
git submodule update --init --recursive

# Build assets locally
cd assets/chassis
pnpm install
pnpm run build
```

**Advantages:**
- ✅ Direct source code access
- ✅ Easy customization and overrides
- ✅ Can track specific commits/branches
- ✅ Full control over build process

**When to use:**
- You need to customize build configurations
- You want to track a specific version/branch
- You need access to source files for modifications

## 📦 GitHub Releases (Pre-built Assets)

**Best for:** Quick prototyping, no build step required

Download pre-built assets from [GitHub Releases](https://github.com/ozgurgunes/chassis-assets/releases).

Each release includes:
- `chassis-assets-dist.zip` - All built assets for all platforms
- Platform-specific archives (web, iOS, Android)

## 🛠 Development Workflow Examples

### Example 1: React Project with NPM

```javascript
// package.json
{
  "dependencies": {
    "@ozgurgunes/chassis-assets": "^0.1.0"
  },
  "scripts": {
    "build:assets": "node scripts/build-chassis-assets.js",
    "build": "npm run build:assets && react-scripts build"
  }
}

# scripts/build-chassis-assets.js
import { ChassisAssets } from '@ozgurgunes/chassis-assets/build/api.js'

const chassis = new ChassisAssets()
await chassis.build() // This will generate dist/ folder with your assets
```

### Example 2: iOS Project with Git Submodule

```bash
# Add submodule to your iOS project
git submodule add https://github.com/ozgurgunes/chassis-assets.git Chassis

# Build script for iOS assets
cd Chassis && pnpm install && pnpm run build

# Copy iOS-specific assets to your project
cp -r dist/ios/your-brand/* YourProject/Assets/
```

### Example 3: Multi-Platform Project

```javascript
// Use the API for programmatic builds
import { ChassisAssets } from '@ozgurgunes/chassis-assets/build/api.js'

const chassis = new ChassisAssets()

// Build for specific platforms
await chassis.build({ platforms: ['web'] })
await chassis.build({ platforms: ['ios'] })
await chassis.build({ platforms: ['android'] })

// Or build specific brand/platform combinations
await chassis.build({
  brands: ['your-brand'],
  platforms: ['web'],
  apps: ['docs']
})
```

## 🎯 Best Practices

### Choose Your Strategy Based On:

| Use Case | Recommended Method | Why |
|----------|-------------------|-----|
| Web Applications | NPM Package | Easy integration, semantic versioning |
| Mobile Apps | Git Submodule | Platform-specific builds, asset integration |
| Design System Team | Git Submodule | Source access, customization needs |
| Quick Prototypes | GitHub Releases | No setup required |
| CI/CD Pipelines | NPM Package | Reliable, cached, versioned |

### Version Management

- **NPM Package**: Use semantic versioning (`^0.1.0`)
- **Git Submodule**: Pin to specific tags for stability
- **GitHub Releases**: Download specific version artifacts

### Performance Tips

1. **Only build what you need**: Configure your build to only include required brands/platforms
2. **Cache builds**: In CI/CD, cache node_modules and built assets
3. **Use pre-built releases**: For prototyping, use GitHub release artifacts

## 🔧 Advanced Configuration

### Custom Build Configuration

```javascript
// chassis.config.js
export default {
  brands: ['your-brand'],
  platforms: {
    web: ['docs'],
    ios: ['app'],
    android: ['app']
  },
  output: './assets/chassis'
}
```

### Brand-Specific Builds

```javascript
// Build specific combinations using the API
import { ChassisAssets } from '@ozgurgunes/chassis-assets/build/api.js'

const chassis = new ChassisAssets()

// Build only specific brand and platform
await chassis.build({
  brands: ['your-brand'],
  platforms: ['web'],
  apps: ['docs']
})
```

**Note:** Currently, selective builds require using the JavaScript API. Command-line parameters are not supported by the build script.

## 📚 Migration Guide

### From Git Submodule to NPM

1. Remove existing submodule: `git submodule deinit assets/chassis`
2. Install NPM package: `npm install @ozgurgunes/chassis-assets`
3. Update build scripts to use NPM package API
4. Update CI/CD to use NPM instead of git clone

### From NPM to Git Submodule

1. Uninstall NPM package: `npm uninstall @ozgurgunes/chassis-assets`
2. Add submodule: `git submodule add https://github.com/ozgurgunes/chassis-assets.git`
3. Update build scripts to use local submodule path
4. Update CI/CD to handle submodule initialization

## 🐛 Troubleshooting

### Common Issues

**NPM package seems empty?**
- Ensure you're using version 0.1.1+ (fixed dist files issue)

**Git submodule not updating?**
- Run: `git submodule update --remote`

**Build fails?**
- Check Node.js version (requires 18+)
- Ensure pnpm is installed: `npm install -g pnpm`

**Assets not found after build?**
- Check `dist/` folder was created
- Verify brand/platform configuration
- Check file permissions

For more help, see [GitHub Issues](https://github.com/ozgurgunes/chassis-assets/issues).
