#!/usr/bin/env bash
#
# Compiles the asset catalogs of an output with actool, the asset compiler of Xcode, and
# checks that each compiled catalog holds every image set. It does the same for the `.icon`
# bundles of the output, which are app icons, and checks the name each one compiles to. The
# command line tools alone have no asset compiler, so this needs Xcode; CI runs it on a macOS
# runner.
#
#   chassis-assets check-native --platform ios, which runs this on the output of a repository:
#
#   native/ios.sh <folder>
#
#   folder   The output to look for catalogs and bundles in, built with --asset-catalog.
#
# It writes to a temporary folder only.

set -euo pipefail

output="$1"

sdk_name=iphonesimulator
# SVG files in an asset catalog need iOS 13
deployment_target=13.0

fail() {
  echo "error: $*" >&2
  exit 1
}

xcrun --find actool >/dev/null 2>&1 ||
  fail 'no actool: install Xcode and select it with xcode-select, or set DEVELOPER_DIR'
[ -d "$output" ] || fail "no folder $output: run \`chassis-assets build --asset-catalog\`"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

catalogs="$(find "$output" -type d -name '*.xcassets' | sort)"
if [ -z "$catalogs" ]; then
  # A new repository has nothing to compile yet. An image without a catalog is a wrong build
  images="$(find "$output" -path '*/ios/*' \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' -o -iname '*.svg' -o -iname '*.pdf' -o -iname '*.icon' \) | head -1)"
  [ -n "$images" ] || { echo "Nothing to compile in $output."; exit 0; }
  fail "no asset catalog in $output: run \`chassis-assets build --asset-catalog\`"
fi

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

bundles="$(find "$output" -type d -name '*.icon' | sort)"
[ -n "$bundles" ] || exit 0

count=0
while IFS= read -r bundle; do
  count=$((count + 1))
  compiled="$work/icon-$count"
  mkdir -p "$compiled"
  name="$(basename "$bundle" .icon)"
  echo "icon: ${bundle#"$output"/}"

  xcrun actool "$bundle" --compile "$compiled" --platform "$sdk_name" \
    --minimum-deployment-target "$deployment_target" --app-icon "$name" \
    --output-partial-info-plist "$compiled/partial.plist" \
    --output-format human-readable-text --errors --warnings >"$compiled/actool.log" 2>&1 ||
    { cat "$compiled/actool.log" >&2; fail "$bundle: actool failed"; }
  if grep -Eq 'warning:|error:' "$compiled/actool.log"; then
    cat "$compiled/actool.log" >&2
    fail "$bundle: actool has warnings"
  fi

  compiled_name="$(plutil -extract CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconName raw "$compiled/partial.plist" 2>/dev/null)" ||
    fail "$bundle: no CFBundleIconName in the compiled Info.plist"
  [ "$compiled_name" = "$name" ] ||
    fail "$bundle: compiles to the icon name $compiled_name, not $name"
done <<<"$bundles"

echo "The app icons compile: $count."
