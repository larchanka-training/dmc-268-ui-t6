#!/bin/sh
# Fails when the prod bundle (dist/assets/*.js) carries mock/demo code or fixture ids, or when the
# chunk holding env.ts's first schema can run before the zod `jitless` call.
# Run it after `pnpm build` (Refs #74, AC 2.4; #65, AC 3.3 / 3.5).
#
# Exit codes: 0 clean, 1 bundle is dirty or ill-formed or dist is missing, 2 grep itself failed.
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

# zod jitless runs before the first schema (Refs #74). `z.config({ jitless: true })`
# (src/shared/config/zodJitless.ts) must run before the first schema is built, and the first schema is
# `shared/config/env.ts`'s `z.object`. Two chunks decide it: the one holding the minified call and the one
# holding env.ts. The jitless chunk must be imported by the env chunk (ES modules run their imports
# first), or be the same file with the call ahead of env.ts's schema. Vite's chunking can break this
# without changing a byte of source: a `maxSize` split or a dropped `vendor-zod` group is enough.
jitless_call='jitless:!0'
env_marker='VITE_API_BASE_URL'

# Sets located_count, located_first and located_files for the dist/assets/*.js files holding "$1".
locate() {
  status=0
  located_files=$(grep -l -F -e "$1" -- "$assets"/*.js) || status=$?
  case $status in
    0 | 1) ;;
    *)
      echo "verify-prod-bundle: grep failed (exit $status) on '$1'" >&2
      exit 2
      ;;
  esac
  located_count=0
  located_first=
  while IFS= read -r located_file; do
    if [ -n "$located_file" ]; then
      located_count=$((located_count + 1))
      if [ -z "$located_first" ]; then
        located_first=$located_file
      fi
    fi
  done <<EOF
$located_files
EOF
}

# Prints the byte offset of the first "$1" in the file "$2".
first_offset() {
  status=0
  matches=$(grep -b -o -F -e "$1" -- "$2") || status=$?
  if [ "$status" -ne 0 ]; then
    echo "verify-prod-bundle: grep failed (exit $status) on '$1' in $2" >&2
    exit 2
  fi
  printf '%s\n' "$matches" | sed -n '1s/:.*//p'
}

locate "$jitless_call"
jitless_count=$located_count
jitless_file=$located_first
jitless_files=$located_files
locate "$env_marker"
env_count=$located_count
env_file=$located_first
env_files=$located_files

if [ "$jitless_count" -ne 1 ]; then
  echo "verify-prod-bundle: expected the zod jitless call '$jitless_call' in exactly one chunk, found $jitless_count" >&2
  if [ "$jitless_count" -gt 0 ]; then
    printf '%s\n' "$jitless_files" | sed 's/^/  /' >&2
  fi
  fail=1
elif [ "$env_count" -ne 1 ]; then
  echo "verify-prod-bundle: expected env.ts's schema ('$env_marker') in exactly one chunk, found $env_count" >&2
  if [ "$env_count" -gt 0 ]; then
    printf '%s\n' "$env_files" | sed 's/^/  /' >&2
  fi
  fail=1
elif [ "$jitless_file" = "$env_file" ]; then
  jitless_at=$(first_offset "$jitless_call" "$jitless_file")
  env_at=$(first_offset "$env_marker" "$env_file")
  if [ "$jitless_at" -gt "$env_at" ]; then
    echo "verify-prod-bundle: zod jitless runs after the first schema in $env_file" \
      "(jitless call at byte $jitless_at, '$env_marker' at byte $env_at)" >&2
    fail=1
  fi
else
  # Rolldown writes `import{..}from"./x.js"` and `import"./x.js"`; an unminified build adds spaces.
  jitless_base=$(printf '%s' "${jitless_file##*/}" | sed 's/[.]/\\./g')
  status=0
  grep -q -E "(from|import)[[:space:]]*[\"'\`]\\./${jitless_base}[\"'\`]" -- "$env_file" || status=$?
  case $status in
    0) ;;
    1)
      echo "verify-prod-bundle: zod jitless can run after the first schema:" \
        "$env_file ('$env_marker') does not import $jitless_file ('$jitless_call')" >&2
      fail=1
      ;;
    *)
      echo "verify-prod-bundle: grep failed (exit $status) on the imports of $env_file" >&2
      exit 2
      ;;
  esac
fi

if [ "$fail" -ne 0 ]; then
  echo 'verify-prod-bundle: FAILED, the prod bundle is not clean' >&2
  exit 1
fi

echo "verify-prod-bundle: OK, $# file(s) in $assets are clean"
