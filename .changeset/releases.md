---
'@chassis-ui/assets': patch
---

Versions are made with Changesets, and a version has a GitHub release with one archive per
platform, app and brand, `chassis-assets-<platform>-<app>-<brand>-<version>.zip`, which
holds the content of `dist/<platform>/<app>/<brand>/`. `pnpm changeset:version` replaces
`pnpm change-version`, and this changelog is `packages/assets/CHANGELOG.md`.
