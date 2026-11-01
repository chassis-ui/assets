---
'@chassis-ui/assets': minor
---

**Breaking.** The `res/` folder of `--res` changes. A pair `<name>_light` and `<name>_dark` of one folder is the resource `<name>`, the dark files in `drawable-night*`: `res/drawable/logo_light.png` and `res/drawable/logo_dark.png` become `res/drawable-nodpi/logo.png` and `res/drawable-night-nodpi/logo.png`. A raster of a resource with no density folder moves from `res/drawable/` to `res/drawable-nodpi/`, as Android scaled it up as an mdpi image. A drawable with the name of a pair fails the build. An app that reads `R.drawable.<name>_light` or `R.drawable.<name>_dark` reads `R.drawable.<name>`. The default output does not change, and a repository of assets changes nothing unless it builds with `--res`.

A folder `<name>.adaptive` in a folder of its own, of `background.svg`, `foreground.svg` and `monochrome.svg`, is the app icon of Android: it is copied to Android only, adding `app-icon/app_icon.adaptive/` to a repository that holds one, and with `--vector-drawables --res` it becomes `res/drawable/<name>_<layer>.xml` and `res/mipmap-anydpi-v26/<name>.xml`. The source lint checks its layers.

A `res/` path in `contracts` of `chassis.checks.json` is checked on an output that has `res/`, so a plain build passes. `pnpm test:android`, in the repository of the package, compiles and links an output with `aapt2`.
