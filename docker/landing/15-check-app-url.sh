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
printf '%s' "$url" | grep -Eq '^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[A-Za-z0-9._~/-]*)?$' \
  || fail "APP_URL must be http(s)://<host>[:port][/path] (got: $url)"
[ -w "${NGINX_ENVSUBST_OUTPUT_DIR:-/etc/nginx/conf.d}" ] \
  || fail "${NGINX_ENVSUBST_OUTPUT_DIR:-/etc/nginx/conf.d} is not writable; config.json would not be rendered"

echo "$ME: config.json appUrl=$url"
