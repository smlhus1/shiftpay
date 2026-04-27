#!/usr/bin/env bash
# APK size baseline — runs apkanalyzer against the latest signed release
# build and writes a structured snapshot to research/baselines/.
#
# When to run: after a release build that ships, or after a Pass-N change
# that significantly affects bundle/native-lib size. The committed
# baselines let future PRs diff against a known-good snapshot.
#
# Usage from repo root:
#   bash shiftpay/scripts/apk-baseline.sh
#
# Output:
#   research/baselines/apk-YYYY-MM-DD-<sha>.txt
set -euo pipefail

APKANALYZER="${APKANALYZER:-C:/Users/StianMelhus/AppData/Local/Android/Sdk/cmdline-tools/latest/bin/apkanalyzer.bat}"
APK="shiftpay/android/app/build/outputs/apk/release/app-release.apk"
BASELINES="research/baselines"

if [ ! -f "$APK" ]; then
  echo "error: APK not found at $APK — run a release build first" >&2
  exit 1
fi

if [ ! -x "$(command -v "$APKANALYZER" 2>/dev/null || echo "$APKANALYZER")" ]; then
  echo "error: apkanalyzer not at $APKANALYZER — set APKANALYZER env var" >&2
  exit 1
fi

mkdir -p "$BASELINES"
sha="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
date="$(date -u +%Y-%m-%d)"
out="$BASELINES/apk-$date-$sha.txt"

{
  echo "# ShiftPay APK baseline"
  echo "# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "# Commit:    $sha"
  echo "# APK:       $APK"
  echo
  echo "## File summary"
  echo
  ls -lh "$APK" | awk '{print $5, $9}'
  echo
  echo "## apkanalyzer apk summary"
  echo
  "$APKANALYZER" apk summary "$APK"
  echo
  echo "## apkanalyzer apk file-size (compressed/uncompressed)"
  echo
  "$APKANALYZER" apk file-size "$APK"
  echo
  echo "## DEX classes per package (top 30)"
  echo
  "$APKANALYZER" dex packages --proguard-mappings "$APK" 2>/dev/null | head -30 || \
    "$APKANALYZER" dex packages "$APK" | head -30
  echo
  echo "## Resources summary"
  echo
  "$APKANALYZER" resources packages "$APK" | head -30
} > "$out"

echo "Baseline written to $out"
