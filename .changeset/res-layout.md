---
'@chassis-ui/assets': minor
---

`pnpm assets --res` writes the fonts, images and icons of Android as a `res/` folder.

- With the option, the files of an Android job that the `res/` folder of an app takes move
  into `dist/android/<app>/<brand>/res/`, without the subfolders they had: a TTF or OTF
  font to `res/font/`, a PNG, WebP, JPEG or GIF image to the folder named as its density
  folder, `images/logo/drawable-xhdpi/chassis_logo_brand.png` to
  `res/drawable-xhdpi/chassis_logo_brand.png`, and, with `--vector-drawables`, an icon to
  `res/drawable/ic_arrow_right_solid.xml`.
- A file without a place in `res/` stays where it is, with a warning per job: the font
  licenses, every SVG file, a second file of one name, and a name that cannot be a
  resource. When two folders hold an image of one name, the folder nearest to `images/`
  gets the resource.
- The option is off by default, and no file of the default output changes. It needs nothing
  installed. The release archives are built without it.
- `generateAssets()` and `ChassisAssets.build()` take `res`, the statistics have
  `resourceFiles`, and a processor names its folders and formats in `res`.
- `pnpm assets:validate` passes on an output that was built with the option.
