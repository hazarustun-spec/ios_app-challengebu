#!/usr/bin/env bash
# Local / CI Maestro runner — requires booted iOS Simulator + app installed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MOBILE="$ROOT/apps/mobile"
SUPABASE="$ROOT/packages/supabase"

export PATH="${HOME}/.maestro/bin:${PATH}"
export JAVA_HOME="${JAVA_HOME:-$(brew --prefix openjdk@17 2>/dev/null)/libexec/openjdk.jdk/Contents/Home}"

echo "→ Checking Maestro…"
command -v maestro >/dev/null

echo "→ Starting Supabase (if not running)…"
cd "$SUPABASE"
if ! curl -sf http://127.0.0.1:54321/rest/v1/ -o /dev/null 2>/dev/null; then
  supabase start
  supabase db reset --no-seed=false
fi

echo "→ Serving Edge Functions with review OTP secret…"
if ! curl -sf http://127.0.0.1:54321/functions/v1/ -o /dev/null 2>/dev/null; then
  nohup supabase functions serve --no-verify-jwt --env-file functions/.env.test \
    > /tmp/challengebu-functions.log 2>&1 &
  for i in $(seq 1 60); do
    if curl -sf http://127.0.0.1:54321/functions/v1/ -o /dev/null 2>/dev/null; then break; fi
    sleep 1
  done
fi

cd "$MOBILE"
FLOW="${1:-.maestro/review-login.yaml}"
echo "→ Maestro: $FLOW"
maestro test "$FLOW"