# Documentation Style Guide

How to write the asset type, guide and platform docs of chassis-assets. This guide sets the conventions for the docs site (`packages/site/content/docs/**/*.mdx`) so contributors and reviewers have one place to reference. It follows the language and voice of the [chassis-tokens guide](https://github.com/chassis-ui/tokens/blob/main/WRITING.md), adapted to design assets.

**The guide is the reference, not the existing pages.** Most pages predate it and break several of its rules. Don't copy a convention from a page because the page does it; check it here. Migrate a page when editing it, and don't gate unrelated PRs on the migration.

**The pages are the specification of the build.** A page that says what the build does is a promise: when the build does less, the build is fixed, and when the page describes something the build never did, the page is corrected. See the principles of [ref/ROADMAP.md](ref/ROADMAP.md#principles).

## How this guide is organized

- **Language (§1–6)** — voice, tone, vocabulary, file names and code references in prose.
- **Accuracy (§7–8)** — names and paths that must exist, what stays out, counts, versions and configuration.
- **Structure (§9–13)** — frontmatter, section order per doc type, headings, the closing platform section.
- **Components and conventions (§14–17)** — tables and trees, callouts, troubleshooting entries, cross-references.
- **Code blocks and doc length (§18–21)** — language tags, output vs hand-written code, when to split a doc.
- **Lint checklist** — what to verify before opening a PR.
- **Appendix A** — MDX component reference.

The language and accuracy rules also apply to the repository docs (`README.md`, `.github/CONTRIBUTING.md`, `docs/`) and to changeset entries. The structure rules are for site pages only.

---

## Language

### 1. Voice by doc type

The right prose voice depends on the doc category. There are two conventions, and mixing them in the wrong context produces prose that either feels like a marketing page or sounds robotic.

| Doc type                                  | Voice       | Second-person `you/your` | First-person `we/our` |
| ----------------------------------------- | ----------- | ------------------------ | --------------------- |
| Asset types (`asset-types/*.mdx`)         | Instructive | ✗ Avoid                  | ✗ Avoid               |
| Getting Started (`getting-started/*.mdx`) | Tutorial    | ✓ Appropriate            | ✗ Avoid               |
| Use in Project (`use-in-project/*.mdx`)   | Tutorial    | ✓ Appropriate            | ✗ Avoid               |

---

**Instructive voice** (asset type docs) avoids `you`, `your`, `yours`, `we`, `our`, `ours`, and `us` in prose — the reader is consulting these docs to find where a file goes and what the build does with it, not following a guided procedure. Removing the narrator keeps prose focused on the files and reads as reference documentation rather than marketing copy.

**Good:** "Put a font under `fonts/` of the app. The build copies the WOFF and WOFF2 files to the web output, and the TTF and OTF files to iOS and Android."

**Bad:** "You can put your fonts under `fonts/`. We copy our web fonts for you."

**Imperative vs descriptive.** Both are correct instructive voice: imperative ("Put a font under `fonts/`") for what the reader does; descriptive ("The build copies the WOFF files") for what the build does. A typical paragraph mixes both.

**Exceptions:** direct quotes keep their original voice; callouts may use imperative voice as direct guidance; code comments and command output aren't prose and are unaffected.

---

**Tutorial voice** (getting-started and use-in-project docs) allows second-person "you"/"your" — they read naturally in a step-by-step guide where the reader clones the repository, runs a build, or copies files into an app. Reference sections inside a guide (a table of options, a list of checks) still read better without a pronoun.

**Good:** "If you build the assets from your own fork, use the URL of your repository in place of this one."

**Bad (still avoid even in tutorial docs):** "We've now built the assets. Our next step is to copy them to the app."

**First-person plural is discouraged across all doc types.** "We"/"us"/"our" imply a narrator who is neither the project nor the reader — there's always a clearer alternative ("the previous step" instead of "what we built"). Universal imperative steps ("Run the build") don't need a pronoun at all.

### 2. Every heading earns its paragraph

Every `##`, `###`, and `####` heading must be followed by at least one explanatory sentence before any code example, table, bullet list, or sub-heading, naming what the section is about and why it matters — a bare heading followed by a tree tells readers _what_ exists but not _when to reach for it_.

**Floor:** one full sentence is enough — don't pad.

**Exception:** `## Best practices`, `## Troubleshooting`, and `## Next steps` may go directly into their entries. Their names say what follows, and a sentence there is filler.

**Good:**

````mdx
## Source layout

Images live under `images/` of an app, in any subfolders. The build keeps the subfolders in the output of every platform.

```text
source/default/docs/images/
├── site-logo.svg
└── logo/
```
````

**Bad:**

````mdx
## Source layout

```text
source/default/docs/images/
├── site-logo.svg
└── logo/
```
````

**Anti-pattern: container phrases.** Intro sentences starting with "The following…" or "Below is…" announce content without describing it — state what the content does instead. **Bad:** "The following tree shows the web output." **Good:** "The web output keeps every file under `icons/`, with kebab-case names." Exception: a colon-terminated sentence introducing a bullet list is fine, since the colon signals enumeration rather than vague pointing.

**Anti-pattern: label paragraphs.** A bold label on its own line (`**How it works:**`, `**Benefits:**`, `**Example:**`) is a heading in disguise. Promote it to a real heading with an intro sentence, or fold it into the paragraph.

### 3. Describe behavior, not benefits

Documentation explains where a file goes and what the build writes; it does not sell the system. Skip adjectives like "comprehensive", "powerful", "seamless", "intelligent", "production-ready" — state the behavior and let it demonstrate the value.

**Good:** "A file under `source/<brand>/<app>/` replaces the default file of the same path, so a brand holds only the files that differ."

**Bad:** "Our powerful override architecture enables seamless brand customization with minimal duplication."

**Exception:** the frontmatter `description` field may include a light positioning phrase (it's the SEO meta description) under 160 characters and free of superlatives. **Use-case lists are permitted** — "for logos, illustrations and screenshots" names concrete use cases rather than qualitative adjectives.

**Generic advice is not documentation.** A guideline that would be true of any asset pipeline ("optimize your images", "use consistent naming") says nothing about Chassis Assets. Keep a guideline only when it names a folder, a format, a rule of the build or a command.

### 4. Active voice over passive where natural

Prefer active voice, with the actor named: the build, the processor, the platform, the designer. Passive is acceptable when the subject is genuinely unknown or unimportant.

**Good:** "The build removes the indicator from the name and writes the file to `drawable-xhdpi/`."

**Bad (when avoidable):** "The indicator is removed and the file is written to the density folder that is used for it."

### 5. Vocabulary

The project has one word for each concept. Using a synonym makes the reader wonder whether it's a second concept.

| Use           | For                                                                                       | Not                                          |
| ------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| brand         | A name of `chassis.build.brands`, and its folder in `source/`                             | product, tenant, theme                       |
| default brand | The fallback folder of `source/`, `default` unless `chassis.defaults.brandFolder` says so | base, shared, common                         |
| app           | A key of `chassis.build.apps`, and its folder under a brand                               | project, application (except in page titles) |
| type          | A folder under an app: `fonts`, `images`, `icons`, or any other name                      | category, kind                               |
| platform      | A build target: `web`, `ios`, `android`                                                   | target, output format                        |
| job           | One brand, one app and one platform: the folder `dist/<platform>/<app>/<brand>/`          | combination, build, target                   |
| source        | The files under `source/`                                                                 | input, originals                             |
| output        | The files under `dist/`                                                                   | distribution (except in the name of a check) |
| variant       | A file exported at another resolution, `@2x` or `@3x`                                     | version, size                                |
| indicator     | The `@2x` or `@3x` at the end of a name                                                   | suffix, scale                                |
| density       | An Android density folder, `drawable-xhdpi/`                                              | resolution, bucket                           |
| override      | A brand file that replaces the default file of the same path                              | overwrite, customization                     |
| processor     | The module of a platform in `packages/assets/build/processors/`                           | plugin, transformer                          |
| the build     | The build in `packages/assets/build/`, `pnpm assets`                                      | the pipeline, the generator, the script      |
| consumer      | A site or an app that reads the output                                                    | client, user                                 |
| contract      | The files a consumer reads by name, in `chassis.checks.json`                              | manifest, requirements                       |

**The build copies.** It copies, renames and sorts files into folders. It does not convert, resize, optimize or generate anything, so don't use those words for it. An image has the variants the designer exported.

**Any folder is a type.** `fonts`, `images` and `icons` have rules of their own; any other folder under an app is copied as it is. Write "any other folder", and present names such as `videos/` as examples, not as types.

**Owned and customized.** Chassis Assets is meant to be owned by the team that adopts it. Don't present the committed brands and apps (`chassis`, `example`, `docs`, `demo`) as the only ones; see [§8](#8-counts-versions-and-configuration).

Product names keep their spelling: Chassis Assets, Chassis Tokens, Chassis Icons, Chassis CSS, Figma, Git LFS, Node.js, npm, pnpm, Xcode, Android Studio, SwiftUI, UIKit, Jetpack Compose. Formats are uppercase in prose (WOFF2, TTF, SVG, PNG, WebP) and an extension in code (`.woff2`).

Write in American English (`color`, `behavior`, `customize`), which is the spelling of the other Chassis docs.

### 6. File names and code references in prose

Backtick every code reference. A file has one name in `source/` and one per platform; which one to write depends on what the sentence is about.

| Referring to           | Form                                  | Example                                          |
| ---------------------- | ------------------------------------- | ------------------------------------------------ |
| A source file          | Path from `source/`, or from the app  | `` `source/default/docs/images/site-logo.svg` `` |
| A web output file      | kebab-case, indicator kept            | `` `images/hero-banner@2x.png` ``                |
| An iOS output file     | snake_case, indicator kept            | `` `images/hero_banner@2x.png` ``                |
| An Android output file | snake_case, in its density folder     | `` `images/drawable-xhdpi/hero_banner.png` ``    |
| An Android icon        | snake_case with the `ic_` prefix      | `` `icons/svgs/ic_arrow_right_solid.svg` ``      |
| A folder               | With a trailing slash                 | `` `fonts/` ``, `` `dist/web/docs/chassis/` ``   |
| A group of files       | A pattern with `*`                    | `` `images/home/comp-gallery-*` ``               |
| A format               | Uppercase in prose, extension in code | WOFF2, `` `.woff2` ``                            |

Don't use the name of one platform where another is meant — `hero-banner.png` doesn't exist for an Android developer.

**Placeholders** go in angle brackets, lowercase: `` `dist/<platform>/<app>/<brand>/` ``, `` `source/<brand>/<app>/<type>/` ``. Don't use square brackets for placeholders.

**Other references:** file paths relative to the repository root (`` `packages/assets/build/cli.js` ``); commands in full (`` `pnpm assets --platform ios` ``); configuration keys as a path (`` `chassis.build.apps` ``). Interface labels of Figma, Xcode and Android Studio are bold, not code: **File → Add Files to…**.

---

## Accuracy

### 7. Names are facts, files are examples

Chassis Assets is a multi-brand, multi-platform repository that its adopters own and customize. The layout of `source/` and `dist/`, the naming rules, the formats each platform gets and the commands are its structure. The files are not: a logo, a font family or a screenshot belongs to one brand, changes with the next release, and is different in the fork of an adopter. Document the structure, and use the files as examples.

**Names must exist.** Every path, file name, command and option in a doc must exist in `source/`, in the output of a build, or in the build as written. Don't write a file name from memory, and don't invent a flag — a reader will run it. Before adding a name, find it:

```bash
pnpm assets --help
pnpm assets --dry-run
find dist/android/demo/chassis -name 'ic_arrow_right_solid*'
```

**Trees are copied from a build.** A tree of `dist/` shows files that a build wrote, with the names and folders it wrote them in. Shorten a tree by leaving lines out and ending a folder with `└── ...`, never by editing a name. Check an output name by building: the web name of `HeroBanner@2x.png` is whatever `pnpm assets` writes, not what the rule suggests.

**A statement about the build is checked by running it.** "A filtered build keeps `dist/`", "the build fails on a Git LFS pointer": run the command, read what it prints, then write the sentence. When the page and the build disagree, see the principles of the roadmap for which one changes.

**What stays out of prose and tables:**

- **Font families.** The font files are named by role: `text`, `display`, `code`. Which family a role holds is the choice of the brand. Write "the text font of the brand", not the family.
- **File sizes and counts.** They change with every export. See [§8](#8-counts-versions-and-configuration).
- **Features the build does not have.** The build does not convert SVG to vector drawables, write an asset catalog, or optimize images. A page says what an app does with the files instead, and names the tool of the platform.

**Platform code is checked on the platform.** A Swift, Kotlin or Gradle sample that was not run on its platform says so: the page carries the `created-by-ai` callout until its samples have been run ([§15](#15-callouts)).

### 8. Counts, versions, and configuration

A doc that states a number makes a promise the next commit can break. Don't count files, icons, tests or checks ("488 icons", "39 tests", "eight checks"); name the things or their pattern instead.

**Versions.** Write "Node.js 22.12 or later", not "the latest Node.js", and "the version named by `packageManager`" for pnpm. For the version of Chassis Assets, use the `[[config:current_version]]` token ([§17](#17-cross-references)) instead of a number typed by hand. In a CI example, use the current major version of each action.

**Configuration.** The brands and apps in the `chassis` block of `package.json` are the committed configuration, not the system. Name them as such ("the configured web app is `docs`"), and use them in examples, not in definitions, so an adopter with another configuration can follow. The same goes for `chassis.checks.json`: its contracts are those of the Chassis sites.

**Planned features.** A feature the build does not have is named as planned, in one place, and nowhere described as if the build had it. The optional features are Phase 6 of [ref/ROADMAP.md](ref/ROADMAP.md).

**The output contract is in [docs/architecture.md](docs/architecture.md#output-contract).** A site page that describes what the build writes must agree with it. When they disagree, run the build, then fix the one that is wrong.

---

## Structure

### 9. Frontmatter

Every doc starts with YAML frontmatter. Required fields:

```yaml
---
title: Fonts
description: One-sentence summary, under 160 characters.
toc: true
---
```

Optional fields and their accepted values:

| Field      | Values                                     | Effect                                                                               |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `added`    | `version` (string), `show_badge` (boolean) | Marks the version that introduced the page's subject.                                |
| `aliases`  | A path or a list of paths                  | Redirects old URLs to the page.                                                      |
| `sections` | List of `{title, description, slug}`       | Renders the cards of an index page. Used by `getting-started/introduction.mdx` only. |

`description` follows the body rules for behavior over benefits — see [§3](#3-describe-behavior-not-benefits). Start with what the page covers, not with "Comprehensive guide to" or "Learn how to".

**Titles.** Page titles are in title case. `packages/site/data/sidebar.yml` finds a page by the slug of its sidebar title: the entry `Quick Start` loads `quick-start.mdx`. A new page needs a sidebar entry whose slug is its file name. Platform pages are named `<Platform> Applications`.

### 10. Standard section order

Each doc type has a section order. Skip sections that don't apply; don't reorder them.

**Asset type docs** (`asset-types/*.mdx`) follow a file from the design tool to the output:

```text
## Introduction              (what the type holds and which platforms get it)
## Source layout             (where the files go under source/, as a tree)
## Formats                   (the formats of the type, and which platform keeps which)
## Naming                    (the rules of the type, and what each platform renames)
## Adding files              (exporting from the design tool, variants, licenses)
## Integration               (Chassis Icons, Chassis Tokens: where the type meets another project)
## Best practices
## Platform output           (always last)
```

**Platform docs** (`use-in-project/*.mdx`) follow the order in which a developer meets the files. The three platform docs share this order, so a section added to one usually belongs in all three:

```text
## Introduction              (what the platform gets: formats, naming, one short tree)
## Installation              (a release archive, a submodule, or a build from a clone)
## Output layout             (the folders of dist/<platform>/<app>/<brand>/, as a tree)
## Fonts
## Images
## Icons
## Other assets
## Brand switching
## Continuous integration
## Best practices
## Troubleshooting           (see §16)
## Next steps                (always last)
```

**Guides** (`getting-started/*.mdx`) use a looser structure but still lead with an intro paragraph under `## Introduction`, list requirements under `## Prerequisites`, order their sections as the reader performs them, and close with `## Troubleshooting` and `## Next steps`.

**Canonical section names.** Older docs use variants like "Overview", "File Organization", "Distribution Structure", "Package Structure" and "Related Resources" — going forward, **use `## Introduction`, `## Source layout`, `## Platform output`, `## Output layout` and `## Next steps`**.

### 11. Heading hierarchy

Don't skip levels. `##` → `###` → `####`, never `##` → `####`. Use `####` sparingly — three levels of nesting usually signals a section that wants to be promoted to its own `###` or split into a sibling page.

### 12. Heading length, case, and punctuation

**Length.** Keep `##` and `###` headings under **~25 characters** — the ToC sidebar is ~200px wide and longer titles wrap, which makes it hard to scan. **Good:** `Source layout`, `Density folders`, `Brand switching`. **Bad:** `Platform-specific processing and transformations` — shorten and push the longer phrasing into the intro paragraph.

**Sentence case, no trailing punctuation.** Capitalize only the first word and proper nouns (`### Density folders`, not `### Density Folders`; `### Git LFS` stays); no `.`, `:`, `?`, or `!` at the end. Write "and", not `&`. Fix title-case slips opportunistically.

**Code in headings.** A heading that names code keeps the code's spelling without backticks (`### chassis.build`, `### lint.allow`), so the anchor stays readable. Don't put a file name in a heading; name the group ("Font stylesheets") and list the files in the tree.

### 13. The `## Platform output` section

An asset type doc closes with a section that shows what each platform gets, so a developer who added a file knows where to find it. It uses a fixed template:

````mdx
## Platform output

One sentence naming what the build does to the type on each platform.

<CxTable>
| Platform | Folder | Name | Formats |
| --- | --- | --- | --- |
| Web | `dist/web/<app>/<brand>/images/` | kebab-case, indicator kept | Every format |
| iOS | `dist/ios/<app>/<brand>/images/` | snake_case, indicator kept | Every format but WebP |
| Android | `dist/android/<app>/<brand>/images/` | snake_case, in density folders | Every format but WebP |
</CxTable>

```text
dist/android/<app>/<brand>/images/
├── drawable/
│   └── hero_banner.png
└── drawable-xhdpi/
    └── hero_banner.png
```

See the [web]([[docsref:/use-in-project/web-applications]]), [iOS]([[docsref:/use-in-project/ios-applications]]), and [Android]([[docsref:/use-in-project/android-applications]]) docs for how an app uses these files.
````

Use one source file of the page as the example, the same on every platform. Add a tree for each platform whose layout the table cannot show, copied from a build ([§7](#7-names-are-facts-files-are-examples)). Add a sentence for each rule the reader would not guess: a format a platform drops, a folder that holds the density, a prefix. Rules that apply to every type belong in the build system page, not here.

---

## Components and conventions

### 14. Tables and trees

Tables are Markdown tables wrapped in `<CxTable>`, which makes them scroll on narrow viewports. A table that maps one thing to another, such as formats to platforms or options to what they do, names its columns after what it maps.

**Option tables** have the option in the first column, in backticks and with its value as a placeholder (`` `--brand <name...>` ``), and what it does in the last, as a phrase without a trailing period. Copy the options from the `--help` of the command.

**Columns that say the same in every row** move into the intro sentence of the table.

**Trees** are `text` blocks drawn with `├──`, `└──` and `│`, with a comment after `->` where a line needs one. A tree of `source/` shows the layout with placeholders or with the files of the default brand; a tree of `dist/` shows what a build wrote ([§7](#7-names-are-facts-files-are-examples)). Keep a tree to the lines that show the layout.

### 15. Callouts

Use `<Callout>` for asides that interrupt the reading flow but are important enough to highlight. Types and intent:

- **`<Callout type="info">`** — helpful but non-essential context: tips, alternatives, a related page.
- **`<Callout type="warning">`** — real gotchas: a format a platform drops, a name the build changes, a file that Git LFS replaces with a pointer.
- **`<Callout type="warning" name="work-in-progress" />`** — named callouts reuse content from `packages/site/content/callouts/`. The status callouts `work-in-progress` and `created-by-ai` go first on the page, before `## Introduction`.

**Good warning:** "A clone made without Git LFS holds pointer files in place of the fonts and the images. The build fails and lists them; run `git lfs pull`."

**Bad warning (this should be prose, not a callout):** "Note that assets can be customized per brand."

**Status callouts are a claim.** Removing `work-in-progress` from a page says that the page was checked against the build line by line. Removing `created-by-ai` says that its samples were run on the platform they are for. Remove a callout in the PR that does the check, not before.

**No `title` attribute.** `<Callout>` has no `title` prop and ignores one. Titles like "Note", "Important", and "Key Concept" add nothing; when a callout needs a lead-in, start its body with a bold phrase.

**No emoji** in headings or prose, and no emoji as a substitute for a callout (`⚠️`). The one exception is `✅` and `❌` as markers of the entries of a `## Best practices` section, each followed by a bold imperative phrase, a colon, and one or two sentences that name a folder, a format or a command.

### 16. Troubleshooting entries

Each entry of `## Troubleshooting` is a `###` heading that names the symptom in a few words, followed by the exact message in backticks, the cause, and the fix in imperative voice.

**Good:**

```mdx
### Font does not load

The browser logs `Failed to decode downloaded font` for a file of `fonts/`. The clone has no Git LFS files, so the font is a pointer of a few lines. Install Git LFS, run `git lfs pull`, and build again.
```

**Bad:**

```mdx
### "Failed to decode downloaded font" Error When Loading Your Fonts

You may run into this error if something is wrong with your setup. Check your files.
```

Quote the message as the tool prints it, so a search for the error finds the page. Keep the heading to the symptom; the full message belongs in the body. Write the variable parts of a message as placeholders in angle brackets. A problem without a message, such as an image that stays blurry, starts with the symptom as the reader sees it.

### 17. Cross-references

**Within Chassis Assets docs.** Use the `[[docsref:/path/to/doc]]` token inside Markdown link syntax — the build resolves it against the configured docs path at compile time, so the link stays correct across deployments. Append a heading slug to link a sub-section:

```mdx
[fonts]([[docsref:/asset-types/fonts]])
[the checks file]([[docsref:/getting-started/build-system#checks-file]])
```

**Within the same doc.** Use plain `#anchor` links — IDs are auto-generated from heading text by slugifying (`### Density folders` becomes `#density-folders`). Don't create two headings with the same slug in a doc, and re-verify anchors after renaming a heading — internal links to the old slug silently break. Migrating a heading to sentence case doesn't change its slug.

**Configuration values.** `[[config:<key>]]` prints a value of `packages/site/config.yml`, in prose, links, and code blocks: `[[config:current_version]]`, `[[config:repo]]`.

**Other Chassis docs.** Use a standard Markdown link to the page on chassis-ui.com. Chassis Icons owns the icons and their font; Chassis Tokens owns the names of the font roles. Link their docs rather than describing them here.

**External references.** Standard Markdown links. Prefer the official docs of Apple, Android, MDN, Git LFS and Figma over blog posts.

**Repository files.** From a site page, link the file on GitHub with `[[config:repo]]`. From a repository doc, use a relative link: `[docs/architecture.md](docs/architecture.md)`.

---

## Code blocks and doc length

### 18. Fenced code language tags

Always tag fenced code blocks with the source language — untagged blocks display without highlighting. Conventions in use:

| Block kind               | Language tag             | Notes                                                   |
| ------------------------ | ------------------------ | ------------------------------------------------------- |
| Shell commands           | ` ```bash `              | Clone, build and copy commands. No `$` prompt.          |
| Configuration            | ` ```json `              | The `chassis` block, `chassis.checks.json`.             |
| Directory trees          | ` ```text `              | Anything that is not code.                              |
| Web usage                | ` ```css ` / ` ```scss ` | `@font-face`, image and icon rules.                     |
| Markup                   | ` ```html `              |                                                         |
| iOS usage                | ` ```swift `             |                                                         |
| Android resources        | ` ```xml `               |                                                         |
| Android usage and Gradle | ` ```kotlin `            | ` ```groovy ` for a Groovy build file.                  |
| JavaScript               | ` ```js `                | The library, bundler configuration.                     |
| CI workflows             | ` ```yaml `              |                                                         |
| MDX/Markdown             | ` ```mdx ` / ` ```md `   | When this guide or a meta-doc shows authoring patterns. |

### 19. Output vs hand-written code

A doc shows two kinds of blocks, and the reader must be able to tell them apart. Introduce each block with a sentence that says which it is: "The build writes…" for output, "Use…" or "Add…" for code the reader writes.

- **Output** is a tree or a file of `dist/`, copied as it is ([§7](#7-names-are-facts-files-are-examples)). It can be partial: show the lines under discussion.
- **Usage code** is standalone: a reader copying it into a project with the files in place should see it work. Use paths and file names that the build writes for the platform.
- **Configuration** shows the key inside its parent, and the intro sentence names the file: "In the `chassis` block of `package.json`:".
- **Commands** are run before they are written. A comment after a command says what it does, not what it should do.

When an option changes the output, show the command, then the output, in that order. Commands run from the repository root unless the sentence before them says otherwise. Prefer working code over comment-only placeholders.

### 20. Inline code vs code blocks

- **Inline backticks** for single identifiers, file names, paths, and short literal values. `` `--platform ios` ``, `` `dist/web/` ``, `` `@2x` ``.
- **Fenced blocks** for anything that spans multiple lines, or for single lines that the reader will copy and run.

If a one-liner is _demonstrating syntax_ rather than something to copy, prefer an inline-code form. If it's _something to run_, prefer a fenced block.

### 21. Document length and splitting

A doc is too long when a `##` section has more than three `###` sub-sections on distinct topics, the doc exceeds ~600 lines of MDX, or the ToC requires scrolling to see all top-level sections. Split along the natural axis: **by concern** (the commands, the configuration and the CI examples of the build become sibling docs) or **by platform**. Sections that are lists are the exception: the entries of `## Troubleshooting` and the options of a command are scanned, not read, so many `###` sub-sections there are fine. Don't split for size alone — a 700-line doc that reads end-to-end beats three 200-line stubs that force the reader to chase context across pages.

---

## Lint checklist

Before opening a PR with a doc change, verify:

- [ ] **Voice check ([§1](#1-voice-by-doc-type)):**
  - _Asset type docs:_ No second-person or first-person plural in prose. Quick check: `grep -niE "\b(you|your|yours|we|our|ours|us)\b" <file>` returns nothing relevant.
  - _Getting-started and use-in-project docs:_ "you/your" are acceptable; confirm "we/us/our" are absent.
- [ ] Every `##`/`###`/`####` heading has an explanatory sentence before the next block ([§2](#2-every-heading-earns-its-paragraph)).
- [ ] No container phrases ("The following…", "Below is…") and no bold label paragraphs ([§2](#2-every-heading-earns-its-paragraph)).
- [ ] No marketing adjectives and no generic advice in prose ([§3](#3-describe-behavior-not-benefits)).
- [ ] Project vocabulary: brand, app, type, platform, job, variant, indicator, density, the build ([§5](#5-vocabulary)).
- [ ] The build copies, renames and sorts; nothing says it converts, optimizes or generates ([§5](#5-vocabulary)).
- [ ] File names use the form of their platform, and placeholders use angle brackets ([§6](#6-file-names-and-code-references-in-prose)).
- [ ] Every path, file name, command and option exists as written, and every tree of `dist/` is copied from a build ([§7](#7-names-are-facts-files-are-examples)).
- [ ] Every statement about what the build does was checked by running it ([§7](#7-names-are-facts-files-are-examples)).
- [ ] No font family names, file sizes or counts, no version typed by hand, and no planned feature described as present ([§7](#7-names-are-facts-files-are-examples), [§8](#8-counts-versions-and-configuration)).
- [ ] The committed brands and apps are examples, not definitions ([§8](#8-counts-versions-and-configuration)).
- [ ] Frontmatter `description` is under 160 characters and describes the page ([§9](#9-frontmatter)).
- [ ] A new page has an entry in `packages/site/data/sidebar.yml` whose slug is its file name ([§9](#9-frontmatter)).
- [ ] Section order matches the doc type ([§10](#10-standard-section-order)). For **asset type** docs: Introduction → Source layout → Formats → Naming → Adding files → Integration → Best practices → Platform output.
- [ ] A change to one platform doc was considered for the other two ([§10](#10-standard-section-order)).
- [ ] Heading levels don't skip (`##` → `####`) ([§11](#11-heading-hierarchy)).
- [ ] All `##` / `###` headings under ~25 characters, sentence case, no trailing punctuation, no `&` ([§12](#12-heading-length-case-and-punctuation)).
- [ ] `## Platform output` follows the template ([§13](#13-the--platform-output-section)).
- [ ] Every table is wrapped in `<CxTable>` ([§14](#14-tables-and-trees)).
- [ ] Callouts have no `title`, a status callout is removed only by the PR that checked the page, and there is no emoji outside `## Best practices` ([§15](#15-callouts)).
- [ ] Troubleshooting entries name the symptom, quote the message, give the cause and the fix ([§16](#16-troubleshooting-entries)).
- [ ] Cross-references use `[[docsref:/...]]` for internal links and Markdown for external ([§17](#17-cross-references)).
- [ ] All fenced code blocks have a language tag ([§18](#18-fenced-code-language-tags)).
- [ ] `pnpm site:lint` and `pnpm site:build` pass.

---

## What's not in this guide (yet)

These conventions haven't been formalized here. To propose one: write the section, apply it to at least one doc in the same PR as evidence, and link contested proposals in an issue for discussion before merging.

Currently unwritten:

- Showing the files of a brand from a build at build time, in trees or galleries that a reader switches between brands, so that a doc can show files without holding their names.
- Screenshot conventions for Figma, Xcode and Android Studio — when to embed images, alt text rules, where to store source files.
- A doc type for the build reference (commands, configuration, the library), which is reference material inside a getting-started guide today.
- Conventions for changeset entries beyond what [CONTRIBUTING.md](.github/CONTRIBUTING.md#changesets) says.

---

## Appendix A — MDX component reference

The docs site uses two MDX components and two text tokens. The components come from [`@chassis-ui/docs`](https://www.npmjs.com/package/@chassis-ui/docs) and are imported automatically; a doc needs no `import` line for them.

### `<CxTable>`

Wraps a Markdown table in a responsive scroll container and gives the table its styling. Use for every table. Write the table directly inside the tags, with no blank line between a tag and the table.

| Prop    | Type     | Default | Purpose                                                        |
| ------- | -------- | ------- | -------------------------------------------------------------- |
| `class` | `string` | `table` | CSS class applied to the inner `<table>` by the rehype plugin. |

### `<Callout>`

Highlighted aside. See [§15](#15-callouts) for when to use each type.

| Prop     | Type                              | Default  | Purpose                                                                                              |
| -------- | --------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `type`   | `'info' \| 'warning' \| 'danger'` | `'info'` | Visual treatment.                                                                                    |
| `name`   | `string`                          | —        | Render a shared callout from `packages/site/content/callouts/<name>.md`. Overrides the slot content. |
| `class`  | `string`                          | —        | Classes added to the callout wrapper.                                                                |
| _(slot)_ | MDX content                       | —        | Inline callout body. Ignored when `name` is set.                                                     |

### Text tokens

Replaced at build time in prose, link targets, code blocks, and frontmatter.

| Token                 | Replaced with                                                | Example                                           |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `[[docsref:/<path>]]` | The URL of a doc of this site, with an optional `#anchor`    | `[[docsref:/asset-types/images#platform-output]]` |
| `[[config:<key>]]`    | A value of `packages/site/config.yml`; nested keys with dots | `[[config:current_version]]`                      |

### Other components

`@chassis-ui/docs` also provides `<Example>`, `<ResizableExample>`, `<ScssDocs>`, `<JsDocs>`, `<AddedIn>`, `<DeprecatedIn>`, and `<InFigma>`, which the Chassis CSS docs use. The assets docs don't use them yet; their props are in Appendix A of the chassis-css guide. Propose a convention here ([What's not in this guide](#whats-not-in-this-guide-yet)) before the first use.
