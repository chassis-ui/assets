---
'@chassis-ui/assets': patch
---

`init --check` and `init --only` read the brands and the apps of a repository from `chassis.build` of its `package.json`, as they already read its name. In 0.11.0 they took the default app, on the web, so `init --only .github/workflows/native.yml` said that `init` does not write that file, and `init --check` did not report it missing. No file of `dist/` is added, removed or renamed.
