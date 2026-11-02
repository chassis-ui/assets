---
'@chassis-ui/assets': minor
---

Add `chassis-assets check-native`, which compiles an existing output with `actool` for iOS and `aapt2` for Android, as an app compiles it, and fails on a warning of `actool`, a format `res/` does not take or a broken app icon. No file of `dist/` is added, removed or renamed.

For a repository with iOS or Android, `init` writes `.github/workflows/native.yml`, with a job per platform that builds with `build:release` and compiles the result when `source/`, `chassis.checks.json`, `package.json` or the lockfile changes. With Android, `build:release` adds `--res --vector-drawables`, and `svg2vectordrawable` is a development dependency. A repository of assets takes the checks with `npx chassis-assets init --only .github/workflows/native.yml`, and its `build:release` has to write what the check reads: `--asset-catalog` for iOS, `--res --vector-drawables` for Android.
