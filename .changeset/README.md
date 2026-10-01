# Changesets

A change to `source/` or to `packages/assets/build/` adds a changeset: a Markdown file in
this folder that names the version bump and the text of the changelog entry. Run
`pnpm changeset` to write one. Changes to the site, the tests and the documents need none.

Before 1.0, a change that breaks the layout of `dist/`, the name of a file in it, or a
command or flag of the build is a `minor` bump, and its summary starts with `**Breaking.**`
and names the old and the new path. Everything else is a `patch`.

To release, run `pnpm changeset:version` on `develop`. It bumps the version in
`packages/assets/package.json`, writes `packages/assets/CHANGELOG.md` and copies the version
to the places that show it. Commit that, and push it to `develop`, `staging`, `main` and
`app/docs`. The push to `main` creates the tag and the GitHub release. See
[Releases](../.github/CONTRIBUTING.md#releases).
