# Chassis Assets Homepage Copy Review

**Date**: April 14, 2026  
**Audience**: Technical PMs, developers, CTOs  
**Stage**: Pre-launch (no customers yet)  
**Tone**: Technical and honest, not marketing-fluffy  
**Approach**: Capability-first, show HOW not just WHAT

---

## Overall Assessment

The current copy leans too heavily on marketing language and makes claims we can't back up yet (e.g., "leading teams," "minutes," "no errors"). For a pre-launch technical audience, we need to be more specific about capabilities and less about promises.

---

## 🔴 Critical Issues

### 1. IntroSection Header
**Current**: "Why Leading Teams Choose Chassis Assets"

**Problem**: 
- Claims "leading teams choose" when we have zero customers
- Sounds like enterprise sales copy, not open-source tool docs

**Better**: "What Chassis Assets Does"

---

### 2. HowSection Body
**Current**: "Asset changes reach platform-ready distributions in minutes. No manual work. No naming errors. Just automated synchronization across every platform."

**Problems**:
- "in minutes" - unprovable, depends on asset count
- "No naming errors" - absolute claim we can't guarantee
- "Just automated" - fluffy filler words
- Over-promises instead of explaining capability

**Better**: "Run one command to transform source assets into platform-specific distributions. The build script handles file naming, resolution variants, and folder structure for web, iOS, and Android."

---

## 🟡 Moderate Issues

### 3. IntroSection Cards (3 Hero Benefits)

#### Card 1: "Eliminate Manual Work"
**Problem**: Vague benefit claim, doesn't explain HOW

**Better**:
```
Title: "Automated File Processing"
Body: "Transforms filenames to kebab-case for web, snake_case for mobile. Handles @2x/@3x resolution variants. Organizes Android drawables by density automatically."
```

#### Card 2: "Scale Across Brands"
**Problem**: "Scale" is marketing jargon, doesn't explain the mechanism

**Better**:
```
Title: "Brand Override System"
Body: "Define default assets once. Override specific files per brand using folder structure. Build system merges defaults with brand-specific assets automatically."
```

#### Card 3: "Deploy to All Platforms"
**Problem**: "Deploy" implies shipping to production, we just generate files

**Better**:
```
Title: "Multi-Platform Output"
Body: "Single source generates three platform-specific distributions. WOFF2 fonts for web, TTF/OTF for mobile. SVG preserved, raster images processed per platform conventions."
```

---

## 🟢 Minor Issues

### 4. FeaturesSection Title
**Current**: "Built for Complex Multi-Brand Organizations"

**Problem**: Assumes enterprise context, limits perceived use cases

**Better**: "Core Capabilities"

### 5. FeaturesSection Body
**Current**: "A comprehensive asset distribution system for teams managing multiple brands, apps, and platforms from a single repository."

**Problem**: Generic description, doesn't highlight unique value

**Better**: "Asset processing automation for multi-brand products. Handles the transformation pipeline from design tools to platform-ready code."

---

## 📝 Detailed Card-by-Card Recommendations

### IntroSection Cards (3 total)

#### Card 1
```yaml
Current:
  title: "Eliminate Manual Work"
  body: "Stop copying and renaming files manually. Automated processing transforms and distributes assets with platform-native conventions."

Revised:
  title: "Automated File Processing"  
  body: "Transforms filenames to kebab-case for web, snake_case for mobile. Handles @2x/@3x resolution variants. Organizes Android drawables by density automatically."
```

#### Card 2
```yaml
Current:
  title: "Scale Across Brands"
  body: "Build for multiple brands from a single source. Override specific assets per brand without maintaining separate asset libraries."

Revised:
  title: "Brand Override System"
  body: "Define default assets once. Override specific files per brand using folder structure. Build system merges defaults with brand-specific assets automatically."
```

#### Card 3
```yaml
Current:
  title: "Deploy to All Platforms"
  body: "One asset source, multiple platform outputs. Automatic transformation and validation for web, iOS, and Android distributions."

Revised:
  title: "Multi-Platform Output"
  body: "Single source generates three platform-specific distributions. WOFF2 fonts for web, TTF/OTF for mobile. SVG preserved, raster images processed per platform conventions."
```

---

### FeaturesSection Cards (6 total)

#### Card 1
```yaml
Current:
  title: "Multi-Brand Architecture"
  body: "Manage multiple brand identities from a single repository. Brand-specific assets override defaults automatically while maintaining consistent structure."

Revised:
  title: "Multi-Brand Architecture"
  body: "Source folder structure defines brand hierarchy: default/ for shared assets, brand-name/ for overrides. Build script merges layers automatically based on CLI flags."
```

#### Card 2
```yaml
Current:
  title: "Cross-Platform Distribution"
  body: "One source generates optimized assets for web, iOS, and Android. Platform-native naming conventions and file organization applied automatically."

Revised:
  title: "Platform-Specific Transforms"
  body: "Applies naming conventions per platform: kebab-case with hyphens for web, snake_case with underscores for mobile. iOS outputs flat structure, Android uses drawable-density folders."
```

#### Card 3
```yaml
Current:
  title: "Smart File Processing"
  body: "Automatic renaming (kebab-case, snake_case), resolution handling (@2x, @3x), and density folder organization for Android drawables."

Revised:
  title: "Resolution Variant Handling"
  body: "Detects @2x and @3x suffixes in source files. Maps to iOS @2x/@3x conventions and Android density folders (hdpi, xhdpi, xxhdpi, xxxhdpi) automatically."
```

#### Card 4
```yaml
Current:
  title: "Asset Type Filtering"
  body: "Platform-specific file type filtering ensures only the right formats reach each platform. WOFF2 for web, TTF/OTF for mobile."

Revised:
  title: "Format Filtering by Platform"
  body: "Web build: WOFF2 fonts only. Mobile builds: TTF/OTF fonts only. Configurable extension filters prevent unsupported formats from reaching wrong platforms."
```

#### Card 5
```yaml
Current:
  title: "Selective Builds"
  body: "Build only what you need with command-line filters. Target specific brands, apps, or platforms for faster development and CI/CD optimization."

Revised:
  title: "CLI Build Filters"
  body: "Command-line flags filter builds by brand, app, or platform. Useful for development iteration and CI/CD pipelines that deploy one app at a time."
```

#### Card 6
```yaml
Current:
  title: "Validation & Analysis"
  body: "Built-in validation ensures distribution integrity. Analyze asset usage, detect duplicates, and get optimization recommendations."

Revised:
  title: "Build Validation"
  body: "Validates output structure after builds. Detects missing files, duplicate filenames after transformation, and unsupported file types. Provides file size analysis."
```

---

### HowSection Cards (3 total)

#### Card 1
```yaml
Current:
  title: "Organize Assets"
  body: "Place your fonts, images, and icons in the source/ directory. Organize by brand and app for automatic override handling."

Revised:
  title: "Structure Source Folders"
  body: "Organize assets under source/ using brand/app/type hierarchy. Files in default/ apply to all brands. Brand-specific folders override defaults when building."
```

#### Card 2
```yaml
Current:
  title: "Build Distribution"
  body: "Run the build command to process and transform assets for each platform with platform-native conventions."

Revised:
  title: "Run Build Command"
  body: "Execute pnpm assets to build all platforms, or use --brand, --app, --platform flags to filter output. Build script copies, renames, and organizes files per platform."
```

#### Card 3
```yaml
Current:
  title: "Use in Projects"
  body: "Copy or sync the generated dist/ folder to your projects. Assets are organized and named following platform conventions."

Revised:
  title: "Integrate Build Output"
  body: "Generated dist/ folder contains platform-specific asset bundles. Copy relevant folders into your web, iOS, or Android projects, or sync via CI/CD."
```

---

## Section Headers to Update

### HeroSection
```yaml
Current:
  tagline: "CHASSIS ASSETS"
  title: "Distribute Design Assets Across Brands, Apps & Platforms"
  body: "Manage fonts, images, icons, and illustrations from a single source and automatically distribute them for web, iOS, and Android with platform-native conventions."

Revised:
  tagline: "CHASSIS ASSETS"
  title: "Multi-Brand Asset Distribution for Web, iOS & Android"
  body: "Build system for processing design assets into platform-ready distributions. Handles file naming, resolution variants, and folder structure conventions across platforms."
```

### IntroSection
```yaml
Current:
  title: "Why Leading Teams Choose Chassis Assets"
  body: "Chassis Assets gives your team a repeatable way to distribute design assets across brands and platforms, eliminating manual management and coordination overhead."

Revised:
  title: "What Chassis Assets Does"
  body: "Processes source assets into platform-specific distributions using a build script. Supports multiple brands and apps from one repository with override-based architecture."
```

### FeaturesSection
```yaml
Current:
  title: "Built for Complex Multi-Brand Organizations"
  body: "A comprehensive asset distribution system for teams managing multiple brands, apps, and platforms from a single repository."

Revised:
  title: "Core Capabilities"
  body: "Asset processing automation for multi-brand products. Handles the transformation pipeline from design tools to platform-ready code."
```

### HowSection
```yaml
Current:
  title: "From Source to Production in 3 Steps"
  body: "Asset changes reach platform-ready distributions in minutes. No manual work. No naming errors. Just automated synchronization across every platform."

Revised:
  title: "How It Works"
  body: "Run one command to transform source assets into platform-specific distributions. The build script handles file naming, resolution variants, and folder structure for web, iOS, and Android."
```

---

## Summary of Changes

### What We're Removing:
- ❌ Claims about "leading teams" (no customers yet)
- ❌ Time-based claims like "in minutes" (unprovable)
- ❌ Absolute claims like "no errors" (unrealistic)
- ❌ Marketing fluff like "just," "seamlessly," "effortlessly"
- ❌ Vague benefits like "eliminate," "scale," "deploy"

### What We're Adding:
- ✅ Specific technical capabilities (kebab-case, snake_case, density folders)
- ✅ Concrete file examples (WOFF2, TTF/OTF, @2x/@3x)
- ✅ How mechanisms work (override system, folder structure, CLI flags)
- ✅ Provable facts (platforms supported, formats handled)
- ✅ Honest limitations (you copy files, we don't deploy them)

---

## Implementation Priority

1. **High Priority** (do first):
   - Fix IntroSection header: "Why Leading Teams Choose" → "What Chassis Assets Does"
   - Fix HowSection body: remove "minutes" and "no errors" claims
   - Update all 3 IntroSection cards to be capability-specific

2. **Medium Priority**:
   - Update all 6 FeaturesSection cards with technical specifics
   - Revise section headers across the board

3. **Low Priority** (nice to have):
   - Update HowSection card bodies (code examples are already good)
   - Refine HeroSection body text

---

## Tone Examples

### ❌ Avoid (Marketing-Fluffy):
- "Leading teams choose Chassis Assets for..."
- "Effortlessly distribute assets across..."
- "Seamlessly integrate with your workflow..."
- "Enterprise-grade asset management..."
- "X times faster than manual processes..."

### ✅ Use Instead (Technical-Honest):
- "The build script transforms filenames using..."
- "Supports three platforms: web, iOS, Android"
- "Override system works by merging folder contents..."
- "CLI flags filter build output by brand/app/platform"
- "Handles @2x/@3x variants and Android density folders"

---

## Questions to Answer in Copy

For each feature, answer at least 2 of these:
1. **How does it work?** (mechanism)
2. **What formats/platforms?** (specs)
3. **What command runs it?** (usage)
4. **What gets transformed?** (input/output)

Avoid answering only:
- Why is it good? (benefit without mechanism)
- Who uses it? (we don't have users yet)
- How much faster? (we can't measure)

---

*This review is based on honest positioning for a pre-launch technical tool. Once we have real users, we can add testimonials, metrics, and case studies.*
