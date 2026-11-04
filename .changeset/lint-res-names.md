---
'@chassis-ui/assets': patch
---

`chassis-assets lint-source` warns about an image or an icon of an app with Android whose resource name a file of another folder of its type has, such as `images/onboarding/badge@2x.png` beside `images/badge.png`: `res/` has no subfolders, so `--res` keeps the file of the folder nearest to the type folder and leaves the other out. The warning names the file and the jobs it is left out of. No file of `dist/` is added, removed or renamed, and a repository of assets has nothing to change; one with such a file renames it.
