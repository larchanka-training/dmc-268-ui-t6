#!/bin/sh
# Runs before 20-envsubst-on-templates.sh renders config.json from APP_URL. The value goes into a
# JSON string unescaped, so only a plain http(s) URL passes; anything else stops the container
# (compose up --wait fails and the deploy rolls back) instead of serving a broken config.
set -eu

ME=$(basename "$0")
url="${APP_URL:-}"

fail() {
  echo "$ME: ERROR: $1" >&2
  exit 1
}

[ -n "$url" ] || fail "APP_URL is required (the app address the landing buttons open, e.g. https://staging-ui.example.com)"
case "$url" in
  *[!A-Za-z0-9:/._~-]*) fail "APP_URL may contain only letters, digits and :/._~- (got: $url)" ;;
esac
# Host: dot-separated labels of letters, digits and inner hyphens; port: 1-65535. Anything that
# new URL() in the browser would reject must stop here, or the landing silently falls back to its
# default address.
label='[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?'
printf '%s' "$url" | grep -Eq "^https?://${label}(\\.${label})*(:[0-9]{1,5})?(/[A-Za-z0-9._~/-]*)?\$" \
  || fail "APP_URL must be http(s)://<host>[:port][/path] (got: $url)"
authority=${url#*://}
authority=${authority%%/*}
case "$authority" in
  *:*)
    port=${authority##*:}
    [ "$port" -ge 1 ] && [ "$port" -le 65535 ] || fail "APP_URL port must be 1-65535 (got: $url)"
    ;;
esac
# A real write: test -w checks only the mode bits and misses a read-only mount (--read-only).
out_dir="${NGINX_ENVSUBST_OUTPUT_DIR:-/etc/nginx/conf.d}"
probe="$out_dir/.write-probe.$$"
if ! (: > "$probe") 2>/dev/null; then
  fail "$out_dir is not writable; config.json would not be rendered"
fi
rm -f "$probe"

echo "$ME: config.json appUrl=$url"
