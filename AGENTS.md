# AGENTS.md

Instructions for AI coding agents working in this repository. It holds the rules an agent
breaks without being told; the docs it links to explain the rest.

## Project

Chassis Assets holds the fonts, images, icons and other design files of the Chassis Design
System, and a build that copies them from `source/<brand>/<app>/<type>/` to
`dist/<platform>/<app>/<brand>/` with the names and the formats of the web, iOS and Android.
The build is file-driven and copies only: it does not convert, resize or optimize. It is a pnpm
workspace:

```
source/                # the assets, as source/<brand>/<app>/<type>/; fonts and rasters are Git LFS files
dist/                  # the build output, not committed
package.json           # the `chassis` configuration (brands, apps, platforms) and the commands
chassis.checks.json    # what the checks verify: the consumer contracts, the names the lint keeps
packages/
  assets/              # @chassis-ui/assets, private, never published to npm
    build/             # the build and its checks (JavaScript with JSDoc types, Node.js modules only)
    test/              # Vitest tests, the fixture (fixtures/) and its golden output (golden/)
  site/                # chassis-assets-site, the Astro documentation site
build/                 # repository scripts (releases, the site's HTML checks)
docs/                  # architecture.md
ref/ROADMAP.md         # the plan, its principles, the decisions and the session log
```

## Setup and commands

- Package manager: **pnpm**, with Node.js 22.12 or later. Do not use npm or yarn.
- Run every command from the repository root.
- `pnpm assets` builds `dist/`; `--brand`, `--app` and `--platform` build a part of it, and
  `--dry-run` prints the jobs without writing. Every `pnpm assets*` command has `--help`.
- The build runs with nothing installed. `pnpm install` is for the tests, the checks and the site.
- `pnpm dev` runs the site at `http://localhost:4325/assets/`.
- A checkout without Git LFS has pointer files in `source/`, and the build fails on them. The
  tests need no Git LFS files. Where the binaries are not needed, `--allow-lfs-pointers` or
  `CHASSIS_ALLOW_LFS_POINTERS=1` lets the build and the source lint pass.

## Before a task is done

Run the checks of the area you changed, and report the ones that fail.

| Area changed                                             | Run                                                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source/`                                                | `pnpm assets:lint:source`, then `pnpm assets && pnpm assets:verify`. Needs Git LFS for the build.                                                           |
| `packages/assets/build/processors/` or `build-assets.js` | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`; `pnpm test:golden` when the output is meant to change, and review `packages/assets/test/golden/`. |
| The analyzer, validator, contract or lint                | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`, and the command on a full build.                                                                  |
| `packages/assets/test/`                                  | `pnpm assets:lint`, `pnpm test`.                                                                                                                            |
| `chassis.checks.json`                                    | `pnpm assets:lint:source`, `pnpm assets:verify` on a full build.                                                                                            |
| `packages/site/`                                         | `pnpm site:lint`, `pnpm check:astro`, `pnpm site:build`.                                                                                                    |
| Any Markdown, JSON, YAML or configuration file           | `pnpm lint:prettier`.                                                                                                                                       |

## Rules

The first nine are the principles of [ref/ROADMAP.md](ref/ROADMAP.md#principles). They exist
because an earlier rewrite broke them and was reverted.

- **The build stays file-driven.** A designer adds a file to `source/<brand>/<app>/<type>/` and
  the build does the rest. Do not add a manifest, a declaration file or a list that has to be
  maintained beside the assets. A feature that needs input beyond the file tree is an option,
  off by default, and leaves the output of the default build untouched.
- **The source layout stays.** `source/<brand>/<app>/<type>/`, `default` as the fallback brand,
  a brand file over the default file of the same path. Any folder name is a type.
- **Every asset type the pages describe is kept.** Do not remove a file from `source/` because
  no consumer of today reads it. Removing an asset is the maintainer's decision.
- **Add, do not replace.** The build in `packages/assets/build/` is the build. Do not rewrite
  it beside itself. Its commands and flags keep working.
- **The pages are the specification, and they win over the code.** When the build does less
  than a page says, fix the build. When a page describes something the build never did, say
  so and ask; do not decide alone which one changes.
- **`dist/` is not committed, and its layout is the output contract.**
  `dist/<platform>/<app>/<brand>/`, the names in it and the commands are the public API. A
  change to one of them is a minor bump whose changeset starts with `**Breaking.**`.
- **Match the siblings in tooling, not in product.** Tests, CI, Changesets and the docs site
  follow `chassis-tokens` and `chassis-website`. The product follows its own pages.
- **The default build needs nothing installed.** `packages/assets/build/` imports Node.js
  modules only, and the root `package.json` has no `dependencies`. Do not add an import of a
  package to the build. A feature that needs one loads it when its option is given.
- **The build names nothing of this repository.** No brand, app, job or file name of the
  Chassis sites in `packages/assets/build/` or in the scripts of `build/`. Such data goes in
  the `chassis` block of `package.json` or in `chassis.checks.json`. Tests run on the fixture.

And these:

- **Do not break the consumer contract.** Every Chassis site builds this repository with
  `pnpm install --ignore-workspace && pnpm assets:site` and reads the files listed in
  `chassis.checks.json` from `dist/web/docs/chassis/`. The root scripts on that path run the
  build with `node`, never through `pnpm --filter` or a workspace package.
- **Never edit `dist/` or `packages/assets/test/golden/` by hand.** Change the source or the
  build, then run `pnpm assets` or `pnpm test:golden`, and review the difference.
- **Do not edit the copies of other projects.** `icons/icons/` and `icons/svgs/` under
  `source/default/` are the build output of `@chassis-ui/icons`; refresh them by the steps of
  [docs/architecture.md](docs/architecture.md#refreshing-the-icons). The sibling repositories
  are read, never edited; work for one goes to "Tasks for the siblings" of the roadmap.
- **Keep the known oddities.** The list in
  [docs/architecture.md](docs/architecture.md#known-oddities) is part of the output contract.
  Do not add an entry to `lint.allow` of `chassis.checks.json` to get past the source lint.
- **Tests use real files.** No mocks. A new case of the build is a file of the fixture, and
  the golden output is written again with `pnpm test:golden`.
- **Types are JSDoc.** The build is JavaScript checked with `checkJs`; do not convert it to
  TypeScript.
- **Add a changeset** (`pnpm changeset`, or a file in `.changeset/`) to a change in `source/`
  or `packages/assets/build/`. It names the files of `dist/` that are added, removed or renamed.
- **Fonts keep their license beside them**, as `<role>-license.txt`.

## Documentation

- The pages of the site are in `packages/site/content/docs/`, in the sections
  `getting-started/`, `asset-types/` and `use-in-project/`. Shared callouts are in
  `packages/site/content/callouts/`.
- Style guide: [WRITING.md](WRITING.md). Instructive voice (no `you`, `your`, `we`, `our`) for
  the asset type pages, tutorial voice (`you` and `your` allowed) for the getting-started and
  use-in-project pages. Headings are in sentence case, under about 25 characters, each
  followed by a sentence.
- **The guide is the reference, not the existing pages.** Most pages are older than the guide
  and break its rules. Do not copy a convention from a page.
- Every path, file name, command and option in a page must exist as written. Check a
  statement about the build by running it, and copy a tree of `dist/` from a build.
- Do not remove a `work-in-progress` or `created-by-ai` callout from a page you have not
  checked line by line.
- Run `pnpm site:lint` and `pnpm site:build` after editing `packages/site/`.

## Cautions

- Never push, merge or tag without being asked. Pushing `main` with a new version starts the
  release workflow, and pushing `app/docs` changes what every Chassis site builds. Commit only
  when the task asks for it; a roadmap session ends with one local commit on `develop`, with
  the roadmap ticks and the session-log line in it.
- Do not open a pull request unless asked. The maintainer merges locally into `develop`.
- Do not edit generated or fetched files: `dist/`, `_site/`, `.cache/`, `node_modules/`.
- The version is in `packages/assets/package.json`. It and the references to it are written by
  `pnpm changeset:version`. Do not edit them by hand, and do not run it unless asked: releasing
  is the maintainer's.
- `@chassis-ui/docs` and the other Chassis packages are separate repositories. Report a bug in
  one of them there; do not work around it here.
- Commits follow `<type>(<scope>): <description>`, as described in
  [CONTRIBUTING.md](.github/CONTRIBUTING.md#branches-and-commits).

## Reference docs

Read the doc of an area before working in it, rather than deriving it from the code:

- [README.md](README.md): the layout, the commands and their options, the configuration, what
  consumers rely on
- [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md): changing assets, the build and the site;
  the checks per area; changesets and releases
- [docs/architecture.md](docs/architecture.md): the modules of the build, the output contract
  of every platform and the known oddities
- [packages/assets/test/README.md](packages/assets/test/README.md): the tests, the fixture and
  the golden output
- [ref/ROADMAP.md](ref/ROADMAP.md): the plan, the principles, the decisions and the session log
- [WRITING.md](WRITING.md): the style guide of the documentation
