---
'@chassis-ui/assets': minor
---

**Breaking.** The fallback brand of `source/` is renamed from `source/default/` to `source/_default/`, and `chassis.defaults.brandFolder` is `_default` when it is not set. A brand holds the files that every app of it takes once, in `source/<brand>/_shared/<type>/`: a job of a brand and an app reads `_default/_shared/`, `_default/<app>/`, `<brand>/_shared/` and `<brand>/<app>/`, and a file of a later folder replaces the file of the same path in an earlier one. A brand or an app of `chassis.build` whose name starts with `_` fails the build. The fonts by weight and the font licenses of `chassis` and `sinefil`, and the logos of `sinefil`, move from `source/<brand>/docs/` and `source/<brand>/demo/` to `source/<brand>/_shared/`.

No file of `dist/` is added, removed, renamed or changed: the output is byte for byte the one before. The source paths change, and with them the paths that `pnpm assets:lfs` prints and that a `git lfs pull --include` names.
