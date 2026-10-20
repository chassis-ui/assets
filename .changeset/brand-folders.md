---
"@chassis-ui/assets": minor
---

**Breaking.** `source/chassis/` holds the files of the `chassis` brand, its fonts, logos,
favicons and tokens export, and `source/default/` the files every brand shares. Decision D33.
A brand so gets no file of another brand. In the output:

- The logos are 8 files per brand and app, `logo-black`, `logo-dark`, `logo-light` and
  `logo-white`, each as PNG and SVG: `images/logo/logo-<color>.{png,svg}` in
  `dist/web/docs/<brand>/`, `images/logo/logo_<color>.{png,svg}` in
  `dist/ios/demo/<brand>/`, and `images/logo/drawable/logo_<color>.{png,svg}` in
  `dist/android/demo/<brand>/`. They replace the 48 logos
  `chassis-{logo,icon}-{black,brand,white}` with their `-banner` forms and their `@2x` and
  `@3x` files, which are removed on every platform: on the web
  `images/logo/chassis-logo-brand.svg`, `chassis-icon-white-banner@2x.png` and the others, on
  iOS `chassis_logo_brand.svg` and the others, and on Android the same names in the density
  folders of `images/logo/`. `sinefil` had 16 of them and has its own 8.
- `dist/web/docs/<brand>/icons/` holds `cx-sprite.svg` only: `icons/icons/`, the icon font
  and its stylesheets, and `icons/svgs/`, the 503 SVG icons, are removed from the web output.
  A page takes them from `@chassis-ui/icons`, as the Chassis sites do. The iOS and Android
  output keeps them.
- The top of `images/` of `dist/ios/demo/<brand>/` and `dist/android/demo/<brand>/` loses
  the favicons, `android_chrome_192x192.png`, `android_chrome_512x512.png`,
  `apple_touch_icon.png`, `safari_pinned_tab.png`, `chassis_logo.svg`,
  `chassis_logo_black.svg`, `chassis_logo_white.svg`, `chassis_logo_shadow.png` and its `@2x`
  file, and `chassis_social.png`.
- `other/default-tokens.json` of `dist/web/docs/chassis/` is `other/example-tokens.json`,
  with the same content, and `dist/web/docs/sinefil/` has none.
- The output of `sinefil` has no font of the default brand: `fonts/code.woff2` and the 10
  `display` fonts with `display-license.txt` are removed from `dist/web/docs/sinefil/`, and
  the 8 `display_<weight>.ttf` files with `display_license.txt` from
  `dist/ios/demo/sinefil/fonts/` and `dist/android/demo/sinefil/fonts/`. A page of `sinefil`
  sets its headings in Lora through `fonts.css`.
- `site-logo.svg`, the favicons, `apple-touch-icon.png`, `android-chrome-192x192.png`,
  `android-chrome-512x512.png`, `safari-pinned-tab.png` and `social-image.png` of
  `dist/web/docs/sinefil/images/` are those of `sinefil`, where they were those of `chassis`.

The about page of the website shows and links
`images/logo/chassis-{logo,icon}-{brand,white}-banner.svg`, which are gone until it reads the
new names.
