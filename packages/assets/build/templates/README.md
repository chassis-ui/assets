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
| `__RUN__ analyze` | Reports the sizes, the types and the duplicates of `source/` and of `dist/` |

`npx chassis-assets build --help` prints the options of the build: a part of the output with
`--brand`, `--app` and `--platform`, and the conversions that load a package.

## Releases

A release is a push to `main` with a new version in `package.json`, without a tag of its own:
the first push releases the version of `package.json`. The release workflow builds with
`build:release`, verifies every job, creates the tag `v<version>`, and attaches one
`<name>-<platform>-<app>-<brand>-<version>.zip` per job to the GitHub release. A push whose
version has a tag releases nothing.

## Documentation

The [documentation of Chassis Assets](https://chassis-ui.com/assets/) describes each asset
type, the rules of each platform and how a project uses the output.
