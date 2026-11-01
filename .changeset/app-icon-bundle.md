---
'@chassis-ui/assets': minor
---

**Breaking.** A folder that ends in `.icon`, outside `fonts/`, `images/` and `icons/`, is a bundle of Icon Composer, and the build takes it as one file. It is written to iOS only, as `dist/ios/<app>/<brand>/<folder>/<name>.icon/` with its name in snake_case, and the files in it keep their names, so that `actool` can compile it. It is no longer in the web and Android output, and the source lint checks only the name of the bundle. A repository of assets with such a folder renames it to lowercase with hyphens, and keeps it in a folder of its own, such as `app-icon/`.
