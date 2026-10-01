# Security Policy

## Supported versions

Chassis Assets is pre-1.0. Only the latest version gets fixes; there are no maintenance
branches for older versions.

The repository holds design files (fonts, images, icons) and a build that copies them. The
output in `dist/` is files only and runs no code in your app. The build in
`packages/assets/build/` imports Node.js modules only, and runs on contributors' machines, in
CI and in the build of each site that vendors this repository. The documentation site and its
dependencies are built in CI and by Vercel.

## Reporting a vulnerability

**Please don't open a public GitHub issue for a security vulnerability.**

Instead, use GitHub's private vulnerability reporting for this repository:
[github.com/chassis-ui/assets/security/advisories/new](https://github.com/chassis-ui/assets/security/advisories/new).
This opens a private thread visible only to you and the maintainers, so a fix can be released
before any public write-up.

If you can't use GitHub's private reporting, open a regular issue asking a maintainer to reach
out for a private channel, without including any details of the vulnerability.

We'll acknowledge new reports and keep you updated while we investigate and fix a confirmed
issue. Please give us reasonable time to release a fix before any public disclosure.
