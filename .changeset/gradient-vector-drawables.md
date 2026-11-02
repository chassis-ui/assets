---
'@chassis-ui/assets': patch
---

`--vector-drawables` writes a path that a gradient fills without a second fill color. With both, `aapt2` kept the black color and dropped the gradient, so the path was drawn black. No file of `dist/` is added, removed or renamed, and a repository of assets changes nothing.
