---
'@chassis-ui/assets': minor
---

The `release.yml` that `chassis-assets init` writes runs on a push to `main` in place of a tag. When the version of `package.json` has no tag `v<version>`, it builds and verifies every job and creates the tag and the GitHub release with the archives; otherwise it does nothing. The first push of a new repository so releases `0.1.0`. The output does not change. A repository of assets keeps the workflow it has until it copies the new one.
