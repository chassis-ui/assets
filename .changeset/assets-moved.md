---
'@chassis-ui/assets': minor
---

**Breaking.** The assets of the Chassis sites moved to `chassis-ui/website-assets` with
their history (D38): `source/`, `chassis.checks.json` and the `chassis` block are no longer
in this repository, which builds them from the `vendor/assets` submodule with the root
scripts on `--cwd vendor/assets`. A site that vendors this repository as `vendor/assets`
and runs `pnpm assets:site` in it gets no output: it vendors website-assets instead, whose
`assets:site` writes the same `dist/web/docs/chassis/`. The release of this repository is
the package; the archives `chassis-assets-<platform>-<app>-<brand>-<version>.zip` are
released by website-assets as `chassis-website-assets-…`. `docs/fonts.md` and
`build/instance-font.py` moved there too. No file of the build changes.
