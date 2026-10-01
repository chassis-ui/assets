#!/usr/bin/env bash
#
# Compiles the asset catalogs of an output with actool, the asset compiler of Xcode, and
# checks that each compiled catalog holds every image set. The command line tools alone
# have no asset compiler, so this needs Xcode; CI runs it on a macOS runner.
#
#   test/native/ios/check.sh [folder]
#
#   folder   The output to look for catalogs in. Default: dist/ of the repository, which
#            has catalogs after `pnpm assets --asset-catalog`.
#
# It writes to a temporary folder only.

set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
repository_root="$(cd "$package_root/../.." && pwd)"
output="${1:-$repository_root/dist}"

sdk_name=iphonesimulator
# SVG files in an asset catalog need iOS 13
deployment_target=13.0

fail() {
  echo "error: $*" >&2
  exit 1
}

xcrun --find actool >/dev/null 2>&1 ||
  fail 'no actool: install Xcode and select it with xcode-select, or set DEVELOPER_DIR'
[ -d "$output" ] || fail "no folder $output: run \`pnpm assets --asset-catalog\`"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

catalogs="$(find "$output" -type d -name '*.xcassets' | sort)"
[ -n "$catalogs" ] || fail "no asset catalog in $output: run \`pnpm assets --asset-catalog\`"

xcodebuild -version

index=0
while IFS= read -r catalog; do
  index=$((index + 1))
  compiled="$work/assets-$index"
  mkdir -p "$compiled"

  image_sets="$(cd "$catalog" && find . -type d -name '*.imageset' | sed -e 's|^\./||' -e 's|\.imageset$||' | sort)"
  count="$(wc -l <<<"$image_sets" | tr -d ' ')"
  echo "assets: ${catalog#"$output"/} ($count image sets)"

  xcrun actool "$catalog" --compile "$compiled" --platform "$sdk_name" \
    --minimum-deployment-target "$deployment_target" \
    --output-format human-readable-text --errors --warnings >"$compiled/actool.log" 2>&1 ||
    { cat "$compiled/actool.log" >&2; fail "$catalog: actool failed"; }
  if grep -Eq 'warning:|error:' "$compiled/actool.log"; then
    cat "$compiled/actool.log" >&2
    fail "$catalog: actool has warnings"
  fi

  [ -f "$compiled/Assets.car" ] || fail "$catalog: actool wrote no Assets.car"
  # The names of the compiled catalog, an image of a folder as `<folder>/<name>`
  xcrun --sdk "$sdk_name" assetutil --info "$compiled/Assets.car" |
    sed -n 's|^ *"Name" *: *"\(.*\)",*$|\1|p' | sed 's|\\/|/|g' | sort -u >"$compiled/names"
  missing="$(comm -23 <(printf '%s\n' "$image_sets") "$compiled/names")"
  [ -z "$missing" ] ||
    fail "$catalog: not in the compiled catalog: $(tr '\n' ' ' <<<"$missing")"
done <<<"$catalogs"

echo "The asset catalogs compile: $index."
