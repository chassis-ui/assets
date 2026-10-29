This file stands in for the first asset, so that the build has a file to copy and
`chassis-assets verify` passes on a new repository. Delete it once a brand or an app has a
file of its own.

The assets go in source/<brand>/<app>/<type>/. The files of this folder, _default/_shared/,
reach every brand and every app; a brand replaces one by a file of the same path under
source/<brand>/_shared/<type>/ or source/<brand>/<app>/<type>/.
