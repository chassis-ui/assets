# Contributing to Chassis Assets

Thanks for taking the time to contribute. This document covers the setup, the conventions and
what a change needs before it is merged. For the build and its checks it links to the
documents that are kept up to date, rather than repeating them.

## Dev setup

You need Node.js 22.12 or later (the repository pins 24 in `.nvmrc`), pnpm (the version in
`packageManager` of the root `package.json`; `corepack enable` picks it up) and
[Git LFS](https://git-lfs.com). Run `git lfs install` once on your machine before cloning:
fonts and raster images are Git LFS files.

```sh
git clone https://github.com/chassis-ui/assets.git chassis-assets
cd chassis-assets
pnpm install
```

The repository is a pnpm workspace with two packages:

- [`packages/assets`](../packages/assets/): `@chassis-ui/assets`, the build in `build/` and its
  tests in `test/`. It is private and never published to npm.
- [`packages/site`](../packages/site/): `chassis-assets-site`, the Astro documentation site.

The root holds what a designer and a consumer work with: the assets in `source/`, the
`chassis` configuration in `package.json`, what the checks verify in `chassis.checks.json`,
and the output in `dist/`, which is not committed. It also holds the lint and format
configurations, the repository scripts in `build/` and the CI workflows. Run every command
from the root. The [README](../README.md#commands) lists the commands with their options.

The build imports Node.js modules only, so `pnpm assets` runs before `pnpm install`. The
install is for the tests, the checks and the site.

## Branches and commits

Work goes to `develop`. Branch from it, and open a pull request against it. The maintainer
merges locally into `develop` too; both ways run the same checks. A commit reaches `staging`,
`main` and `app/docs` only after CI passed on it, see [Releases](#releases).

Commits follow a loose `<type>(<scope>): <description>` convention:

- **Types in use**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`.
- **Scopes in use**: `site` for the documentation site, `roadmap` for `ref/ROADMAP.md`; omitted
  for the build, the assets and changes that span several areas.
- Examples from the history: `fix: make the build do what the pages say`,
  `docs(site): make the pages say what the build does`,
  `test: run the tests with Vitest on a fixture with a golden output`.

Branch names aren't templated; name yours descriptively, for example `fix/android-density`.

## Changing assets

The assets are the files in `source/<brand>/<app>/<type>/`. The build is file-driven: a file
added there is in the output of the next build, and no list has to be updated. The
[design guidelines](https://chassis-ui.com/assets/docs/getting-started/design-guidelines/)
have the naming conventions and the formats of each asset type.

1. Add, replace or remove the files. A file under `source/default/` goes to every brand; a
   file under `source/<brand>/` replaces the default file of the same path for that brand.
2. Check the names and the layout, build, and verify the output:

   ```sh
   pnpm assets:lint:source
   pnpm assets
   pnpm assets:verify
   ```

   `pnpm assets --dry-run` prints the jobs and their file counts without writing.

3. Add a changeset (see [Changesets](#changesets)) that names the files of `dist/` that are
   added, removed or renamed.

Three things to know:

- **Fonts come with their license.** A font is redistributed with the text of its license,
  `<role>-license.txt` beside the font files. The build copies it to every platform.
- **Icons are copied, not drawn here.** `icons/icons/` and `icons/svgs/` of the default brand
  are the build output of `@chassis-ui/icons`. Do not edit a file there; refresh the copy by
  the steps of [docs/architecture.md](../docs/architecture.md#refreshing-the-icons).
- **Some files are read by name.** `chassis.checks.json` lists the files that the Chassis
  sites read from `dist/web/docs/chassis/`. `pnpm assets:verify` fails when one is missing.
  Renaming or removing one of them needs the consumer to change first.

A name that breaks a naming rule on purpose is listed in `lint.allow` of
`chassis.checks.json`, with the reason. Do not add one to get past the lint.

## Changing the build

The build in `packages/assets/build/` follows the principles of
[ref/ROADMAP.md](../ref/ROADMAP.md#principles); please keep them.
[docs/architecture.md](../docs/architecture.md) describes the modules, the output contract of
each platform and the known oddities.

- **The build stays file-driven.** No manifest and no list beside the assets. A feature that
  needs input beyond the file tree is an option, off by default, and leaves the output of the
  default build as it is.
- **The build needs nothing installed.** It imports Node.js modules only. A feature that needs
  a package loads it when its option is given, never at import time.
- **The build names nothing of this repository.** No brand, app, job or file name of the
  Chassis sites in `packages/assets/build/` or in the scripts of `build/`. What is particular
  to this repository is data: the `chassis` block of `package.json` and `chassis.checks.json`.
- **The layout of `dist/`, the names in it and the commands are the public API.** See
  [What a version may break](#what-a-version-may-break).
- **Tests use real files.** They run on the fixture in `packages/assets/test/fixtures/` and
  compare a build of it with `test/golden/`, without mocks. See
  [packages/assets/test/README.md](../packages/assets/test/README.md).
- **Types in JSDoc.** `pnpm assets:typecheck` runs TypeScript's `checkJs` on `build/`, with the
  shared types in `types.js`. The build stays JavaScript.

After a change, run:

```sh
pnpm assets:lint
pnpm assets:typecheck
pnpm test
```

A change that is meant to change the output also writes the baseline again with
`pnpm test:golden`, with the difference of `packages/assets/test/golden/` reviewed line by
line, runs `pnpm assets && pnpm assets:verify` on the real source, and adds a changeset.

## Changing the site

The pages are in `packages/site/content/docs/`. [WRITING.md](../WRITING.md) is their style
guide: voice, section order, headings, names and code blocks. The pages are the specification
of the build: a statement about what the build does is checked by running it. Run the site
locally at `http://localhost:4325/assets/` with:

```sh
pnpm dev
```

Before opening a pull request:

```sh
pnpm site:lint
pnpm check:astro
pnpm site:build
```

## Checks per changed area

What to run before a commit, by what the commit changes. CI runs all of it.

| Changed                                                  | Run                                                                                                                                                         |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source/`                                                | `pnpm assets:lint:source`, then `pnpm assets && pnpm assets:verify`. Needs Git LFS for the build.                                                           |
| `packages/assets/build/processors/` or `build-assets.js` | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`; `pnpm test:golden` when the output is meant to change, and review `packages/assets/test/golden/`. |
| The analyzer, validator, contract or lint                | `pnpm assets:lint`, `pnpm assets:typecheck`, `pnpm test`, and the command on a full build.                                                                  |
| `packages/assets/test/`                                  | `pnpm assets:lint`, `pnpm test`.                                                                                                                            |
| `chassis.checks.json`                                    | `pnpm assets:lint:source`, `pnpm assets:verify` on a full build.                                                                                            |
| `packages/site/`                                         | `pnpm site:lint`, `pnpm check:astro`, `pnpm site:build`.                                                                                                    |
| Anything                                                 | `pnpm lint:prettier`.                                                                                                                                       |

## What a pull request needs

- **Passing CI**: `.github/workflows/ci.yml` runs five jobs on `develop` and on pull requests.
  Lint: `pnpm lint:prettier`, `pnpm site:lint` and `pnpm check:astro`. Assets: the build as a
  site runs it, with nothing installed, then `pnpm assets:lint`, `pnpm assets:lint:source`,
  `pnpm assets:typecheck`, `pnpm test`, `pnpm assets` and `pnpm assets:verify`. Site:
  `pnpm site:build`. Audit: `pnpm check:pnpm`. Native iOS, on a macOS runner: a build of the
  iOS jobs with `--asset-catalog`, then `pnpm test:ios`, which compiles the catalogs with
  `actool` and needs Xcode. The commands above run the same checks locally.
- **A changeset** for a change to `source/` or to `packages/assets/build/`. The Changeset job
  fails a pull request without one. A change that only touches the site, the documents, the
  tests or the tooling needs none.
- **The golden baseline** written again and reviewed, for a change to the build that changes
  the output.

## Changesets

A changeset is a Markdown file in [`.changeset/`](../.changeset/) that names the version bump
and the text of the changelog entry. Write one with:

```sh
pnpm changeset
```

It asks for the bump and a summary. Commit the file with the change. When the change adds,
removes, renames or rewrites a file of `dist/`, the summary names the file, with the old and
the new path.

### What a version may break

The layout of `dist/`, the names of the files in it and the commands and flags of the build
are the public API. Before 1.0, a change that breaks one of them is a `minor` bump, and its
summary starts with `**Breaking.**`. Everything else is a `patch`.

The [consumer contract](../ref/ROADMAP.md#the-consumer-contract) is not for a version to
break. It is `contracts` in `chassis.checks.json`, and `pnpm assets:contract`
checks it on every commit.

## Releases

`@chassis-ui/assets` is released with [Changesets](https://changesets.dev). It is not
published to npm. A version is a tag, `v<version>`, and a GitHub release with one archive
per platform, app and brand. The sites read the `app/docs` branch, not a release.

### Release a version

On `develop`:

```bash
pnpm changeset:version
git add .
git commit -m "chore(release): <version>"
```

`changeset:version` bumps the version in `packages/assets/package.json`, writes the entry in
`packages/assets/CHANGELOG.md`, deletes the changesets, and copies the version to
`packages/site/config.yml` and to the badge of the README.

Push the commit to `develop` and wait for CI. Then push the same commit on:

```bash
git push origin develop:staging
git push origin develop:main
git push origin develop:app/docs
```

The push to `main` runs `.github/workflows/release.yml`. When the version has no tag yet and
the checks of CI passed on the commit, it builds every brand, app and platform, runs
`pnpm assets:verify`, and creates the tag and the GitHub release with the changelog entry as
its text and the archives attached:
`chassis-assets-<platform>-<app>-<brand>-<version>.zip`, which holds the content of
`dist/<platform>/<app>/<brand>/`. The start of the name is the name of the root
`package.json` without `-workspace`. A version without a changelog entry is not released.

The push to `app/docs` is what the sites receive: `chassis-docs sync-submodules` moves their
`vendor/assets` to the tip of that branch.

To see the archives before a release, run `pnpm assets && pnpm release:archives`. It writes
them to `.cache/release/`.

### Prereleases

```bash
pnpm changeset pre enter next   # versions become 0.2.0-next.0, 0.2.0-next.1, …
pnpm changeset:version
# commit, push to develop, staging and main
pnpm changeset pre exit         # when the version is ready
pnpm changeset:version          # 0.2.0
```

The GitHub release of a version with a prerelease part is marked as a prerelease, and the
latest release stays the last stable version.

## Using the issue tracker

Search existing (including closed) issues first, then
[open a new one](https://github.com/chassis-ui/assets/issues/new/choose) if your bug or request
isn't already covered. For a security vulnerability, don't open a public issue; see
[`SECURITY.md`](SECURITY.md). Everyone taking part follows the
[Code of Conduct](CODE_OF_CONDUCT.md).
