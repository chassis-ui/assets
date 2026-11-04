# AGENTS.md

Instructions for AI coding agents working in this repository. It holds the rules an agent
breaks without being told; the docs it links to explain the rest.

## Project

Chassis Assets is `@chassis-ui/assets`, the build of the design files of the Chassis Design
System and of any team that adopts it: it copies the fonts, images, icons and other files of
a repository of assets from `source/<brand>/<app>/<type>/` to `dist/<platform>/<app>/<brand>/`
with the names and the formats of the web, iOS and Android. The build is file-driven and by
default copies only: it does not convert, resize or optimize unless an option asks for it.
The assets of the Chassis sites are a repository of assets of their own, the one that
`vendor/assets.json` names (D38), and the docs site here takes them from a pinned release of it,
like every Chassis site (D50). It is one repository of assets among others: never an example or a
template in the docs, which use `acme` names. It is a pnpm workspace:

```
package.json           # the commands
vendor/assets.json     # the pin: the repository and the release of the Chassis assets that the docs site reads
vendor/assets/         # what `pnpm vendor` unpacks from that release, not committed
packages/
  assets/              # @chassis-ui/assets, published to npm with the `chassis-assets` command
    lib/               # the `chassis-assets` command (JavaScript with JSDoc types, Node.js modules
                       # only): cli.js, the shared modules, build/ (the build), commands/ (one
                       # module per command on a repository), api/ (the library) and native/
                       # (the scripts of check-native)
    templates/         # what `chassis-assets init` writes into a repository of assets
    test/              # Vitest tests, the fixture (fixtures/) and its golden output (golden/), the
                       # small real files that the native checks compile (native/fixture/)
  site/                # chassis-assets-site, the Astro documentation site
build/                 # repository scripts: the release notes, the version references
docs/                  # architecture.md, decisions.md
ref/OPEN.md            # what is left to do, decide or check
```

A repository of assets holds `source/`, `chassis.checks.json` and a `package.json` with the
`chassis` block; `chassis-assets init` writes one.

## Setup and commands

- Package manager: **pnpm**, with Node.js 22.12 or later. Do not use npm or yarn.
- Run every command from the repository root.
- `pnpm vendor` unpacks the archive that `vendor/assets.json` pins into
  `vendor/assets/dist/web/docs/chassis/`, and `pnpm dev` and `pnpm site:build` run it first.
  `pnpm sync-assets` moves the pin, with `GH_TOKEN=$(gh auth token)` where several sessions call
  the GitHub API. Never edit the pin by hand. The tests need no assets.
- `node packages/assets/lib/cli.js <command> --cwd <dir>` runs the build of this checkout on a
  repository of assets, such as a checkout of the Chassis assets, which needs Git LFS.
  `--brand`, `--app` and `--platform` build a part of it, `--dry-run` prints the jobs without
  writing, and every command has `--help`. Without the Git LFS files, `--allow-lfs-pointers` or
  `CHASSIS_ALLOW_LFS_POINTERS=1` lets the build and the source lint pass.
- The build runs with nothing installed. `pnpm install` is for the tests, the checks, the site
  and the options that load a package.
- `node packages/assets/lib/cli.js init <dir>` writes the baseline of a repository of assets
  for an adopting team; its templates are in `packages/assets/templates/`.
- `node packages/assets/lib/cli.js static-font <variable> <output...> wght=600` writes the
  static font of a variable font to each output, the files by weight of a role, with HarfBuzz
  from `subset-font`.
- `pnpm dev` runs the site at `http://localhost:4325/assets/`.

## Before a task is done

Run the checks of the area you changed, and report the ones that fail.

| Area changed                                                 | Run                                                                                                                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/assets/lib/build/processors/` or `build-assets.js` | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`; `pnpm test:golden` when the output is meant to change, and review `packages/assets/test/golden/`. |
| The analyzer, validator, contract or lint                    | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`, and the command on a full build, with `--cwd` on a checkout of the Chassis assets.                |
| `packages/assets/lib/native/` or `check-native.js`           | `pnpm assets:lint`, `pnpm test`, `pnpm test:native:ios` (Xcode), `pnpm test:native:android` (Android SDK).                                                  |
| `packages/assets/lib/commands/init.js` or its templates      | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`, `pnpm lint:prettier`.                                                                             |
| `static-font.js` or `font-tables.js`                         | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`.                                                                                                   |
| `packages/assets/test/`                                      | `pnpm assets:lint`, `pnpm test`.                                                                                                                            |
| The pin, `vendor/assets.json`                                | `pnpm site:build`, and compare the site before and after.                                                                                                   |
| `packages/site/`                                             | `pnpm site:lint`, `pnpm check:astro`, `pnpm site:build`.                                                                                                    |
| Any Markdown, JSON, YAML or configuration file               | `pnpm lint:prettier`.                                                                                                                                       |

## Rules

The first nine are the principles of the project. They exist because an earlier rewrite
broke them and was reverted.

- **The build stays file-driven.** A designer adds a file to `source/<brand>/<app>/<type>/` and
  the build does the rest. Do not add a manifest, a declaration file or a list that has to be
  maintained beside the assets. A feature that needs input beyond the file tree is an option,
  off by default, and leaves the output of the default build untouched.
- **The source layout stays.** `source/<brand>/<app>/<type>/`, `_default` as the fallback brand,
  `_shared` beside the apps of a brand for the files of every app, a brand file over the default
  file of the same path and an app file over the shared file. A name that starts with `_` is no
  brand and no app (D36). Any folder name is a type. The layout is what every repository of
  assets has, so a change to it is a change for every adopting team.
- **Every asset type the pages describe is kept.** Do not remove a type from the build, or a
  file from the Chassis assets, because no consumer of today reads it. Removing an asset is the
  maintainer's decision, made in their repository.
- **Add, do not replace.** The build in `packages/assets/lib/` is the build. Do not rewrite
  it beside itself. Its commands and flags keep working.
- **The pages are the specification, and they win over the code.** When the build does less
  than a page says, fix the build. When a page describes something the build never did, say
  so and ask; do not decide alone which one changes.
- **`dist/` is not committed, and its layout is the output contract.**
  `dist/<platform>/<app>/<brand>/`, the names in it, the commands, the `chassis` block and the
  schema of `chassis.checks.json` are the public API. A change to one of them is a minor bump
  whose changeset starts with `**Breaking.**`.
- **Match the siblings in tooling, not in product.** Tests, CI, Changesets and the docs site
  follow `chassis-ui/tokens` and `chassis-ui/website`. The product follows its own pages.
- **The package has no dependencies.** `packages/assets/lib/` imports Node.js modules
  only, and neither the root `package.json` nor `packages/assets/package.json` has
  `dependencies`: a plain install of `@chassis-ui/assets` brings nothing else. Do not add an
  import of a package to the build. A feature that needs one declares it as an optional entry
  of `peerDependencies`, lists it in `devDependencies` for the tests, and loads it when its
  option is given, with an error that names the package when it is not installed.
- **The build names nothing of any repository of assets.** No brand, app, job or file name of
  the Chassis sites in `packages/assets/lib/` or in the scripts of `build/`. Such data is the
  `chassis` block and `chassis.checks.json` of the repository of assets. Tests run on the
  fixture.

And these:

- **Do not break the consumer contract.** A Chassis site takes the archive of its web job
  from a pinned release of the Chassis assets with `chassis-docs vendor`, and reads the files listed
  in the `chassis.checks.json` of that repository from the folder of the job; `chassis-assets verify`
  checks them there. The commands, the flags and the output layout of the build are what every
  repository of assets relies on.
- **Do not edit `vendor/assets/` or `vendor/assets.json`.** The first is unpacked from a release
  of the repository that `vendor/assets.json` names; a change to an asset is made there, and `pnpm sync-assets` moves
  the pin here. Never edit `dist/` or `packages/assets/test/golden/` by hand either: change the
  source or the build, then run the build or `pnpm test:golden`, and review the difference.
- **Do not edit the copies of other projects.** The sibling repositories are read, never
  edited; work for one is reported in its repository, not done from here. The copy of the
  icons of the Chassis sites, `@chassis-ui/website-icons`, in the Chassis assets is refreshed
  by the steps of [docs/architecture.md](docs/architecture.md#refreshing-the-icons), there.
- **Keep the known oddities.** The list in the README of the Chassis assets is part of their output
  contract, and the build keeps the behaviour they rest on. Do not add an entry to
  `lint.allow` of a `chassis.checks.json` to get past the source lint.
- **Tests use real files.** No mocks. A new case of the build is a file of the fixture, and
  the golden output is written again with `pnpm test:golden`.
- **Types are JSDoc.** The build is JavaScript checked with `checkJs`; do not convert it to
  TypeScript.
- **Add a changeset** (`pnpm changeset`, or a file in `.changeset/`) to a change in
  `packages/assets/lib/` or `packages/assets/templates/`. It names the files of `dist/` that
  are added, removed or renamed, and what a repository of assets has to change.

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
  statement about the build by running it, and copy a tree of `dist/` from a build. A page
  describes a repository of assets as `chassis-assets init` writes it, not this repository.
- Examples use the names of the quick start: the repository `acme-assets`, the brands `acme`
  and `globex`, the web app `site` and the mobile app `mobile`, and the submodule folder
  `vendor/assets`. A page never names the Chassis assets, their repository, brands or apps.
- Name a sibling by its GitHub repository, as `chassis-ui/css`, never by a local folder name or
  a relative path: both differ per contributor.
- Do not remove a `work-in-progress` or `created-by-ai` callout from a page you have not
  checked line by line.
- Run `pnpm site:lint` and `pnpm site:build` after editing `packages/site/`.

## Cautions

- Never push, merge or tag without being asked. Pushing `main` with a new version publishes
  the package. Commit only when the task asks for it, as one local commit on `develop`. A
  change is recorded by its changeset and its commit. A decision gets an entry in
  [docs/decisions.md](docs/decisions.md), and what a task leaves undone goes to
  [ref/OPEN.md](ref/OPEN.md), in the same commit.
- Do not open a pull request unless asked. The maintainer merges locally into `develop`.
- Do not edit generated or fetched files: `vendor/assets/`, `_site/`, `.cache/`,
  `node_modules/`.
- The version is in `packages/assets/package.json`. It and the references to it are written by
  `pnpm changeset:version`. Do not edit them by hand, and do not run it unless asked: releasing
  is the maintainer's.
- `@chassis-ui/docs`, the Chassis assets and the other Chassis packages are separate repositories.
  Report a bug in one of them there; do not work around it here.
- Commits follow `<type>(<scope>): <description>`, as described in
  [CONTRIBUTING.md](.github/CONTRIBUTING.md#branches-and-commits).

## Reference docs

Read the doc of an area before working in it, rather than deriving it from the code:

- [README.md](README.md): the layout, the commands and their options, the configuration of a
  repository of assets, what consumers rely on
- [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md): changing the build and the site; the
  checks per area; changesets and releases
- [docs/architecture.md](docs/architecture.md): the modules of the build and the output
  contract of every platform
- [packages/assets/test/README.md](packages/assets/test/README.md): the tests, the fixture and
  the golden output
- [docs/decisions.md](docs/decisions.md): the decisions behind the build, the layout and the
  releases, which the other documents and the tests cite by number
- [ref/OPEN.md](ref/OPEN.md): what is left to do, decide or check, and what was considered
  and left out
- [WRITING.md](WRITING.md): the style guide of the documentation
- The README, `docs/fonts.md` and `ref/OPEN.md` of the repository that `vendor/assets.json` names: the files of the
  brands, the known oddities of their output, and what is open about them
