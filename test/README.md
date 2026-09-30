# Build tests

Tests for the build in `build/`. Run them from the repository root:

```sh
pnpm test
```

The run takes a few seconds. It needs no Git LFS files, writes only to temporary folders, and
never touches `dist/` or `source/`.

## Principles

- **A fixture, not the real source.** `fixtures/` is a repository in small: a `package.json`
  with a `chassis` block and a `source/` folder. Every file in it is one line of text that
  names its own path, so a test can tell which file landed where. The one exception is the
  duplicate pair, below. The real `source/` is built and validated by CI after the tests.
- **The golden output is the reference.** `golden/` is the output of a default build of the
  fixture, committed. A build that writes anything else fails. When a change to the build is
  intended, write the baseline again and review its diff: every file that moves or changes
  name there moves or changes name in `dist/` too.
- **Real files, no mocks.** Tests build into temporary folders and read what was written.
  Only `console` is silenced where a module prints.
- **Pure functions first.** The processors, the filters, the ignore list, the argument parser
  and the job plan are tested as tables, one row per rule of the pages in
  `site/content/docs/`.

## The fixture

| Brand   | Folder in `source/`                | What it tests                                       |
| ------- | ---------------------------------- | --------------------------------------------------- |
| default | `default/site/`, `default/mobile/` | The fallback of every brand                         |
| `alpha` | `alpha/site/`, `alpha/mobile/`     | An override of a default file, and files of its own |
| `beta`  | none                               | A brand that builds from `default` alone            |

The apps are `site`, built for the web, and `mobile`, built for iOS and Android: six jobs.
Between them the fixture has a font in four formats with its stylesheet and its license, a
name with capitals (`HeroBanner.png`), a WebP image, `@1.5x`, `@2x` and `@3x` sets, a nested
image folder (`images/logo/`), icons in SVG, PDF and PNG with an icon font and its
stylesheet, a nested icon folder (`icons/svgs/`), an icon that already has `ic_`, and a folder
that is not one of the three types (`data/`) with a dot inside a name.

`default/site/images/logo/mark.svg` and `default/mobile/images/logo/mark.svg` have the same
content, so that the analyzer has one duplicate to find. The Git LFS pointer is not in the
fixture: the test that needs it writes one into a copy, so that the golden output stays the
output of a build with the default options.

`.gitattributes` keeps the fixture and the baseline out of Git LFS, and `.prettierignore`
keeps Prettier out of them.

## Test files

| File                   | What it checks                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `processors.test.js`   | `renameFile()` of each platform, `extractResolutionIndicator()`, the Android density folders and `ic_` prefix, and `keepsFile()`: which formats each platform keeps per type.                                                                                                                                                   |
| `build-assets.test.js` | `shouldIgnoreFile()`, `isLfsPointer()`, `hasAllowedExtension()`, `isExcluded()`, `cleanupEmptyDirectories()`, the collision tracker, `loadConfig()`, `parseArgs()`, `planJobs()`, and `generateAssets()` on what the golden test cannot show: the override, cleaning (D6), dry runs, Git LFS pointers, collisions and failures. |
| `golden.test.js`       | A build of the fixture against `golden/`, by path and content.                                                                                                                                                                                                                                                                  |
| `analyze.test.js`      | `AssetAnalyzer`: the counts per type, platform, app and brand, the filters, the duplicates.                                                                                                                                                                                                                                     |
| `validate.test.js`     | `DistValidator`: passes on `golden/`, and fails, naming the problem, on a copy with a file, a job or a type folder missing, an empty folder, or a name against the rules. Hidden files are left out of the naming check (T13).                                                                                                  |
| `api.test.js`          | `ChassisAssets`: the configuration, the combinations, the inventory, the statistics, `validate()` and `build()`.                                                                                                                                                                                                                |
| `asset-types.test.js`  | The extension lists and `isMetadataFile()` that the validator uses.                                                                                                                                                                                                                                                             |
| `contract.test.js`     | The consumer contract of `build/contract.js`: the pattern expansion, the files every site reads, the screenshot rule and its Figma export copies, and `checkContract()` on an output in a temporary folder.                                                                                                                     |
| `lint-source.test.js`  | The source lint: the naming rules of the design-guidelines page as a table, the known oddities, and `lintSource()` on the fixture, whose names break the rules on purpose, and on copies that add a pointer or an unread brand.                                                                                                 |
| `cli.test.js`          | `node build/build-assets.js`, `analyze-assets.js` and `validate-assets.js` as the `pnpm assets*` scripts run them: every flag, the output and the exit codes.                                                                                                                                                                   |
| `helpers.js`           | The paths, temporary folders and the file-by-file comparison.                                                                                                                                                                                                                                                                   |

## Writing the baseline again

```sh
pnpm test:golden
git diff --stat test/golden
```

`test:golden` is `node build/build-assets.js --cwd test/fixtures --out ../golden --quiet`: a
full build of the fixture, which removes `golden/` first. Commit the new baseline with the
change that caused it, and say in the changeset which files of `dist/` change with it.

## Adding a case

Add the file to `fixtures/source/` as one line of text that names its path, run
`pnpm test:golden`, and check that the new files in `golden/` are the ones the pages describe.
If the case is a rule of a page, add a row to the table in `processors.test.js` too. Counts in
`analyze.test.js` and `build-assets.test.js` follow the fixture and change with it.
