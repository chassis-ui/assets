---
'@chassis-ui/assets': patch
---

The help texts and messages of the build use the example names of the documentation in place of those of the Chassis sites: `contract` is the check of an existing output against the consumer contracts of `chassis.checks.json`, not of "the docs output"; an app of `init --app` is such as `site:web` or `mobile:ios,android`; and the help of `lfs` runs `npx chassis-assets lfs --brand acme --app site`, not the command of this repository's checkout. No file of `dist/` changes, and a repository of assets has nothing to change.
