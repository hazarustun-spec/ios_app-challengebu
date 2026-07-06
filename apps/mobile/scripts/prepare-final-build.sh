#!/usr/bin/env bash
# Pre-flight + production EAS build for final App Store submission.
set -euo pipefail
cd "$(dirname "$0")/.."

if command -v eas >/dev/null 2>&1; then
  EAS=(eas)
else
  EAS=(npx --yes eas-cli)
fi

echo "═══════════════════════════════════════════"
echo " ChallengeBu — final production build"
echo "═══════════════════════════════════════════"
echo ""
echo "Before continuing, confirm:"
echo "  [ ] REVIEW_OTP_CODE=424242 on prod Supabase"
echo "  [ ] review-login deployed"
echo "  [ ] seed-review-account-production.sql run (optional)"
echo "  [ ] Demo video recorded (link goes in ASC Notes after build)"
echo ""

"${EAS[@]}" env:list --environment production || true
echo ""

read -r -p "EAS production env shows URL + anon key? [y/N] " ok
if [[ "$ok" != "y" && "$ok" != "Y" ]]; then
  echo "Abort. Set env vars first:"
  echo "  eas env:create production --name EXPO_PUBLIC_SUPABASE_URL --value https://zbjkauljjdosyuwguuhv.supabase.co --visibility plaintext --non-interactive"
  echo "  eas env:create production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key> --visibility sensitive --non-interactive"
  exit 1
fi

export EAS_BUILD_NO_EXPO_GO_WARNING=true
echo "→ Starting production iOS build…"
"${EAS[@]}" build --profile production --platform ios "$@"

echo ""
echo "Build finished. Next:"
echo "  1. TestFlight smoke test (review login 424242)"
echo "  2. eas submit --profile production --platform ios --latest"
echo "  3. ASC Notes + demo video URL → docs/FINAL_BUILD_CHECKLIST.md"