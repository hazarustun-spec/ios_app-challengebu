#!/usr/bin/env bash
# Production EAS build + optional TestFlight submit for App Store resubmission.
# Run from anywhere:  apps/mobile/scripts/resubmit-build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Prefer global `eas`, fall back to npx (no global install required).
if command -v eas >/dev/null 2>&1; then
  EAS=(eas)
else
  EAS=(npx --yes eas-cli)
fi

echo "→ EAS production iOS build (auto-increments build number)…"
"${EAS[@]}" build --profile production --platform ios "$@"

read -r -p "Submit latest build to App Store Connect? [y/N] " ans
case "$ans" in
  y|Y|yes|YES) "${EAS[@]}" submit --profile production --platform ios --latest ;;
esac