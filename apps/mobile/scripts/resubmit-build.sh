#!/usr/bin/env bash
# Production EAS build + optional TestFlight submit for App Store resubmission.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ EAS production iOS build (auto-increments build number)…"
eas build --profile production --platform ios "$@"

read -r -p "Submit latest build to App Store Connect? [y/N] " ans
if [[ "${ans,,}" == "y" ]]; then
  eas submit --profile production --platform ios --latest
fi