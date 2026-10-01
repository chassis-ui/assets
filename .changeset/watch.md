---
'@chassis-ui/assets': minor
---

`pnpm assets --watch` builds, then builds again when a file under `source/` changes.

- A change builds the jobs it belongs to: a file of a brand builds the jobs of that brand
  and its app, a file of the default brand builds the jobs of its app for every brand. The
  filters of the command select the jobs that are watched.
- A job is built whole, into a folder that is removed first, so a file that is removed from
  `source/` is gone from the output. Every other option applies to each build.
- Changes that come together are one build. A build that fails prints its error and the
  watch goes on. It needs nothing installed.
- Without the option the build is as it was, and no file of the output changes.
- `watchAssets(options, events)` of `watch.js` is the same for a script.
