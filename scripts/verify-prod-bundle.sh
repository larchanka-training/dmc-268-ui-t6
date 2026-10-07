#!/bin/sh
# Fails when the prod bundle (dist/assets/*.js) carries mock/demo code or fixture ids.
# Run it after `pnpm build` (Refs #74, AC 2.4; #65, AC 3.3 / 3.5).
#
# Exit codes: 0 clean, 1 bundle is dirty or dist is missing, 2 grep itself failed.
set -eu

cd "$(dirname "$0")/.."

assets=dist/assets

# Demo-login text and token, then the fixture id prefixes: demo run (11111111, demoRun.ts), repositories
# (22222222, app-state.ts), findings (33333333, mockRunReview.ts, duoActions.fixture.ts).
patterns='Демо-вход
mock_jwt
11111111-1111-4111-8111
22222222-2222-4222-8222
33333333-3333-4333-8333'

# An unmatched glob stays literal, so test the first expansion: without a build there is nothing to check.
set -- "$assets"/*.js
if [ ! -e "$1" ]; then
  echo "verify-prod-bundle: no $assets/*.js, run 'pnpm build' first" >&2
  exit 1
fi

fail=0

# grep exits 0 on a match, 1 on none and 2 on an error: only 1 means "not found".
# `status=0; ... || status=$?` keeps `set -e` from ending the script on the expected exit 1.
while IFS= read -r pattern; do
  status=0
  hits=$(grep -l -F -e "$pattern" -- "$@") || status=$?
  case $status in
    0)
      echo "verify-prod-bundle: found '$pattern' in:" >&2
      printf '%s\n' "$hits" | sed 's/^/  /' >&2
      fail=1
      ;;
    1) ;;
    *)
      echo "verify-prod-bundle: grep failed (exit $status) on '$pattern'" >&2
      if [ -n "$hits" ]; then
        echo "verify-prod-bundle: found '$pattern' in:" >&2
        printf '%s\n' "$hits" | sed 's/^/  /' >&2
      fi
      exit 2
      ;;
  esac
done <<EOF
$patterns
EOF

# The mock transport must not be split into a prod chunk either.
for file in "$@"; do
  case ${file##*/} in
    mockTransport-*.js)
      echo "verify-prod-bundle: mock transport chunk in the bundle: $file" >&2
      fail=1
      ;;
  esac
done

if [ "$fail" -ne 0 ]; then
  echo 'verify-prod-bundle: FAILED, the prod bundle is not clean' >&2
  exit 1
fi

echo "verify-prod-bundle: OK, $# file(s) in $assets are clean"
