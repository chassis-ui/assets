---
'@chassis-ui/assets': minor
---

`chassis-assets init [dir]` writes the baseline of a repository of assets into a folder:
`package.json` with the `chassis` block, the scripts and a development dependency on this
package, `chassis.checks.json`, `.gitattributes` with the Git LFS rules, `.gitignore`,
`.nvmrc`, a README, a CI workflow and a tag-driven release workflow with the archives, and
one file under `source/_default/_shared/other/` for the first build. `--name`, `--brand`,
`--app <name:platforms>` and `--pm npm|pnpm` fill it in, `--force` writes over the files
that exist and `--dry-run` only prints them. The templates ship in `build/templates/` of
the package. No file of `dist/` changes.
