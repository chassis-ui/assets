# Open work

What is left to do, decide or check in this repository, and what was considered and left
out. An entry is removed when it is done. A D-number is a decision of
[docs/decisions.md](../docs/decisions.md). Read on 2026-10-12.

## For the maintainer

- **The choices of D28.** Two were the session's: Inter is at the optical size 14 in every
  file by weight, so the app fonts left the 18pt cut of D24, and `code-strong` of the default
  brand is the Bold, 700. Both are in 0.3.0 and wait for a confirmation.
- **The cut of the `display` role of `sinefil`.** Its files by weight are Source Serif 4 at
  the optical size 14, a text cut, since that is what the files they replaced were. Another
  cut, such as the default of the axis, 20, is one value of a command of
  [docs/fonts.md](../docs/fonts.md).
- **The choices of D29.** `chassis.ignore` adds names and takes none away, a pattern is a
  name and not a path, a list of `chassis.formats` replaces the rule of a processor, and both
  are read from the configuration without an option. In 0.3.1, and they wait for a
  confirmation.
- **1.0.** The five requirements that were set for it hold: the pages and the build agree,
  the consumer contract is tested, the build has unit and build tests, releases are
  automated, and the docs site uses `@chassis-ui/docs` 0.6 or later. Whether a release
  becomes 1.0, and when, is not decided.
- **The icons of the next `@chassis-ui/icons`.** `chassis-icons` removed `road-outline-1.svg`
  and `road-solid-1.svg` from its source, export copies of the two icons without the number,
  and its version is `0.4.0-next.0`. The copy in `source/default/` is the output of 0.3.1 and
  has both. A refresh, by the steps of
  [docs/architecture.md](../docs/architecture.md#refreshing-the-icons), removes two names from
  `icons/svgs/` of every job, which is a change of the output contract.
- **Files an app cannot use.** The apps get the symbol sprite of the icons, since it is an
  SVG, and logos that exist under one name as PNG and as SVG, which meet in one `res/`
  folder or one asset catalog. The build copies what the source holds, and the platform
  pages say what an app does about each. Removing the copies from `source/default/demo/` is
  the maintainer's.
- **The logos of `sinefil`.** `source/sinefil/docs/images/logo/` holds the logos of the
  `example` brand it replaced, under the `chassis-*` names. The example of the website that
  is built per brand shows them.

## Not written

- An entry of `contracts` in `chassis.checks.json` for `fonts/text.css`, `fonts/display.css`
  and `fonts/code.css`, once the sites link them. Until then no check fails when one
  is missing.
- A rule of the source lint for a file that no platform keeps, and a check of
  `chassis.checks.json` against `chassis.formats` (D29).
- The ranges `latin-ext`, `math` and `symbols` of `packages/assets/build/subset-ranges.json`
  differ from the stylesheets of Google Fonts: `U+20AD-20C4` for `U+20AD-20C0`, `U+2074-209F`
  for `U+2074-208E, U+2090-209C`, and eight entries of `symbols`. Found with issue 7 and not
  changed.
- A test of `build/instance-font.py`. It is Python, and the repository has no runner for it.

## Not checked

- The samples of the iOS and the Android page with the fonts of D24: the app fonts are TTF
  where they were OTF, and the second brand is `sinefil` where the Android sample had a
  flavor `example`. Both pages were last run on 2026-10-01.
- The output of `--vector-drawables` and `--res` in CI. It was built and run once, with
  Gradle on an emulator, on 2026-10-01. No job compiles it.
- A WebP or an AVIF file of `--webp` and `--avif` in a browser.
- `--watch` on Windows. CI runs its tests on Linux.

## Parked

Considered and left out. Each needs a reason to come back.

- **A `shared` layer under `source/<brand>/`** for assets every app gets. The pages do not
  describe it, and adding it changes the override order. The duplication between `docs` and
  `demo` is by design until the maintainer says otherwise.
- **Deriving image variants from one master.** The build stays file-driven: the designer
  exports the variants. `--optimize` re-encodes what is exported, and `--webp` and `--avif`
  write a second format of it, which is a format and not a variant (D12).
- **Removing the `icons/` copies or `other/default.tokens.json` from `source/`.** Every asset
  type the pages describe is kept: the icons page describes the copies, and D7 keeps the
  tokens file.
- **A `Package.swift` at the root.** `dist/` is not committed, so a Swift package would name
  folders that a checkout does not have.
- **Publishing the built assets on npm for the sites.** D2, and D9 of the website's roadmap:
  the archives are per platform and app, too large as one package and not what a site reads.
  `--type` and `--include` are the lighter alternative for a site (D13).
- **Processors loaded from outside `packages/assets/build/`**, named in the `chassis` block.
  D20. The registry is read synchronously by the build, the validator, the watch and the
  API, so a path in `package.json` makes each of them load asynchronously, and the shape of a
  processor becomes a public API. An adopting team edits the build, as the build-system page
  says under "Custom platforms". Taken again when an adopter needs a fourth platform, as an
  option off by default.
