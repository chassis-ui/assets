---
'@chassis-ui/assets': patch
---

The source lint reads the `.icon` bundle of an app icon: `icon.json` has to be there and be JSON, and every layer file it names has to be in `Assets/`. A build with `--res` says of an `.adaptive` bundle that stays why it is no app icon: without `--vector-drawables` it names the option, and with it the layer or the name that is missing. No file of `dist/` is added, removed or renamed. A repository of assets whose `.icon` bundle lacks `icon.json` or a file it names fails `chassis-assets lint-source` now, where it failed in Xcode before.
