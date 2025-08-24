## Base Colors

The foundation of the Chassis color system begins with **base colors** - brand-specific colors that define your visual identity. These colors are carefully selected based on brand guidelines and UI requirements, forming the primitive color palettes that power the entire design system.

<div class="overflow-scroll text-nowrap mb-medium">
  <div class="grid font-code" style="--cx-grid-columns: 11; --cx-grid-gap: var(--cx-space-2xsmall);">
  {
    getData('colors').map((color) => {
      return (
        <div class="grid" style="width: 12rem; --cx-grid-columns: 1; grid-template-rows: auto;">
          <div class={`p-medium rounded-small mb-xsmall position-relative swatch-${color.name} bg-${color.name} fg-contrast`}>
            <strong class="d-block">{color.name}</strong>
            {sassVars('color')?.[color.name]}
          </div>
          <div class={`p-medium rounded-small cxd-${color.name}-05`}>{color.name}-05</div>
            {
              Array.from({ length: 9 }, (_, i) => {
                const value = (i + 1) * 10; // Generates 10, 20, ..., 90
                return <div class={`p-medium rounded-small cxd-${color.name}-${value}`}>{color.name}-{value}</div>
              })
            }
          <div class={`p-medium rounded-small cxd-${color.name}-95`}>{color.name}-95</div>
        </div>
      )
    })
  }
  </div>
</div>

**Base colors serve as raw material** - they contain actual hex values and brand-specific properties like corner radiuses, border widths, and typography settings. These colors are references with raw values and typically aren't used directly in UI components, but instead feed into the context color system through carefully designed token mappings.

## Context Colors

The true innovation of Chassis lies in its **context color system** - a sophisticated approach that transforms base colors into application-ready UI tokens. Context colors bridge the gap between brand identity and practical interface design.

These **11 context colors** represent every color need in modern UI design:

<div class="row g-xsmall mb-medium font-code">
  {
    getData('context-colors').map((color) => {
      return (
        <div class="col-medium-4">
          <div class={`p-medium m-0 bg-${color.name} fg-contrast rounded-small`}>--cx-{color.name}</div>
        </div>
      )
    })
  }
</div>

**Context colors are semantic and purposeful:**
- **primary** & **secondary**: Your brand colors for actions and emphasis
- **success**, **warning**, **danger**, **info**: Universal UI states that users understand intuitively  
- **default**: The workhorse color for standard content (dark text on light backgrounds)
- **alternate**: For emphasized or inverted content (light text on dark/colored backgrounds)
- **neutral**: De-emphasized gray content for secondary information
- **black** & **white**: Pure contrast colors for design flexibility

Each context automatically adapts between light and dark themes through the sophisticated token resolution process, ensuring perfect contrast and accessibility across all viewing conditions.

### Context Palettes

Each context color expands into a **comprehensive palette of 30+ variations**, meticulously designed to handle every UI scenario. These palettes are the result of sophisticated color operations that blend base colors with opacity values to create harmonious, accessible color relationships.

<DocsContextPalette />

**The palette generation process combines:**
- **Base color references**: Brand-specific colors mapped to contexts
- **Color operations**: Systematic addition of black/white for variations
- **Opacity integration**: Layered transparency for subtle effects
- **Theme modding**: Automatic light/dark mode variations

This systematic approach ensures that every color in a palette maintains proper contrast ratios, follows accessibility guidelines, and creates visually cohesive interfaces regardless of the context or theme being used.

### Body Colors

From the context colors, the `default` palette is copied as the `body` palette, which can be set in options. Newly copied colors don't get a context prefix and become like `--cx-fg-main`, which is a copy of `--cx-default-fg-main`.

The body palette created above is used to declare body variables, which are then assigned to the related properties of the body and its children.

<DocsBodyPalette />

Switching between these palettes in contextual components is done by changing CSS variables.

## Examples

The `context` class changes the palette first then re-assigns the body colors with the new context.

### Context Class

Switching between contexts is like moving horizontally on the context palettes.

<Example code={[`<p class="p-xsmall">
    <span class="icon icon-info-circle-solid"></span>
    This is body context <a href="#">with link</a>, same as default.
  </p>`].concat(getData('context-colors').map((color) => `<p class="context ${color.name} p-xsmall">
    <span class="icon icon-info-circle-solid"></span>
    This is ${color.name} context <a href="#">with link</a>.
  </p>`))} />

### Context Style

It is also possible to easily switch between component styles by changing body colors, like moving vertically on the `context` palette.

<Example code={`<p class="context primary p-xsmall">
    <span class="icon icon-info-circle-solid"></span>
    This is a basic context component <a href="#">with link</a>.
  </p>
  <p class="context primary solid p-xsmall">
    <span class="icon icon-info-circle-solid"></span>
    This is a solid context component <a href="#">with link</a>.
  </p>
  <p class="context primary smooth p-xsmall">
    <span class="icon icon-info-circle-solid"></span>
    This is a smooth context component <a href="#">with link</a>.
  </p>
  <p class="context primary outline p-xsmall">
    <span class="icon icon-info-circle-solid"></span>
    This is an outline context component <a href="#">with link</a>.
  </p>`} />

## Summary

The Chassis - CSS's color system provides a structured approach to managing colors in a UI design. By defining base colors and context colors, and creating context palettes, it ensures consistency and flexibility. For more details, check out the [documentation]([[docsref:/customize/color]]) pages for customizing colors or visit the [color]([[docsref:/utilities/colors]]) and [background]([[docsref:/utilities/background]]) utility pages for more examples. Additionally, see the [Context Class]([[docsref:/core-concepts/context-class]]) page for more explanation, code examples, and tips for creating your components.


### Base Colors:

- Seven colors are selected based on brand and UI contexts.
- Primitive color palettes are created for each base color.
- These colors are available as CSS variables for use in components.

### Context Colors:

- Two additional variable colors (`default` and `alternate`) are added for basic use, behaving differently - in light and dark modes.
- Eleven context colors are defined, named by their area of use.

### Context Palettes:

- Common UI color needs are categorized and named.
- Palettes for each context color are created by referencing primitive color palettes.
- Colors are created using base color and opacity references.

### Body Colors:

- The `default` palette is copied as the `body` palette, which can be set in options.
- Body variables are declared from the body palette and assigned to related properties of the body and its children.

### Switching Contexts:

- Switching between context palettes is done by changing CSS variables.
- The `context` class changes the palette and re-assigns body colors with the new context.
- Component styles can be switched by changing body colors.

### Examples:

- Examples are provided to demonstrate switching between contexts and component styles.
- The color system ensures a structured and flexible approach to managing colors, promoting consistency across the UI design. For more details, refer to the documentation pages for customizing colors and utility examples.
