---
"@chassis-ui/assets": patch
---

The `docs` app has the new Chassis logo, favicons and social image. No file of `dist/` is
added, removed or renamed.

Changed: `site-logo.svg`, `favicon.png`, `favicon-16x16.png`, `favicon-32x32.png`,
`apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`,
`safari-pinned-tab.png` and `social-image.png` in `images/` of `dist/web/docs/chassis/` and
`dist/web/docs/sinefil/`. `site-logo.svg` is 448 by 96 where it was 324 by 84. It is for
inline use: it has no `xmlns`, and its paths take their color from the classes
`icon-default` and `icon-primary` of the page, where they were filled `#00A4CC`. Insert the
markup of the file into the page, where it was loaded with `<img>`.
