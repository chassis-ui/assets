---
'@chassis-ui/assets': patch
---

The build warns about every name collision, and counts each output file once.

- Two source files that get the same name in a folder of the output give a
  `Filename collision` warning, whether the build renamed both, one or neither of them. Examples are
  `MyIcon.png` beside `my-icon.png`, and, on Android, `poster.png` beside `poster@2x.png`
  in a folder that is not `images/`. The build warned only when both files were renamed. The
  file copied last still wins, so the output does not change.
- `pnpm assets --dry-run`, the summary of a build and `jobs` of the result count a file
  that a brand overrides once. They counted the default file and the brand file.
- `pnpm assets:validate` leaves hidden files, such as `.DS_Store`, out of its count of
  platform folders.
- A processor that places images itself with `processImage()` can say where with
  `imageFolder(fileName)`, which the build reads to find collisions. The Android processor
  has it.
