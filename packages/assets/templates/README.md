# __NAME__

The assets of __NAME__: fonts, images, icons and other design files, by brand and app, built
with [`@chassis-ui/assets`](https://www.npmjs.com/package/@chassis-ui/assets) into the names
and the formats of the web, iOS and Android.

## Layout

```
source/<brand>/<app>/<type>/   The files of one brand and one app: fonts/, images/, icons/, …
source/<brand>/_shared/<type>/ The files of every app of a brand
source/_default/               The files every brand gets, unless a brand has its own
dist/<platform>/<app>/<brand>/ The output of a build, not committed
package.json                   The brands, the apps and their platforms, in `chassis.build`
chassis.checks.json            The files that consumers read by name, checked after a build
```

A brand file replaces the default file of the same path, and an app file the shared file.
The build copies what is there: a designer adds a file, and the build does the rest.

## Commands

Once, with Node.js 22.12 or later and [Git LFS](https://git-lfs.com) installed:

```shell
git lfs install
__INSTALL__
```

| Command           | What it does                                                                |
| ----------------- | --------------------------------------------------------------------------- |
| `__RUN__ build`   | Builds every brand, app and platform into `dist/`                           |
| `__RUN__ build:release` | The build of a release: the same, with the asset catalogs of iOS |
| `__RUN__ lint`    | Checks the names and the layout of `source/`                                |
| `__RUN__ verify`  | Checks an existing `dist/` against `source/` and `chassis.checks.json`      |
| `__RUN__ archive` | Writes one zip per platform, app and brand of `dist/` to `archives/`        |
| `npx chassis-assets manifest` | Writes a list of the files of `dist/`, with their sizes and hashes, to `archives/` |
| `npx chassis-assets diff --base <manifest>` | Reports the files added, removed and changed in `dist/` since a manifest |
| `__RUN__ analyze` | Reports the sizes, the types and the duplicates of `source/` and of `dist/` |
| `__RUN__ release-notes` | Prints the entry of the version in `CHANGELOG.md`, and fails without one |

`npx chassis-assets build --help` prints the options of the build: a part of the output with
`--brand`, `--app` and `--platform`, and the conversions that load a package.

## Releases

A release is a push to `main` with a new version in `package.json`, without a tag of its own,
as the workflow makes the tag. The first push releases the version that `init` wrote. For a
later one:

1. Set the version in `package.json`, and add its entry to `CHANGELOG.md`. To see what the
   entry has to name, download the manifest of the last release and run `diff` against it.
2. `__RUN__ lint`, `__RUN__ build:release` and `__RUN__ verify`.
3. Commit all of it, then `git push origin main`.

The release workflow stops when `CHANGELOG.md` has no entry for the version. It builds with
`build:release`, verifies every job, creates the tag `v<version>`, and attaches the manifest and
one `<name>-<platform>-<app>-<brand>-<version>.zip` per job to the GitHub release, whose body is
the entry of the version. `<name>` is the name of `package.json` without its scope. A push whose
version has a tag releases nothing, and a release that fails makes no tag, so the next push
tries again.

`npx chassis-assets init --check` reports where this repository differs from what the current
`chassis-assets init` writes, and `init --only <file…>` writes those files.

Before the first push to `main`, commit the lockfile, which the workflows install from, and add
a `LICENSE` file for the `license` of `package.json`.

## Documentation

The [documentation of Chassis Assets](https://chassis-ui.com/assets/) describes each asset
type, the rules of each platform and how a project uses the output.
