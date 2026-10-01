---
'@chassis-ui/assets': minor
---

The Android output gets WebP images.

- A `.webp` file under `images/` of an app is copied to `dist/android/<app>/<brand>/images/`,
  in the density folder of its indicator, as every other image is. It was left out. iOS
  still does not get WebP.
- No file of the output of this repository changes: the app that is built for Android has
  no WebP image.
