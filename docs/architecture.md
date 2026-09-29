# Chassis Assets architecture

What `chassis-assets` holds, what a contributor puts into `source/`, and what the build
promises to write into `dist/`. It is for contributors who change the source or the build,
and for the maintainers of the sites and apps that read the output.

> **Status:** this document describes version 0.2.0, the rewrite of the build that
> [the roadmap](../ref/ROADMAP.md) plans. The scope and the three contracts below were
> decided in session 1.1 and are the specification that Phase 2 implements. Until 0.2.0 is
> released, the build in `build/` writes the layout of 0.1.8, and
> [What 0.2.0 changes](#what-020-changes) lists the differences. Session 1.2 adds how the
> build works: the build in one picture, the design decisions, the configuration and the
> checks.

## Scope

### What this repository holds

- **The brand assets that the Chassis project owns:** the logos, the favicons and the
  social image of the sites, the illustrations of the home pages, the sprite of the home
  page icons, and the screenshots of the Figma components that the Figma documentation
  shows.
- **The assets of the demo app:** its images and its fonts. They are the example of a
  brand's assets going to the web, iOS and Android from one source.
- **An example brand**, `example`, that overrides logos and fonts of the default brand.
- **The build** that turns `source/` into one output folder per brand, app and platform,
  and the checks that keep the source and the output in order.
- **The documentation site** of the build, in `site/`.

### What it does not hold

| Not here                                  | Where it lives                               | Why                                                                                  |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| The icon library: SVG files and icon font | `@chassis-ui/icons`                          | Every site copies it from the package. A copy here goes stale.                       |
| Design tokens and their Figma export      | `@chassis-ui/tokens`                         | The export is the source of that package.                                            |
| The fonts of the sites                    | Google Fonts                                 | Decision D15 of the website roadmap. The layouts of `@chassis-ui/docs` load them.    |
| The web app manifest of a site            | `static/static/images/manifest.json` of each | It holds the name and colors of a site. It names two icons that this build writes.   |
| Scripts and styles                        | `@chassis-ui/docs`, `@chassis-ui/css`        | This repository ships no code to a consumer.                                         |
| App icons and launch screens              | The app                                      | Xcode and Android Studio generate them from one image, with settings of the project. |

### How it is distributed

The package is not published to npm. Two ways lead to the output:

- **The sites** vendor the repository as the submodule `vendor/assets`, pinned to a commit
  of the branch `app/docs`, and build it. See [the consumer contract](#consumer-contract).
- **Apps and everyone else** download a [release archive](#release-archives): one per
  brand, app and platform, attached to the GitHub release of a version.

`dist/` is not committed.

## Consumer contract

What the Chassis sites read from this repository. **This part holds through the rewrite:**
a change to it is a breaking change for six repositories, and it follows the rules under
"Breaking changes" of the roadmap.

It was read from `packages/docs/src/cli/assets.js`, `packages/docs/src/layouts/` and
`packages/docs/starter/src/libs/static.ts` of `chassis-website`, and from the sources of the
sites of `chassis-website`, `chassis-tokens`, `chassis-css`, `chassis-react`,
`chassis-icons` and `chassis-figma`.

### How a site builds the assets

| Consumers rely on                                                                                        | Where                                                           |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| The branch `app/docs`. A site pins `vendor/assets` to a commit of it.                                    | `DEFAULT_BRANCH` of the `chassis-docs` command; `.gitmodules`   |
| `git lfs pull` gives the real files.                                                                     | `buildCheckout()` of the command; `.gitattributes`              |
| `pnpm install --ignore-workspace` at the root, then `pnpm assets:site`, writes `dist/web/docs/chassis/`. | `ASSETS_OUTPUT` of the command; `getChassisAssetsFsPath()`      |
| That folder is copied to `/static/` of the site, as it is.                                               | `chassisStatic()` of the starter; `copyChassisAssets()` of each |

After the assets, a site copies the folder `icons/` of `@chassis-ui/icons` to
`/static/icons/`. So `/static/icons/` holds files of both.

### The files a site reads

Paths are relative to `dist/web/docs/chassis/`.

| Files                                                                                                         | Read by                                                                                                |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `images/site-logo.svg`                                                                                        | `Navigation.astro` and `Footer.astro` of `@chassis-ui/docs`                                            |
| `images/favicon.png`, `images/favicon-16x16.png`, `images/favicon-32x32.png`, `images/apple-touch-icon.png`   | `Favicons.astro`. Each site also copies `favicon.png` to `/favicon.ico` and the touch icon to the root |
| `images/android-chrome-192x192.png`, `images/android-chrome-512x512.png`                                      | The `manifest.json` of each site                                                                       |
| `images/social-image.png`                                                                                     | `BaseLayout.astro`. It reads the size of the file, so the build of a site fails without it             |
| `icons/cx-sprite.svg`                                                                                         | The home page of every site imports it at build time. The build of a site fails without it             |
| `images/home/comp-gallery-{light,dark}` as `.png` and `.webp`, each with `@2x`, `-small` and `-small@2x`      | `GalleryImage.astro` of the website; `ResponsiveImage.astro` on the site of `chassis-tokens`           |
| `images/home/figma-{docs,library,tokens}-{light,dark}.webp`, each with `@2x`                                  | `FigmaSection.astro` of the website                                                                    |
| `images/home/icon-library-{light,dark}.svg`, `images/home/tokens-scheme.svg`, `images/home/tokens-visual.svg` | `IconsSection.astro` and `TokensSection.astro` of the website                                          |
| `images/logo/chassis-{logo,icon}-{brand,white}-banner.svg`                                                    | `BrandingSection.astro` of the website, as images and as downloads                                     |
| `images/figma/components/<component>/{light,dark}/<name>.png`, each with `@2x`                                | `ExampleImage.astro` and `CxVariant.astro` of the site of `chassis-figma`                              |

A site finds the variants of an image by name: `ResponsiveImage.astro` adds `@2x` to the
path it is given, and `GalleryImage.astro` adds `-small` and `@2x`. So the
[names of the variants](#the-names-of-the-variants) are part of this contract.

### What a site does not read

- `images/manifest.json`. The layouts link to it, and each site has its own in
  `static/static/images/`. This build does not write it.
- Fonts. The layouts load Google Fonts.
- The icon library. `/static/icons/chassis-icons.*` comes from `@chassis-ui/icons`.

Nothing consumes `dist/ios/` or `dist/android/` today.

## Source contract

What a contributor puts where.

### Layout

```
source/
  <brand>/
    shared/
      <type>/
    <app>/
      <type>/
```

- **`<brand>`** is `default`, or a brand of `chassis.build.brands`. `default` holds what
  every brand starts from. A brand without a folder, as `chassis` today, builds from
  `default` alone.
- **`shared`** holds what every app of the brand gets. It is not an app, and an app cannot
  have this name.
- **`<app>`** is an app of `chassis.build.apps`: `docs` and `demo`.
- **`<type>`** is one of the four [asset types](#asset-types).

The tree of 0.2.0:

```
source/
  default/
    shared/
      images/logo/          the logos, as SVG
    docs/
      icons/                cx-sprite.svg
      images/               favicons, site-logo.svg, social-image.png
      images/home/          the illustrations of the home pages
      images/figma/         the screenshots of the Figma components
    demo/
      fonts/                one OTF or TTF file per face
      images/
  example/
    shared/
      images/logo/
    demo/
      fonts/
```

### Layers

A job builds one brand and one app for one platform. It reads four layers, in this order:

1. `source/default/shared/`
2. `source/default/<app>/`
3. `source/<brand>/shared/`
4. `source/<brand>/<app>/`

A later layer overrides an earlier one. A layer that does not exist is skipped, except
`source/default/<app>/`, which every app needs.

What is overridden is an **asset**, not a file. An image is identified by its type, its
folder and its base name, without the resolution indicator and the extension:
`images/logo/chassis-logo-brand`. When two layers hold that image, the job takes the file
of the later layer, also when its extension or its density is another one. Fonts are
identified by the `id` of their family in the font manifest.

The manifests of the layers are read in the same order, and the rules of a later layer come
after those of an earlier one.

### Asset types

| Type     | Folder    | Files in `source/`                         | Notes                                                                     |
| -------- | --------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| `images` | `images/` | `.png`, `.jpg`, `.webp`, `.svg`, `.gif`    | With `images.json`, the [image manifest](#the-image-manifest)             |
| `icons`  | `icons/`  | `.svg`                                     | One color, drawn with `currentcolor`. A sprite is an icon file too        |
| `fonts`  | `fonts/`  | `.otf`, `.ttf`, and the licenses as `.txt` | With `fonts.json`, the [font manifest](#the-font-manifest). No stylesheet |
| `other`  | `other/`  | anything                                   | Copied to the web output as it is. The native outputs leave it out        |

The difference between an icon and an SVG image is what an app does with it. An icon takes
the color of its context: the native outputs render it as a template. An image keeps its
colors.

### Names

- A file or folder name has lowercase letters, digits and hyphens: `figma-docs-light.png`.
- A name starts with a letter. The native outputs make resource names from it, and those
  cannot start with a digit.
- A raster image can have a resolution indicator before its extension: `@2x`, `@3x` or
  `@4x`. Without one it is at 1x. No other file has one.
- A JPEG file has the extension `.jpg`.
- The manifests are named `images.json` and `fonts.json`, and they are at the root of their
  type folder.

The build does not rename a file for the web: the name in `source/` is the name a site
reads.

### Images: masters and variants

**One file is committed per image: the master.** For a raster image it is the file at the
highest density that the output needs. For a vector image it is the SVG file. The build
derives every other file of the image, and the image manifest says which.

| Term    | Meaning                                                                         | Example                                 |
| ------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| Image   | What the manifest and the layers name                                           | `home/comp-gallery-light`               |
| Master  | The committed file of an image                                                  | `home/comp-gallery-light@2x.png`        |
| Density | The pixels per point of a file, from its resolution indicator                   | `2`                                     |
| Size    | A narrower rendition of an image, with a name and a width in pixels at 1x       | `small`, 480                            |
| Format  | The file format of a written file                                               | `webp`                                  |
| Variant | A file the build writes for an image: one density, one size or none, one format | `home/comp-gallery-light-small@2x.webp` |

Rules of derivation:

- **The build never scales up.** A density above the density of the master, or a size wider
  than the master, fails the build with the name of the image.
- **The size of a variant is rounded half up.** The width is the width of the master times
  the density of the variant, divided by the density of the master. For a size, the width
  is the width of the size times the density. The height follows from the ratio of the
  master, rounded the same way. A master of 2480 × 2175 pixels at `@2x` gives 1240 × 1088
  at 1x and 480 × 421 for a size of 480.
- **An SVG master has no density.** Its width and height are its size at 1x. A raster
  format in the manifest renders it at each density.
- **An image without a rule is copied as it is**, at its own density and in its own format.

#### The names of the variants

```
<name>[-<size>][@<density>x].<extension>
```

The 1x variant has no indicator. The extension of `jpeg` is `.jpg`. These names are the
ones the components of the sites build, so they are part of
[the consumer contract](#consumer-contract).

#### Committed variants

The screenshots of the Figma components are exports: Figma renders each density by itself,
and the 1x file is not the 2x file scaled down. For these images the rule
`"committed": true` says that every variant is committed and that the build copies them. A
light and a dark screenshot that are the same picture stay two files, because a component
that looks the same in both modes is a fact of the design.

### The image manifest

`images.json` holds a list of rules. A rule names the images it applies to and what the
build writes for them.

```json
{
  "version": 1,
  "rules": [
    { "match": "home/*", "densities": [1, 2] },
    {
      "match": "home/comp-gallery-*",
      "sizes": { "small": 480 },
      "formats": ["png", "webp"],
      "budget": 500000
    },
    { "match": "home/figma-*", "formats": ["png", "webp"] },
    { "match": "figma/**", "committed": true }
  ]
}
```

The rules are read in order, and a later rule overrides the keys it sets for the images it
matches, as in a `.gitattributes` file. An image gets the keys of every rule that matches
it.

| Key         | Value                                                                                 | Without it                      |
| ----------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| `match`     | A pattern of image names, relative to `images/`. `*` stays in a folder, `**` does not | Required                        |
| `densities` | A list of `1`, `1.5`, `2`, `3` and `4`                                                | The density of the master       |
| `sizes`     | An object: the name of a size and its width in pixels at 1x                           | No sizes                        |
| `formats`   | A list of `png`, `jpeg`, `webp`, `avif` and `svg`                                     | The format of the master        |
| `quality`   | An object: a format and its quality, 1 to 100                                         | `jpeg` 82, `webp` 80, `avif` 50 |
| `palette`   | `true` lets the optimization reduce a PNG to a palette                                | `false`                         |
| `budget`    | The largest size in bytes of a file written for the image. A larger file fails        | No limit                        |
| `committed` | `true` says that the variants are committed. The build derives nothing                | `false`                         |
| `platforms` | The platforms that get the image                                                      | Every platform of the app       |
| `name`      | The name of the image in the native outputs. `match` must name one image              | [From the path](#native-names)  |

A size is written at every density of the image, next to the full size. `densities`,
`sizes` and `quality` apply to the raster formats of an image. `svg` in `formats` is for an
SVG master and writes the master itself.

### The font manifest

`fonts.json` names the families, their faces and their licenses. Every font file is in it,
and every file it names exists.

```json
{
  "version": 1,
  "families": [
    {
      "id": "text",
      "family": "Inter",
      "license": "licenses/inter.txt",
      "subset": ["U+0020-007E", "U+00A0-024F"],
      "faces": [
        { "file": "text-elegant.otf", "weight": 300, "style": "normal" },
        { "file": "text-normal.otf", "weight": 400, "style": "normal" },
        { "file": "text-normal-italic.otf", "weight": 400, "style": "italic" }
      ]
    }
  ]
}
```

| Key       | Value                                                                                   |
| --------- | --------------------------------------------------------------------------------------- |
| `id`      | The name of the family in the native outputs, and what a layer overrides: `text`        |
| `family`  | The family name in the generated stylesheet: `Inter`                                    |
| `license` | The license file of the family, relative to `fonts/`. Required                          |
| `subset`  | The Unicode ranges that the fonts keep when the subsetting is on. Optional              |
| `faces`   | One entry per file: `file`, `weight` from 100 to 900, and `style`, `normal` or `italic` |

A font file is named by its role, not by its typeface: `text-strong.otf` is the strong
weight of the text family, whichever typeface a brand uses for it. The roles are those of
the tokens: `text`, `display` and `code`, and `elegant`, `normal`, `strong` and `mass`.

**One file per face is committed**, as OTF or TTF. The build writes the WOFF2 file of the
web and the stylesheet. A WOFF2 file or a stylesheet in `fonts/` is an error.

**Every family has its license.** The fonts of the default brand are under the SIL Open
Font License, which asks for the license text next to every copy. The build writes the
license files into every output that holds the fonts.

### What the source lint checks

`lint` reads `source/` and the manifests. It writes nothing, and every message names the
file.

| Rule               | Fails when                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Names              | A name breaks a rule of [Names](#names)                                                   |
| Known types        | A file has an extension that its type folder does not take, or is outside a type folder   |
| Real files         | A file is a Git LFS pointer. The message says to run `git lfs pull`                       |
| One master         | An image has two files in one layer, and no rule says `committed`                         |
| No derived variant | A committed file has the name of a variant that the build derives                         |
| Manifest           | A manifest does not parse, has an unknown key, or a rule matches no image                 |
| No scaling up      | A rule asks for a density above the master's, or a size wider than the master             |
| Fonts              | A font file is not in `fonts.json`, a face names a missing file, or a license is missing  |
| No generated file  | `fonts/` holds a WOFF2 file or a stylesheet                                               |
| No duplicate       | Two files of one folder have the same content                                             |
| Reserved names     | A folder of `source/` is not `default` or a configured brand, or an app is named `shared` |

Two files in different folders can have the same content: the light and dark screenshots
of a component do.

## Output contract

What the build promises to write. Changing it changes what sites and apps read, so it
follows the rules under "Breaking changes" of the roadmap.

### Jobs and folders

A job writes one folder:

```
dist/<platform>/<app>/<brand>/
```

With the configuration of 0.2.0 there are eight jobs: the brands `chassis` and `example`, for
`docs` on `web`, and for `demo` on `web`, `ios` and `android`.

| App    | Platforms               | What it is for                                         |
| ------ | ----------------------- | ------------------------------------------------------ |
| `docs` | `web`                   | The Chassis sites. It holds the consumer contract      |
| `demo` | `web`, `ios`, `android` | The example of one source going to the three platforms |

`pnpm assets:site` builds `dist/web/docs/chassis/` and nothing else.

### The output manifest

Every job writes `chassis-assets.json` at the root of its folder: what the job wrote, and
from what.

```json
{
  "version": 1,
  "package": "0.2.0",
  "brand": "chassis",
  "app": "docs",
  "platform": "web",
  "files": [
    {
      "path": "images/home/comp-gallery-light-small@2x.webp",
      "type": "images",
      "bytes": 49876,
      "sha256": "…",
      "width": 960,
      "height": 842,
      "density": 2,
      "source": "source/default/docs/images/home/comp-gallery-light@2x.png",
      "derived": true
    }
  ]
}
```

- `files` is sorted by `path`, and lists every file of the folder except the manifest.
- `width`, `height` and `density` are there for images. The size is in pixels.
- `derived` is `true` when the build made the file, and `false` when it copied it.
- There is no date and no absolute path in it: two builds of one commit write the same
  manifest.

The golden files of the tests are these manifests, without `package`.

### Derivation and optimization

| Step         | Runs                                                       | Does                                                                                                                          |
| ------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Derivation   | Always                                                     | Writes the variants of the image manifest, WOFF2 files and the stylesheet, vector drawables, image sets and the Swift package |
| Optimization | When `chassis.build.options.<platform>.optimize` is `true` | Encodes copied images again, reduces PNG files to a palette, cleans SVG files, subsets fonts                                  |

Derivation is not an option, because the names of the consumer contract come from it. A
build without optimization is the fast one that a site runs.

The build is deterministic: the same commit, with the same versions of the tools, writes
the same bytes on the same operating system. Whether the bytes are the same on Linux and
macOS is measured in session 2.3 of the roadmap.

### Web

```
dist/web/<app>/<brand>/
  chassis-assets.json
  images/     the folders of the source, with the variants next to each other
  icons/      the SVG files of the source
  fonts/      <file>.woff2 for every face, and fonts.css
  licenses/   the license files of the fonts
  other/      the files of the source
```

- **Paths and names are those of the source.** `images/home/lego-chassis@2x.png` of the
  source is `images/home/lego-chassis@2x.png` of the output.
- **Images** are written in every format, density and size of their rules.
- **Fonts** are WOFF2 only. `fonts/fonts.css` has one `@font-face` rule per face, with the
  `family`, `weight` and `style` of the font manifest, `font-display: swap`, a `src` that
  is relative to the stylesheet, and `unicode-range` when the fonts are subset.
- A folder is written only when it holds a file. The output of `docs` has no `fonts/`,
  `licenses/` and `other/`.

### Android

```
dist/android/<app>/<brand>/
  chassis-assets.json
  licenses/
  res/
    drawable/            vector drawables, from SVG images and icons
    drawable-mdpi/       raster images at 1x
    drawable-hdpi/       1.5x
    drawable-xhdpi/      2x
    drawable-xxhdpi/     3x
    drawable-xxxhdpi/    4x
    font/                the font files, and one <id>.xml per family
```

The layout is that of the `res/` tree of `@chassis-ui/tokens`, so an app can merge the two.

- **Raster images** go to the folder of their density. An image is written in one format,
  since two files of one name are one resource: WebP when its rule lists `webp`, otherwise
  the format of the master, and PNG when that is AVIF or GIF.
- **SVG files** become vector drawables in `res/drawable/`, made by `svg2vectordrawable`
  with three decimals. An icon is filled black, which a tint replaces. An image keeps its
  colors. An SVG file that does not convert fails the job with its name; the rule
  `platforms` takes an image out of the platform.
- **Fonts** keep their format, OTF or TTF. `res/font/<id>.xml` is a `font-family` resource
  that lists the faces of the family with their weight and style, so that `@font/text`
  gives an app every weight.
- **`other`** is not written.

### iOS

```
dist/ios/<app>/<brand>/
  chassis-assets.json
  licenses/
  Package.swift
  ChassisAssets.swift
  ChassisAssets.xcassets/
    Contents.json
    <Name>.imageset/
      Contents.json
      <Name>.png, <Name>@2x.png, <Name>@3x.png    or    <Name>.svg
  Fonts/
    Fonts.plist
    <file>.otf or <file>.ttf
```

- **The folder is a Swift package**, `ChassisAssets<App><Brand>`: `ChassisAssetsDemoChassis`.
  An app adds it as a local package, or takes the catalog and the fonts out of it.
  `ChassisAssets.swift` declares the caseless `public enum ChassisAssets` with `bundle`,
  the bundle of the resources, and `registerFonts()`, which registers the fonts of the
  package with Core Text.
- **The catalog is named `ChassisAssets.xcassets`**, not `Assets.xcassets`, the name of the
  catalog that Xcode creates in every app.
- **An image set** holds the 1x, 2x and 3x files of a raster image that its rule lists, in
  the format of the master, or PNG when that is WebP, AVIF or GIF. The densities 1.5 and 4
  are left out. An SVG file is one file that keeps its vector representation.
- **An icon** is rendered as a template, as the icons of `@chassis-ui/tokens` are.
- **`Fonts/Fonts.plist`** is a fragment with the key `UIAppFonts` and the list of the font
  files, for an app that adds the fonts to its own target.
- **`other`** is not written.

There is no `Package.swift` at the root of the repository. `dist/` is not committed, so a
root package would name folders that a checkout does not have.

### Native names

A native name is made from the path of the asset below its type folder: the folders and the
name, without the resolution indicator and the extension.

| Source                               | Android                                      | iOS                             |
| ------------------------------------ | -------------------------------------------- | ------------------------------- |
| `images/logo/chassis-logo-brand.svg` | `res/drawable/logo_chassis_logo_brand.xml`   | `LogoChassisLogoBrand.imageset` |
| `images/home/lego-chassis@2x.png`    | `res/drawable-xhdpi/home_lego_chassis.png`   | `HomeLegoChassis.imageset`      |
| `images/chassis-logo-shadow@2x.png`  | `res/drawable-xhdpi/chassis_logo_shadow.png` | `ChassisLogoShadow.imageset`    |
| `icons/arrow-right.svg`              | `res/drawable/ic_arrow_right.xml`            | `IconArrowRight.imageset`       |
| `fonts/text-strong-italic.otf`       | `res/font/text_strong_italic.otf`            | `Fonts/text-strong-italic.otf`  |

- Android names are `snake_case`, and icons have the prefix `ic_`.
- iOS names are `PascalCase`, and icons have the prefix `Icon`.
- The rule `name` of the image manifest replaces the name that comes from the path. It is
  written in kebab-case, and each platform gives it its own case.
- **Two assets with one name fail the job**, with both source paths in the message.

### Release archives

A release attaches one archive per job to the GitHub release of its version:

```
chassis-assets-<platform>-<app>-<brand>-<version>.zip
```

The archive holds the folder of the job, built with the optimization on, and checked
against the golden files before it is attached.

### What 0.2.0 changes

Paths of 0.1.8 and what becomes of them. Nothing in
[the consumer contract](#consumer-contract) changes its path or its name.

| In 0.1.8                                                                   | In 0.2.0                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dist/web/docs/<brand>/icons/icons/`, `icons/svgs/`                        | Removed. They were a copy of `@chassis-ui/icons` 0.3.1                           |
| `dist/web/docs/<brand>/icons/cx-sprite.svg`                                | Stays                                                                            |
| `dist/web/docs/<brand>/other/default-tokens.json`                          | Removed. It was an export of the tokens                                          |
| `dist/web/docs/<brand>/fonts/`                                             | Removed. The fonts are in the output of `demo`                                   |
| `fonts/text.css`, `fonts/code.css`                                         | Replaced by `fonts/fonts.css`, which names files that exist                      |
| The 1x, `-small` and WebP files of the home images                         | Same paths. The build derives them, so their bytes change                        |
| `images/figma/components/button-solid/*/meta-1*.png`, `badge/*/group*.png` | Removed. No page of the Figma documentation shows them                           |
| `images/figma/components/alert/*/alert-window*.png`                        | Stays. The source file is renamed from `Alert Window.png`                        |
| `dist/android/demo/<brand>/{fonts,icons,images}/`                          | `dist/android/demo/<brand>/res/`                                                 |
| `dist/ios/demo/<brand>/{fonts,icons,images}/`, loose files                 | A Swift package with an asset catalog                                            |
| No file                                                                    | `dist/web/demo/<brand>/`, and `chassis-assets.json` and `licenses/` in every job |
