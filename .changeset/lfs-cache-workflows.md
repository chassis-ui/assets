---
'@chassis-ui/assets': patch
---

The workflows that `chassis-assets init` writes download fewer Git LFS files, whose downloads count against the Git LFS bandwidth of the owner of the repository. `ci.yml`, `release.yml` and `native.yml` check out pointers, cache `.git/lfs` by the list of the object ids and run `git lfs pull` with the token of the run, so a run downloads only the objects that changed since its cache. `native.yml` gets a `build` job that pulls the files, runs `build:release` and uploads `dist/` without `web/` for a day, and its iOS and Android jobs compile that output with no Git LFS file. No file of `dist/` is added, removed or renamed. A repository of assets takes the workflows with `chassis-assets init --check` and `chassis-assets init --force --only .github/workflows/ci.yml .github/workflows/release.yml .github/workflows/native.yml`, then applies its own changes to them again.
