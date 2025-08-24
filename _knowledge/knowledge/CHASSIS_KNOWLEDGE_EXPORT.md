# Chassis CSS Framework Knowledge Export

## Project Overview

This documentation site (`chassis-docs`) is built with Astro v5.12.9 and showcases the Chassis Design System - an enterprise-grade, token-driven CSS framework that bridges Figma designs to production code.

## What is Chassis CSS?

Chassis is a revolutionary CSS framework that extends beyond traditional component libraries. It's built on design tokens and focuses on semantic, context-aware styling.

### Core Philosophy
- **Token-Driven**: Everything is based on design tokens that can be generated from Figma
- **Context-Aware**: Components adapt their entire color palette based on semantic context
- **Multi-Platform**: Single source of truth for web, iOS, Android, and other platforms
- **Multi-Brand**: Support multiple brands with consistent component behavior

## Key Differences from Bootstrap

### 1. Naming Conventions

#### Size System
**Bootstrap (Numbers):**
```css
.mb-1, .mb-2, .mb-3, .mb-4, .mb-5
.py-1, .py-2, .py-3, .py-4, .py-5
.gap-1, .gap-2, .gap-3, .gap-4, .gap-5
```

**Chassis (Semantic Names):**
```css
.mb-xsmall, .mb-small, .mb-medium, .mb-large, .mb-xlarge
.py-xsmall, .py-small, .py-medium, .py-large, .py-xlarge
.gap-xsmall, .gap-small, .gap-medium, .gap-large, .gap-xlarge
```

#### Breakpoints
**Bootstrap (Abbreviations):**
```css
.col-sm-6, .col-md-4, .col-lg-3, .col-xl-2
.text-md-center, .d-lg-block
.flex-md-row, .justify-content-lg-end
```

**Chassis (Full Words):**
```css
.col-small-6, .col-medium-4, .col-large-3, .col-xlarge-2
.text-medium-center, .d-large-block
.flex-medium-row, .justify-content-large-end
```

### 2. Component Classes

#### Buttons
**Bootstrap:**
```html
<button class="btn btn-primary btn-lg">Primary</button>
<button class="btn btn-outline-secondary">Secondary</button>
```

**Chassis:**
```html
<button class="button primary large">Primary</button>
<button class="button outline secondary">Secondary</button>
```

#### Cards
**Bootstrap:**
```html
<div class="card">
  <div class="card-header">Header</div>
  <div class="card-body">Body</div>
</div>
```

**Chassis:**
```html
<div class="card context primary">
  <div class="card-header">Header</div>
  <div class="card-body">Body</div>
</div>
```

### 3. Context System (Unique to Chassis)

Chassis introduces a revolutionary context system where components inherit semantic meaning:

```html
<!-- Context changes the entire color palette -->
<div class="context primary">
  <button class="button">Primary Button</button>
  <div class="notification">Primary Notification</div>
  <span class="badge">Primary Badge</span>
</div>

<div class="context success">
  <button class="button">Success Button</button>
  <div class="notification">Success Notification</div>
  <span class="badge">Success Badge</span>
</div>
```

## Chassis CSS Architecture

### 1. Design Tokens
All styling is driven by CSS custom properties with the `--cx-` prefix:

```css
:root {
  /* Context Colors */
  --cx-primary: #00A4CC;
  --cx-primary-contrast: #ffffff;
  --cx-secondary: #F55200;
  --cx-success: #10C263;
  --cx-warning: #F5A300;
  --cx-danger: #F52314;
  --cx-info: #1414F5;
  --cx-neutral: #6F8085;
  
  /* Spacing Tokens */
  --cx-space-xsmall: 0.25rem;
  --cx-space-small: 0.5rem;
  --cx-space-medium: 1rem;
  --cx-space-large: 1.5rem;
  --cx-space-xlarge: 2rem;
  
  /* Typography */
  --cx-font-family-base: Inter, sans-serif;
  --cx-font-size-small: 0.875rem;
  --cx-font-size-medium: 1rem;
  --cx-font-size-large: 1.125rem;
}
```

### 2. Component Structure
Chassis components use a placeholder-based SCSS architecture:

```scss
.button {
  @extend %button, %button-medium, %solid-button, %component;
  
  &.outline {
    @extend %outline-button;
  }
  
  &.smooth {
    @extend %smooth-button;
  }
  
  &.large {
    @extend %button-large;
  }
  
  &.small {
    @extend %button-small;
  }
}
```

### 3. Context Implementation
Context classes use CSS variable re-declaration:

```scss
.context {
  &.primary {
    --cx-fg-color: var(--cx-primary-contrast);
    --cx-bg-color: var(--cx-primary);
    --cx-border-color: var(--cx-primary);
  }
  
  &.success {
    --cx-fg-color: var(--cx-success-contrast);
    --cx-bg-color: var(--cx-success);
    --cx-border-color: var(--cx-success);
  }
}
```

## Project Structure

```
chassis-docs/
├── astro/                          # Astro documentation site
│   ├── src/
│   │   ├── layouts/
│   │   │   └── Layout.astro        # Main layout with Chassis CSS integration
│   │   ├── pages/
│   │   │   └── index.astro         # Homepage showcasing Chassis features
│   │   ├── components/
│   │   │   ├── Welcome.astro       # Chassis component showcase
│   │   │   └── Footer.astro        # Footer using Chassis classes
│   │   └── styles/
│   │       └── main.scss           # Custom styles using Chassis tokens
│   ├── public/
│   │   ├── chassis.css             # Compiled Chassis CSS framework (662KB)
│   │   ├── chassis-icons.css       # Chassis icon system
│   │   └── chassis-icons.woff2     # Icon fonts
│   └── package.json
├── vendor/
│   ├── css/                        # Chassis CSS framework source (git submodule)
│   │   ├── scss/                   # SCSS source files
│   │   ├── dist/css/               # Compiled CSS files
│   │   └── README.md               # Framework documentation
│   └── tokens/                     # Chassis tokens system (git submodule)
│       ├── assets/                 # Token assets and configurations
│       ├── build/                  # Build scripts
│       └── tokens/                 # Generated tokens
└── README.md                       # Project documentation
```

## Build Process

### 1. Token Generation
```bash
cd vendor/tokens
npm run build:tokens:chassis-docs
npm run copy:assets:chassis-docs
```

### 2. CSS Framework Build
```bash
cd vendor/css
npm run css
npm run css-copy
```

### 3. Site Development
```bash
cd astro
npm run dev        # Development server
npm run build      # Production build
npm run sync-assets # Sync assets from vendor/tokens
```

## Asset Management

### 1. Asset Configuration
Astro is configured to read assets from the Chassis tokens directory:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import path from 'path';

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        '@assets': path.resolve('../vendor/tokens/dist/assets/web/chassis-docs'),
      },
    },
  },
});
```

### 2. Available Assets
Assets are automatically synced from `vendor/tokens/dist/assets/web/chassis-docs/` to `astro/public/`:

#### Fonts
- **Inter**: Complete font family (Regular, Bold, Light, etc.) in OTF format
- **Fira Code**: Monospace font for code blocks in OTF format
- Located in `/fonts/inter/otf/` and `/fonts/fira-code/`

#### Brand Assets
- **Logos**: Multiple color variations (brand, white, black, alternate)
- **Icons**: Simple brand icons in multiple formats
- **Formats**: SVG, PNG, @2x and @3x retina versions
- Located in `/images/` with naming pattern: `chassis-{type}-{variant}.{ext}`

#### UI Icons
- **Home Icons**: Various person representations (any, male, female)
- **SVG Format**: Scalable vector graphics
- Located in `/icons/`

### 3. Asset Sync Script
Automated asset synchronization using `npm run sync-assets`:

```javascript
// scripts/sync-assets.js
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';

function copyDirectory(source, target) {
  // Recursively copies assets from vendor/tokens to public/
  // Only copies newer files to optimize build times
}
```

### 4. Asset Usage Examples

#### Logo Implementation
```html
<!-- Hero section with brand logo -->
<div class="text-center mb-large">
  <img src="/images/chassis-logo-white.svg" alt="Chassis Logo" style="height: 80px;">
</div>
```

#### Icon Usage
```html
<!-- UI icons -->
<img src="/icons/home-any.svg" alt="Home Icon" style="width: 48px; height: 48px;">
<img src="/icons/home-male.svg" alt="Home Male Icon" style="width: 48px; height: 48px;">
```

#### Font Loading
```css
/* Inter font family automatically available */
body {
  font-family: Inter, sans-serif;
}

/* Fira Code for code blocks */
code, pre {
  font-family: 'Fira Code', monospace;
}
```

## Chassis CSS Components Used in Project

### 1. Layout Components
- `.container` - Responsive container
- `.row` - Grid row
- `.col-{breakpoint}-{size}` - Grid columns

### 2. Interactive Components
- `.button` - Primary button component
- `.button.outline` - Outlined button variant
- `.button.smooth` - Smooth button variant
- `.button.large` - Large button size
- `.button.small` - Small button size

### 3. Content Components
- `.card` - Card container
- `.card-header` - Card header section
- `.card-body` - Card body content
- `.notification` - Notification/alert component
- `.badge` - Badge/tag component

### 4. Context Classes
- `.context` - Base context container
- `.context.primary` - Primary context
- `.context.secondary` - Secondary context
- `.context.success` - Success context
- `.context.warning` - Warning context
- `.context.danger` - Danger context
- `.context.info` - Info context
- `.context.alternate` - Alternate context

### 5. Utility Classes
- Spacing: `.mb-{size}`, `.py-{size}`, `.gap-{size}`
- Typography: `.display-{size}`, `.lead`, `.fw-bold`
- Flexbox: `.d-flex`, `.justify-content-center`, `.align-items-center`
- Text: `.text-center`, `.text-{breakpoint}-end`

## Implementation Examples

### Hero Section with Context
```html
<section class="hero-section context primary">
  <div class="container">
    <h1 class="display-large fw-bold mb-large">Chassis Design System</h1>
    <p class="lead mb-large">Enterprise-grade design system</p>
    <div class="d-flex gap-medium justify-content-center">
      <a href="#features" class="button large primary">Get Started</a>
      <a href="#examples" class="button large outline">View Examples</a>
    </div>
  </div>
</section>
```

### Card Grid with Context
```html
<div class="row g-large">
  <div class="col-medium-4">
    <div class="card h-100 text-center context">
      <div class="card-body">
        <h5 class="card-title">Multi-Brand Support</h5>
        <p class="card-text">Support multiple brands with consistent components</p>
        <div class="d-flex gap-small justify-content-center mt-medium">
          <span class="badge primary">Figma</span>
          <span class="badge secondary">Tokens</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Context Showcase
```html
<div class="col-large-2 col-medium-4 col-6">
  <div class="notification primary text-center">
    <strong>Primary</strong>
    <p class="mb-0 small">Brand identity</p>
  </div>
</div>
```

## SCSS Integration

### Custom Styles Using Tokens
```scss
.hero-section {
  background: linear-gradient(135deg, var(--cx-primary) 0%, var(--cx-secondary) 100%);
  color: var(--cx-primary-contrast);
  
  h1 {
    margin-bottom: var(--cx-space-large);
  }
  
  .lead {
    margin: 0 auto var(--cx-space-xlarge);
  }
}

.button {
  &.large {
    padding: var(--cx-space-large) var(--cx-space-xlarge);
  }
  
  &.small {
    padding: var(--cx-space-small) var(--cx-space-medium);
  }
}
```

## Key Features Implemented

### 1. Token-Driven Design
- All spacing uses `--cx-space-*` tokens
- Colors use semantic `--cx-{context}` tokens
- Typography uses `--cx-font-*` tokens

### 2. Context-Aware Components
- Components inherit context colors automatically
- Maintains semantic meaning across themes
- Easy brand switching through token updates

### 3. Responsive Design
- Semantic breakpoint names (`small`, `medium`, `large`)
- Mobile-first approach
- Consistent spacing across screen sizes

### 4. Icon System
- Custom icon font integration
- Semantic icon classes (`.chassis-icon-*`)
- Proper font loading and fallbacks

## Common Patterns

### Button Variations
```html
<!-- Solid buttons -->
<button class="button primary">Primary</button>
<button class="button secondary">Secondary</button>

<!-- Outlined buttons -->
<button class="button outline primary">Outline Primary</button>
<button class="button outline secondary">Outline Secondary</button>

<!-- Smooth buttons -->
<button class="button smooth warning">Smooth Warning</button>

<!-- Sizes -->
<button class="button small primary">Small</button>
<button class="button large primary">Large</button>
```

### Context Application
```html
<!-- Apply context to container -->
<div class="context success">
  <div class="notification">Success notification</div>
  <button class="button">Success button</button>
  <span class="badge">Success badge</span>
</div>

<!-- Individual context -->
<div class="card context warning">
  <div class="card-body">Warning card</div>
</div>
```

### Grid Layout
```html
<div class="container">
  <div class="row g-large">
    <div class="col-medium-6 col-large-4">
      <!-- Content -->
    </div>
    <div class="col-medium-6 col-large-4">
      <!-- Content -->
    </div>
    <div class="col-medium-12 col-large-4">
      <!-- Content -->
    </div>
  </div>
</div>
```

## Troubleshooting

### Common Issues

1. **Missing Context Colors**: Ensure context class is applied to parent container
2. **Size Classes Not Working**: Use semantic names (`medium`, `large`) not numbers
3. **Breakpoint Issues**: Use full words (`medium`, `large`) not abbreviations (`md`, `lg`)
4. **Icon Loading**: Ensure `chassis-icons.css` and font files are properly loaded

### Debug Checklist

1. Verify Chassis CSS is loaded: Check for `chassis.css` in network tab
2. Check token values: Inspect computed styles for `--cx-*` variables
3. Validate class names: Ensure semantic naming conventions
4. Context inheritance: Verify context classes on parent elements

## Performance Considerations

- **CSS Size**: Full framework is ~662KB, consider tree-shaking for production
- **Icon Fonts**: Use `preload` for critical icon fonts
- **Token Loading**: Ensure tokens are loaded before component rendering
- **Context Cascade**: Be mindful of context nesting and specificity

## Future Considerations

1. **Dark Theme**: Chassis supports automatic dark theme through `[data-cx-theme="dark"]`
2. **Custom Brands**: Can generate new token sets for different brands
3. **Component Extensions**: Easy to extend existing components using placeholders
4. **Multi-Platform**: Tokens can generate iOS/Android equivalents

This knowledge export captures the essence of Chassis CSS as implemented in this documentation project, serving as a comprehensive reference for future development and maintenance.
