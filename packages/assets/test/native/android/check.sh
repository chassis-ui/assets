#!/usr/bin/env bash
#
# Compiles the res/ folders of an output with aapt2, the resource compiler of Android, and links
# each one against android.jar, which resolves the names that one resource has of another: an
# app icon of its layers. aapt2 compiles an SVG or a text file in res/drawable as a plain file,
# and a vector without a shape, and Gradle fails on the first and draws nothing for the second,
# so this checks the formats of each folder and the shapes first. It also checks that a night
# file has a file for the other mode.
#
#   test/native/android/check.sh [folder]
#
#   folder   The output to look for res/ folders in. Default: dist/ of the repository, which
#            has them after `pnpm assets --res --vector-drawables`.
#
# It looks for aapt2 and android.jar in the newest build tools and platform of ANDROID_HOME, or
# ANDROID_SDK_ROOT. AAPT2 and ANDROID_JAR name them. It writes to a temporary folder only.

set -euo pipefail

package_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
repository_root="$(cd "$package_root/../.." && pwd)"
output="${1:-$repository_root/dist}"
sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"

fail() {
  echo "error: $*" >&2
  exit 1
}

newest() {
  find "$1" -mindepth 2 -maxdepth 2 -name "$2" 2>/dev/null | sort -V | tail -1
}

aapt2="${AAPT2:-$(command -v aapt2 || true)}"
[ -n "$aapt2" ] || aapt2="$(newest "$sdk/build-tools" aapt2)"
[ -n "$aapt2" ] || fail 'no aapt2: set ANDROID_HOME to the Android SDK, or AAPT2'
android_jar="${ANDROID_JAR:-$(newest "$sdk/platforms" android.jar)}"
[ -n "$android_jar" ] || fail 'no android.jar: install a platform of the Android SDK, or set ANDROID_JAR'
[ -d "$output" ] || fail "no folder $output: run \`pnpm assets --res --vector-drawables\`"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

folders="$(find "$output" -type d -name res -path '*/android/*' | sort)"
[ -n "$folders" ] || fail "no res/ folder in $output: run \`pnpm assets --res --vector-drawables\`"

"$aapt2" version
echo "android.jar: $android_jar"

cat >"$work/AndroidManifest.xml" <<'XML'
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.chassisui.check" />
XML

index=0
while IFS= read -r res; do
  index=$((index + 1))
  compiled="$work/compiled-$index"
  mkdir -p "$compiled"
  files="$(find "$res" -type f | wc -l | tr -d ' ')"
  echo "res: ${res#"$output"/} ($files files)"

  # What aapt2 passes and Gradle or a screen does not: an SVG, a license, a sprite
  strays="$(find "$res" -type f \( \
    \( -path '*/drawable*' -not -iname '*.xml' -not -iname '*.png' -not -iname '*.webp' \
    -not -iname '*.jpg' -not -iname '*.jpeg' -not -iname '*.gif' \) -o \
    \( -path '*/font/*' -not -iname '*.ttf' -not -iname '*.otf' \) -o \
    \( -path '*/mipmap*' -not -iname '*.xml' \) \) | sort)"
  [ -z "$strays" ] || fail "$res: a format res/ does not take: $strays"
  empty="$(find "$res" -type f -path '*/drawable*' -name '*.xml' -exec grep -L '<path' {} + | sort || true)"
  [ -z "$empty" ] || fail "$res: a vector without a shape: $empty"

  "$aapt2" compile --dir "$res" -o "$compiled" ||
    fail "$res: aapt2 compile failed"
  # shellcheck disable=SC2046 # the names have no spaces: they are names of resources
  "$aapt2" link -o "$compiled/out.apk" -I "$android_jar" --manifest "$work/AndroidManifest.xml" \
    --java "$compiled/java" $(find "$compiled" -name '*.flat' | sort) ||
    fail "$res: aapt2 link failed"

  # A drawable of a night folder has a file for the other mode too
  orphans=""
  while IFS= read -r night; do
    [ -n "$night" ] || continue
    name="$(basename "$night")"
    name="${name%.*}"
    found="$(find "$res" -type f -path '*/drawable*' -not -path '*/drawable-night*' -name "$name.*" | head -1)"
    [ -n "$found" ] || orphans="$orphans ${night#"$res"/}"
  done <<<"$(find "$res" -type f -path '*/drawable-night*')"
  [ -z "$orphans" ] || fail "$res: only a night file:$orphans"
done <<<"$folders"

echo "The res/ folders compile and link: $index."
