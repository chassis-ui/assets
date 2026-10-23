---
'@chassis-ui/assets': minor
---

**Breaking.** The maskable app icon of the `sinefil` brand is renamed from `images/android-chrome-maskable-512x512.png` to `images/android-chrome-512x512-maskable.png` in `dist/web/docs/sinefil/`, with its mark inside the safe zone, and its other icons, `images/favicon.svg` and `images/favicon.ico` are exported again. `other/manifest.json` names the new file, and sets `display` and `start_url`.

The `chassis` brand gets the same set in `dist/web/docs/chassis/`: `images/favicon.svg`, `images/favicon.ico` (its 16, 32 and 48 pixel PNG favicons), `images/android-chrome-512x512-maskable.png` and `other/manifest.json`, which takes the place of `other/example-tokens.json`, an example file that is removed.
