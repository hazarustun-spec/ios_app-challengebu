#!/usr/bin/env bash
# Run the mobile test suite one FILE per process.
#
# `bun test` runs every file in a single process, and `mock.module` is global
# to that process. Each component suite mocks `react-native` down to the
# handful of primitives it renders, and those stubs are all different — so
# whichever file ran last decided what every other file saw. Run together the
# suite reported 14 snapshot mismatches and 9 link errors; run one file at a
# time, every one of them passes.
#
# bun has no per-file isolation flag, so the isolation is a loop. Cost is a
# process start per file (~0.3s), which is nothing next to a suite that was
# lying about its own results.
set -uo pipefail
cd "$(dirname "$0")/.."

# Raise the descriptor limit: bun's module resolution opens enough files at
# once to hit macOS's default 256 and fail with EMFILE before running a test.
ulimit -n 8192 2>/dev/null || true

failed=()
while IFS= read -r file; do
  if ! bun test "$file"; then
    failed+=("$file")
  fi
done < <(find components lib stores tests -name '*.test.ts' -o -name '*.test.tsx' | sort)

if [ ${#failed[@]} -gt 0 ]; then
  echo ""
  echo "FAILED (${#failed[@]}):"
  printf '  %s\n' "${failed[@]}"
  exit 1
fi
echo ""
echo "All test files passed."
