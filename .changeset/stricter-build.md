---
'@chassis-ui/assets': minor
---

**Breaking.** The build fails where it used to build nothing or the wrong thing, and
`--clean` with filters removes less.

- `--clean` with `--brand`, `--app` or `--platform` removes the output of the selected jobs
  only. It removed `dist/` whole, so `pnpm assets:site` deleted the iOS and Android output
  of an earlier build. A full build without filters removes `dist/` whole, as before.
- A filter value that is not configured, or filters that select no job, fail the build and
  name the configured values. They built nothing and exited 0.
- A source file that is a Git LFS pointer fails the build with the list of files, unless
  `--allow-lfs-pointers` or `CHASSIS_ALLOW_LFS_POINTERS=1` is given.
- The validator exits with 1 when a check fails, and prints each result once.
