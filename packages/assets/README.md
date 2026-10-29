# @chassis-ui/assets

The build of the Chassis Design System's assets: fonts, images, icons and other design files,
copied from `source/<brand>/<app>/<type>/` of a repository of assets to
`dist/<platform>/<app>/<brand>/` with the names and the formats of the web, iOS and Android.
The build is file-driven: a designer adds a file, and the build does the rest. It needs
Node.js 22.12 or later and nothing else.

```shell
npm install --save-dev @chassis-ui/assets
npx chassis-assets build
```

| Command                      | What it does                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `chassis-assets build`       | Every brand, app and platform of `chassis.build` in `package.json`                               |
| `chassis-assets validate`    | Checks an existing output against the source and the configuration                               |
| `chassis-assets contract`    | Checks an output against the consumer contracts of `chassis.checks.json`                         |
| `chassis-assets verify`      | The validator, then the contract check                                                           |
| `chassis-assets lint-source` | Checks the names and the layout of `source/`                                                     |
| `chassis-assets analyze`     | Sizes, types and duplicates of the source and the output                                         |
| `chassis-assets lfs`         | The Git LFS paths a build reads, for `git lfs pull --include`                                    |
| `chassis-assets archive`     | One zip per platform, app and brand of an existing output, for a release                         |
| `chassis-assets init [dir]`  | Writes the baseline of a repository of assets: `package.json`, the LFS attributes, the workflows |

Every command takes `--help`, and `--cwd <dir>` names the repository root, by default the
nearest folder upward whose `package.json` has a `chassis` block. The options that convert
files load a package when they are given, an optional peer dependency: `sharp` and `svgo`
for `--optimize`, `--webp` and `--avif`, `subset-font` for `--subset`, and
`svg2vectordrawable` for `--vector-drawables`.

The [documentation](https://chassis-ui.com/assets/) describes the source layout, the
configuration, the output of each platform and how to use it in a project. The source of the
build, its tests and the Chassis assets are in the
[repository](https://github.com/chassis-ui/assets).
