---
'@chassis-ui/assets': patch
---

The `--help` of each command and the messages of the build name `chassis-assets <command>`, in place of the `pnpm assets*` scripts of this repository, which no repository of assets has. `chassis-assets check-native --platform android` on a machine without the Android SDK now prints what is missing: it exited with 1 and no message, before its own error. No file of `dist/` changes, and a repository of assets has nothing to change.
