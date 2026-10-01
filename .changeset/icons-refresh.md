---
'@chassis-ui/assets': minor
---

**Breaking.** The icons of the default brand are `@chassis-ui/icons` 0.3.1. The copy in
`source/default/docs/icons/` and `source/default/demo/icons/` was the output of 0.1.0.

- The classes of the icon font are `cx-<name>`, in a `content` layer, where they were
  `icon-<name>`: `icons/icons/chassis-icons.css`, `chassis-icons-min.css` and
  `chassis-icons.scss` of the web output. The font files, `chassis-icons.svg` and
  `chassis-icons.json` change with them.
- 15 icons are new under `icons/svgs/` of every platform, app and brand: `css-brand`,
  `cut-outline`, `cut-solid`, `envelope-open-outline`, `envelope-open-solid`,
  `envelope-outline`, `envelope-solid`, `figma-brand`, `figma-square-brand`,
  `hashtag-outline`, `hashtag-solid`, `js-brand`, `mdn-brand`, `sass-alt-brand` and
  `sass-brand`.
- The 488 icons that were there keep their names and their drawing. The class on the
  `<svg>` element is `cx-<name>`, where it was `icon-<name>`.
- `icons/icons/preview.html` is gone from the web output: the package does not ship it.
