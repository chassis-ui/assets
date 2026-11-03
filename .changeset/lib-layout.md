---
'@chassis-ui/assets': minor
---

**Breaking.** The code of the package moved from `build/` to `lib/`, and the export `./build/*` became `./lib/*`: `lib/cli.js` is the command, `lib/build/` the build, `lib/commands/` one module per command on a repository, `lib/api/` the library that `.` and `./api` export, `lib/native/` the scripts of `check-native`, and `lib/root.js`, `lib/types.js`, `lib/asset-types.js` and `lib/font-tables.js` the shared modules. What `init` writes moved from `build/templates/` to `templates/`. A project that imports a module of the package by its path changes `@chassis-ui/assets/build/<module>` to `@chassis-ui/assets/lib/<module>`, with `build/` or `commands/` added for a module of the build or a command; `import ChassisAssets from '@chassis-ui/assets'` does not change. Nothing in `dist/` of a repository of assets changes.
