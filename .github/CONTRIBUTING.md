# Contributing to Chassis Assets

This document covers how a change is described and how a version is released. The setup,
the commands and the checks are in the [README](../README.md) and in
[docs/architecture.md](../docs/architecture.md) until roadmap session 4.2 brings them here.

## Releases

`@chassis-ui/assets` is released with [Changesets](https://changesets.dev). It is not
published to npm. A version is a tag, `v<version>`, and a GitHub release with one archive
per platform, app and brand. The sites read the `app/docs` branch, not a release.

### Describe a change

A change to `source/` or to `packages/assets/build/` adds a changeset:

```bash
pnpm changeset
```

It asks for the bump and a summary, and writes a Markdown file to `.changeset/`. Commit it
with the change. Changes to the site, the tests and the documents need none. On a pull
request, the Changeset job of CI fails when one is missing.

When the change adds, removes, renames or rewrites a file of `dist/`, the summary names the
file, with the old and the new path.

### What a version may break

The layout of `dist/`, the names of the files in it and the commands and flags of the build
are the public API. Before 1.0, a change that breaks one of them is a `minor` bump, and its
summary starts with `**Breaking.**`. Everything else is a `patch`.

The [consumer contract](../ref/ROADMAP.md#the-consumer-contract) is not for a version to
break: `pnpm assets:contract` checks it on every commit.

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
`dist/<platform>/<app>/<brand>/`. A version without a changelog entry is not released.

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
