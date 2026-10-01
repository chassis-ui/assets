---
'@chassis-ui/assets': minor
---

New checks of the source and of the output.

- `pnpm assets:verify`: the validator, then the consumer contract, the files the Chassis
  sites read from `dist/web/docs/chassis/`. `pnpm assets:contract` runs the contract check
  alone.
- `pnpm assets:lint:source`: the names and the layout of `source/` against the naming
  conventions of the design-guidelines page, and Git LFS pointers.
- `pnpm assets:typecheck`: TypeScript checks `packages/assets/build/` against its JSDoc,
  with the shared types in `types.js`.
- The tests run with Vitest on a fixture in `packages/assets/test/fixtures/` and compare a
  build of it with `test/golden/`. They need no Git LFS files and never write to `dist/`.
  `pnpm test:golden` writes the baseline again. The scripts `assets:test:build`,
  `assets:test:analyze` and `assets:test:api` are gone; `assets:test` runs `pnpm test`.
