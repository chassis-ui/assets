---
'@chassis-ui/assets': minor
---

`@chassis-ui/assets` is published to npm, with the `chassis-assets` command. The packages
that `--optimize`, `--webp`, `--avif`, `--subset` and `--vector-drawables` load are optional
peer dependencies: a plain install brings nothing else, and the error of an option names the
package to install. `chassis-assets archive`, `pnpm assets:archive`, writes one zip per
platform, app and brand of an existing output with Node.js alone, to `archives/` by default,
in place of `build/release-archives.js` and the `zip` command; `pnpm release:archives` runs
it. No file of `dist/` changes.
