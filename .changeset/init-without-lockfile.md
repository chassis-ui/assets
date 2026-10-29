---
'@chassis-ui/assets': patch
---

The workflows that `chassis-assets init` writes install with `npm install` or
`pnpm install`, and set no cache on the Node.js setup: a new repository has no lockfile
until its first install is committed, and `npm ci`, `--frozen-lockfile` and the cache of
`actions/setup-node` failed its first CI run without one. No file of `dist/` changes.
