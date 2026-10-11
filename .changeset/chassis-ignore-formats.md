---
'@chassis-ui/assets': patch
---

Two settings in the `chassis` block of `package.json`, both optional. `ignore` lists names of files and folders that the build leaves out beside its own list, such as `["*.bak", "drafts"]`. `formats` names, for a platform and a type folder, the extensions the platform keeps in place of its rule, such as `{ "web": { "fonts": [".woff2", ".ttf", ".css", ".txt"] } }`. The checks read both. No file of `dist/` changes for a configuration without the two keys.
