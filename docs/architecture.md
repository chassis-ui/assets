# Chassis Assets architecture

What `chassis-assets` holds, how its build works, what a contributor puts into `source/`,
and what the build promises to write into `dist/`. It is for contributors who change the
source or the build, and for the maintainers of the sites and apps that read the output.

> **Status:** this document describes version 0.2.0, the rewrite of the build that
> [the roadmap](../ref/ROADMAP.md) plans. It was written before the code, in sessions 1.1
> and 1.2, and it is the specification that Phase 2 implements.
> [What 0.2.0 changes](#what-020-changes) lists the differences from 0.1.8. A session of
> Phase 2 that finds a reason to build something another way changes this document in the
> same commit.
>
> **Built so far:** session 2.1 built the configuration, the plan, the inventory, the
> pipeline with its cache, the output manifest, the library and the command `build`.
> `pnpm assets` and `pnpm assets:site` run them. The source is still that of 0.1.8, so the
> rules of the three platforms give the names and the folders of 0.1.8, and the output is
> that of 0.1.8 with `chassis-assets.json` added. [Where the build is](#where-the-build-is)
> says what is missing.

| Section                                               | Answers                                         |
| ----------------------------------------------------- | ----------------------------------------------- |
| [Scope](#scope)                                       | What is in this repository, and what is not     |
| [The build in one picture](#the-build-in-one-picture) | Which module does what, in which order          |
| [Design decisions](#design-decisions)                 | Why the build has this shape                    |
| [Modules](#modules)                                   | What each file of `build/` is responsible for   |
| [Configuration](#configuration)                       | `chassis.build` and the command line            |
| [Consumer contract](#consumer-contract)               | What the sites read. It holds through 0.2.0     |
| [Source contract](#source-contract)                   | What a contributor puts where                   |
| [Output contract](#output-contract)                   | Every path the build writes, for every platform |
| [Checks](#checks)                                     | What tells you that a change is right           |
| [Known oddities](#known-oddities)                     | What looks wrong and is kept on purpose         |

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

## The build in one picture

```
package.json ───────────┐  chassis.build: brands, apps, options
source/<brand>/<layer>/ ┘  the files, images.json and fonts.json
        │
        ▼
config.js            loadConfig     the configuration, checked
plan.js              planJobs       one job per brand, app and platform, with its layers
        │
        ▼ for each job
inventory.js         readInventory  the assets of the job: for each, the file of the last
                                    layer that has it, its size in pixels, and its rule
rules/<platform>.js  files          the files the job writes: path, source and step
plan.js              planFiles      every file once, and inside the folder of the job
        │
        ▼
pipeline.js          runJob         copies a file, or runs its step, through the cache
  steps/                            raster, svg, vector drawable, font
  writers/                          the stylesheet, the catalog, the Swift package
manifest.js          writeManifest  chassis-assets.json
```

`node build/cli.js build --dry-run` prints the jobs and the files each would write. It
reads `source/`, loads no image or font tool and writes nothing.

### Where the build is

| Part                                                | State                                                                  |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| `config.js`, `plan.js`, `inventory.js`, `names.js`  | Built in session 2.1. The inventory reads no manifest yet              |
| `pipeline.js`, `cache.js`, `manifest.js`            | Built in session 2.1. No step exists, so every file is a copy          |
| `index.js`, `cli.js`, `logger.js`                   | Built in session 2.1, with `build()`, `plan()` and the command `build` |
| `rules/`                                            | Built in session 2.1 for the layout of 0.1.8, with `rules/legacy.js`   |
| `manifests/`, `lint.js`, the source layout          | Session 2.2                                                            |
| `steps/`, `writers/`                                | Sessions 2.3 to 2.5                                                    |
| `verify.js`, `diff.js`, `analyze.js`, `contract.js` | Session 2.6                                                            |

## Design decisions

### A job is planned before it is written

The build first computes the list of the files of a job: for each, its path in the output,
the source file it comes from, and the step that makes it. Only then does it write. So:

- `--dry-run` prints what a build would write, file by file.
- Two assets that would get one path fail the job before a file is written, with both
  source paths in the message. In 0.1.8 a collision was a warning after the second file had
  replaced the first. Two paths that differ by case only count as one path: they are one
  file on macOS and Windows, and two on Linux.
- The size in pixels of every variant is known from the plan, so the output manifest does
  not read the files again.
- A test compares a plan with an expected list. It needs no image tool and writes no file.

### The rules of a platform are pure functions

`rules/web.js`, `rules/android.js` and `rules/ios.js` each export the same three functions.
They take data and return data: no file system, no tool, no state between calls.

| Function              | Returns                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `include(asset, job)` | Whether the platform takes the asset                                          |
| `files(asset, job)`   | The files of one asset: the master, its variants, or its native form          |
| `extras(assets, job)` | The files that come from all assets: the stylesheet, the catalog, the package |

A rule that is wrong shows in a unit test of a few lines, with an asset written in the test.

### Only the steps know the tools

A step turns the bytes of one source file into the bytes of one output file. The modules
in `steps/` are the only ones that import `sharp`, `svgo`, `svg2vectordrawable` and the
font tools, and each imports its tool when it first runs. So:

- A job without fonts does not load a font tool. `lint`, `--dry-run` and `--help` load none.
- A tool is replaced in one module.
- The version of the tool is part of the key of the cache, and it is read in one place.

The inventory reads the size of an image with `image-size`, which is JavaScript only, so
that the source lint runs where `sharp` has no binary.

### Deriving always runs, optimizing is an option

See [Derivation and optimization](#derivation-and-optimization) of the output contract.
The configuration and the command line turn the optimization on. Nothing turns the
derivation off.

### A job owns its folder

A job writes into `<out>/<platform>/<app>/<brand>/` and nowhere else. Before it writes
its files, it removes every other file of that folder, and afterwards the folders that are
left empty. So the folder holds what the plan lists, after a full build and after a build
of one job, and there is no `--clean`. In 0.1.8 a build of one job kept the files of the
build before it.

The removal comes first because of the file systems that do not tell `A.png` from `a.png`:
a file that is left under another case would give its name to the file that replaces it.
macOS writes `.DS_Store` into a folder that the Finder shows. A job removes those of its
folder too.

### The cache is keyed by content

A step that ran is not run again. The key of a cached file is the hash of three things: the
bytes of the source file, the name and the parameters of the step, and the version of the
tool. The cache is in `.cache/assets/`, which Git ignores. Deleting it changes nothing but
the time of the next build. A copied file does not go through the cache.

### The output manifest is the reference

`dist/` is not committed: it is large, and most of it is stored with Git LFS. What is
committed is one [output manifest](#the-output-manifest) per job, in
`test/golden/<platform>/<app>-<brand>.json`. `verify` builds into a scratch folder and
compares the manifests. A change to a rule that changes the output fails until the golden
files are written again, and the pull request shows which paths and hashes changed.

`diff` reads the golden files of two commits from Git. It needs no build.

### The consumer contract is data

`contract.js` lists the files of [the consumer contract](#consumer-contract) as patterns.
`verify` fails when the manifest of `docs` and `chassis` on `web` lacks one of them. A
change to the source or to a rule that takes a file from the sites fails here, before it
reaches `app/docs`.

### The library never exits

`index.js` exports `build()`, `plan()`, `lint()`, `verify()`, `diff()` and `analyze()`.
Each takes its options as an argument and returns a report. None reads `process.argv`,
changes the working directory, reads a file when it is imported, or calls
`process.exit()`. `cli.js` is the only module that does: it parses the arguments, calls the
library, prints the report and sets the exit code.

An error that a contributor can fix is a `BuildError`, with the `file` it is about and the
`rule` or the step that found it. `cli.js` prints these without a stack trace.

A wrong configuration or a wrong filter fails the call. A job that fails does not: its
report has the error, and the other jobs are built. `build()` tells through `onJobStart`
and `onJobEnd` what it does, and prints nothing.

### A file that is not what it says fails the build

A checkout without Git LFS has a pointer of three lines in the place of every font and
every raster image. The inventory and the pipeline know a pointer by its first line, and
fail with the name of the file and the command to run, `git lfs pull`. In 0.1.8 the
pointers were copied to `dist/`.

### JavaScript, checked as TypeScript

The build is JavaScript with JSDoc types, as the build of `@chassis-ui/tokens`, and
`tsc` checks it with `checkJs`. The types of the data that moves between the modules are in
`types.js`. Every file has the license header of the tokens build.

## Modules

Every path is relative to `build/`.

| Module                 | Responsible for                                                                                                                                                                                 | Pure |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `cli.js`               | The commands and their options, the help, the exit code                                                                                                                                         | no   |
| `index.js`             | The library: one function per command                                                                                                                                                           | no   |
| `config.js`            | Reads `chassis.build` or the file of `--config`, checks it, names the key that is wrong                                                                                                         | no   |
| `plan.js`              | `planJobs`: the jobs and their layers, from the configuration and the filters. `planFiles`: the files of a job, from its inventory and the rules of its platform, with the check for collisions | yes  |
| `inventory.js`         | Walks the layers of a job, reads the manifests and the sizes, and returns the assets. The reading is passed in, so a test gives it a tree in memory                                             | no   |
| `names.js`             | Takes a file name apart: name, size, density, extension. Builds the names of the variants and the native names                                                                                  | yes  |
| `manifests/images.js`  | Checks `images.json`, and returns the rule of an image from the rules that match it                                                                                                             | yes  |
| `manifests/fonts.js`   | Checks `fonts.json`, and returns the families with their faces                                                                                                                                  | yes  |
| `rules/web.js`         | The files of the web output                                                                                                                                                                     | yes  |
| `rules/android.js`     | The files of the `res/` tree                                                                                                                                                                    | yes  |
| `rules/ios.js`         | The files of the Swift package                                                                                                                                                                  | yes  |
| `writers/font-face.js` | The text of `fonts.css`                                                                                                                                                                         | yes  |
| `writers/android.js`   | The text of `res/font/<id>.xml`                                                                                                                                                                 | yes  |
| `writers/ios.js`       | The text of every `Contents.json`, of `Package.swift`, `ChassisAssets.swift` and `Fonts.plist`                                                                                                  | yes  |
| `steps/raster.js`      | Resizes and encodes a raster image, and renders an SVG file, with `sharp`                                                                                                                       | no   |
| `steps/svg.js`         | Cleans an SVG file with `svgo`                                                                                                                                                                  | no   |
| `steps/drawable.js`    | Converts an SVG file to a vector drawable with `svg2vectordrawable`                                                                                                                             | no   |
| `steps/font.js`        | Converts a font to WOFF2, and subsets it                                                                                                                                                        | no   |
| `pipeline.js`          | Runs the files of a job, a bounded number at a time, and removes what the job did not write                                                                                                     | no   |
| `cache.js`             | Computes the key of a step, reads and writes `.cache/assets/`                                                                                                                                   | no   |
| `manifest.js`          | Builds the output manifest from the plan and the written files, reads one, compares two                                                                                                         | no   |
| `contract.js`          | The files of the consumer contract, as patterns                                                                                                                                                 | yes  |
| `lint.js`              | The rules of the source lint: each a function from the inventory to a list of problems                                                                                                          | yes  |
| `verify.js`            | Builds into a scratch folder, and compares with the golden files and the contract                                                                                                               | no   |
| `diff.js`              | Compares the golden files of two commits, and writes the report as Markdown                                                                                                                     | no   |
| `analyze.js`           | Reports the sizes by type, the largest files, and the files with the same content                                                                                                               | no   |
| `logger.js`            | The output of the command line, in the pattern of the tokens build, with `--quiet`                                                                                                              | no   |
| `errors.js`            | `BuildError`, the error that names its file and its rule                                                                                                                                        | yes  |
| `concurrency.js`       | `mapLimit`: runs a function over a list, a bounded number of calls at a time                                                                                                                    | yes  |
| `types.js`             | The JSDoc types of the data below                                                                                                                                                               | yes  |

`rules/index.js` holds the rules by the name of their platform. `rules/legacy.js` holds the
names and the folders of 0.1.8, and goes with them: the names of the web in session 2.2,
the layout of the native outputs in session 2.5.

A pure module imports only pure modules. `plan.js`, `names.js`, the manifests, the rules, the
writers, `contract.js` and `lint.js` import nothing from Node.js but `node:path`, whose
`posix` functions they use, so that a plan is the same on every operating system. For the
same reason a list is sorted by code units, not by the rules of a language.

The inventory reads through a `SourceReader` with three functions: `list` gives the
entries of a folder, `size` the size of an image in pixels, and `read` the content of a
file. `fsReader` is the one of the file system. A test passes one that reads a tree in
memory.

### The data between the modules

| Type          | Holds                                                                                                            | Made by        |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | -------------- |
| `Config`      | `brands`, `apps`, `options`                                                                                      | `config.js`    |
| `Job`         | `brand`, `app`, `platform`, `layers` in override order, `out`, the folder of the job, and `optimize`             | `planJobs`     |
| `SourceFile`  | `path`, `layer`, `type`, `folder`, `name`, `density`, `extension`, `bytes`, and `width` and `height` of an image | `inventory.js` |
| `Asset`       | `type`, `id`, the `files` of the layer that won, and the `rule` of an image or the `family` of a font            | `inventory.js` |
| `PlannedFile` | `path` in the folder of the job, `type`, `source`, `step` with its parameters or `text`, and the size in pixels  | the rules      |
| `Report`      | Per job: the files written, taken from the cache and removed, the bytes, the time, and the errors                | `pipeline.js`  |

A `PlannedFile` without a step and without text is a copy.

A step is known to the pipeline by its name. What runs it is a `StepRunner`: `version`
gives the version of its tool, for the key of the cache, and `run` turns the bytes of the
source file into those of the output.

### What stays from 0.1.8

`html-validate.js` and `vnu-jar.js` check the documentation site, and `change-version.js`
changes the version. They are not part of the asset build, and the rewrite leaves them
alone: sessions 3.2 and 5.1 of the roadmap replace them.

`build-assets.js`, `processors/`, `asset-types.js`, `api/`, `analyze-assets.js` and
`validate-assets.js` stay next to the new modules until session 2.6, which deletes them
with `build-site.js`, which no script calls. Since session 2.1 no script of `package.json`
builds with them: `pnpm assets:analyze`, `pnpm assets:validate`, the three old test suites
and `pnpm assets:compare` are what still runs them.

## Configuration

`chassis.build` in `package.json`, or the JSON file of `--config`:

| Key       | Value in 0.2.0                                 | Meaning                                                                |
| --------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| `brands`  | `chassis`, `example`                           | The brands to build. `default` is the first layer of each, not a brand |
| `apps`    | `docs`: `web`; `demo`: `web`, `ios`, `android` | The apps, each with its platforms                                      |
| `options` | none                                           | Options by platform name                                               |

```json
"chassis": {
  "build": {
    "brands": ["chassis", "example"],
    "apps": { "docs": ["web"], "demo": ["web", "ios", "android"] },
    "options": { "web": { "optimize": ["images", "svg"] } }
  }
}
```

| Option     | Platforms | Value                                                     | Without it |
| ---------- | --------- | --------------------------------------------------------- | ---------- |
| `optimize` | all       | `true`, `false`, or a list of `images`, `svg` and `fonts` | `false`    |

`loadConfig` fails, and names the key, when `brands` or `apps` is missing or empty, when an
app is named `shared`, when a brand is named `default`, when a platform is not `web`, `ios`
or `android`, when `options` names a platform that no app uses, and when
`source/default/<app>/` does not exist for an app.

`chassis.defaults.brandFolder` of 0.1.8 is gone. The first layer is `source/default/`.

### The command line

```
node build/cli.js <command> [options]
```

The command line has the command `build` today. The others come with their modules, in
sessions 2.2 and 2.6 of the roadmap.

| Command   | Does                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| `build`   | Builds the jobs                                                              |
| `lint`    | Checks `source/` against [the source contract](#what-the-source-lint-checks) |
| `verify`  | Builds into a scratch folder and compares with the golden files              |
| `diff`    | Reports what changed in the output between two commits                       |
| `analyze` | Reports sizes, the largest files and the files with the same content         |

| Option                           | Commands                     | Meaning                                                     |
| -------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `--brand`, `--app`, `--platform` | `build`, `verify`, `analyze` | The jobs to take. Without one, every job                    |
| `--out <dir>`                    | `build`, `verify`            | The root of the output. `dist` for `build`                  |
| `--config <file>`                | all                          | A JSON file to read the configuration from                  |
| `--optimize`, `--no-optimize`    | `build`                      | Turns the optimization on or off for every job of the build |
| `--dry-run`                      | `build`                      | Prints the jobs and their files, and writes nothing         |
| `--update`                       | `verify`                     | Writes the golden files from the build                      |
| `--base <ref>`, `--head <ref>`   | `diff`                       | The commits to compare. `main` and the working tree         |
| `--quiet`                        | all                          | Prints errors only                                          |
| `--help`, `--version`            | all                          | Prints the help or the version                              |

A filter takes one or more values, in three spellings: `--brand chassis example`,
`--brand chassis --brand example` and `--brand chassis,example`. A value that the
configuration does not have fails, with the values it has. So do filters that select no
job.

The command comes first, since a word after the values of a filter is one more value. An
option that the command line does not know fails, and `--clean` and `--no-clean` fail with
what replaced them. The `--` that pnpm passes on from `pnpm assets -- --quiet` is left out.

The scripts of `package.json` call the command line. `pnpm assets:site` is
`build --brand chassis --app docs`, with the optimization off: it is the build of the
sites.

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
light and a dark screenshot that are the same picture stay two files, and so do two
screenshots of one folder that show the same state under two names: the pages of the Figma
documentation read each by its name.

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
| No duplicate       | Two files of one folder have the same content, and no rule says `committed`               |
| Reserved names     | A folder of `source/` is not `default` or a configured brand, or an app is named `shared` |

Two files in different folders can have the same content: the logos of two apps did in
0.1.8. The exports under a `committed` rule can have it in one folder too.

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

The golden files in `test/golden/` are these manifests, without `package`.

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

## Checks

`pnpm assets:lint`, `pnpm assets:typecheck` and `pnpm assets:test:unit` exist since
session 2.1 of the roadmap. The others come with sessions 2.2, 2.5 and 2.6.

| Command                      | Checks                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm assets:lint:source`    | `source/` and the manifests, against [the rules of the source contract](#what-the-source-lint-checks)                           |
| `pnpm assets:lint`           | ESLint on `build/` and `test/`                                                                                                  |
| `pnpm assets:typecheck`      | TypeScript `checkJs` on `build/`                                                                                                |
| `pnpm assets:test:unit`      | Vitest, in `test/unit/`, on source trees that the tests write. No test reads `source/`, and the tests run in under ten seconds  |
| `pnpm assets:verify`         | A fresh build gives the manifests of `test/golden/`, and the docs output holds every file of the consumer contract              |
| `pnpm assets:diff`           | Not a check: the paths added, removed, renamed and changed in each job against another commit. CI writes it to the pull request |
| `pnpm assets:analyze`        | Not a check: the sizes by type and job, the largest files, and the files with the same content                                  |
| `pnpm assets:native:ios`     | The asset catalogs with `actool`, and a sample that uses a Swift package of the output (needs Xcode)                            |
| `pnpm assets:native:android` | The `res/` trees with `aapt2`, in a Gradle library (needs a JDK and the Android SDK)                                            |

Until session 2.6 deletes the build of 0.1.8, `pnpm assets:test` also runs its three test
suites. Until session 2.2 moves the source, `pnpm assets:compare` runs both builds into a
scratch folder and fails when a file of a job differs: the new build writes the files of
0.1.8, byte for byte, and `chassis-assets.json`.

### What `verify` compares

| Of a file                           | Compared                                                 |
| ----------------------------------- | -------------------------------------------------------- |
| `path`, `type`, `source`            | Always                                                   |
| `width`, `height`, `density`        | Always                                                   |
| `bytes`, `sha256` of a copy         | Always                                                   |
| `bytes`, `sha256` of a derived file | On the operating system of CI. Elsewhere with `--strict` |

An encoder can write other bytes on another operating system. Session 2.3 of the roadmap
measures it. If the bytes are the same on Linux and macOS, `verify` compares them
everywhere and `--strict` goes.

A renamed file is a removed and an added path with one hash. `diff` reports it as a rename.

## Known oddities

They are part of the contracts and kept on purpose. Don't fix one without saying in the
changelog what breaks.

- **The docs output holds the screenshots of one site.** `images/figma/` is about 45 of the 57 MB
  of the docs output of 0.2.0, and only the site of `chassis-figma` reads it. The consumer
  contract names the path, so it stays until the sites can build a job of their own. See W8
  of the roadmap.
- **The screenshots are committed at two densities.** Every other raster image has one
  master. See [Committed variants](#committed-variants).
- **Many screenshots are the same file.** 210 of the 1592 light and dark pairs are, and 323
  groups of files in one folder: a component that looks the same in both modes, and a state
  that is exported under two names. The pages read each file by its name, so every file
  stays, and the lint does not report them.
- **`chassis` has no folder.** The brand is `source/default/` alone. The folder `default` is
  not a brand, and no job builds it under that name.
- **A native name repeats its folder.** `images/logo/chassis-logo-brand.svg` is
  `logo_chassis_logo_brand`. The name comes from the path, so that two images of one name
  in two folders stay two resources. The rule `name` of the image manifest shortens one.
- **A font file is named by its role.** `text-strong.otf` is Inter Semi Bold in the default
  brand. The family name is in `fonts.json`, and the name in the font file is not changed.
- **`icons/cx-sprite.svg` is served next to another package's files.** A site copies the
  icons of `@chassis-ui/icons` to `/static/icons/` after the assets. A file of that package
  with this name would replace it.
- **The PNG files of the home images are written though the website reads WebP.** The site
  of `chassis-tokens` reads the PNG files of the gallery. The others have no reader today,
  and are written as 0.1.8 wrote them.
- **The output manifest is served by the sites.** They copy the folder of the job as it is,
  so `/static/chassis-assets.json` is public. It holds paths of this repository and
  nothing else.
- **The demo app builds for the web.** No site reads `dist/web/demo/`. It is there so that
  the fonts have a web output. See D8 of the roadmap.

## History

The build of 0.1.8 copied `source/` to `dist/` and renamed the copies. It derived nothing,
and every variant of an image was made by hand and committed. It was reviewed on
2026-09-29, and the rewrite follows `ref/ROADMAP.md`: the scope and the contracts in
session 1.1, this document in session 1.2, the build in Phase 2. The findings behind every
decision are in the roadmap, as F1 to F38, and the decisions as D1 to D13.

The shape of the build, a plan, pure rules, a pipeline and a check against a committed
reference, is that of the build of `@chassis-ui/tokens`, rewritten in 2026.
