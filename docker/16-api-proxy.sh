#!/bin/sh
# Renders the /api/ location from API_UPSTREAM, after 15-local-resolvers.envsh of the base image has
# set NGINX_LOCAL_RESOLVERS. Empty: nothing is written and nginx has no such location, the case
# behind the edge proxy, where /api/* never reaches this nginx. A bad value stops the container
# (compose up --wait fails) instead of serving a broken route.
set -eu

ME=$(basename "$0")
upstream="${API_UPSTREAM:-}"

[ -n "$upstream" ] || exit 0

# No path: a URI part in a proxy_pass variable would replace the whole URI of every request. No
# https: nginx would not verify the certificate, and the backend is on the compose network anyway.
if ! printf '%s' "$upstream" | grep -Eq '^http://[A-Za-z0-9._-]+(:[0-9]{1,5})?$'; then
  echo "$ME: ERROR: API_UPSTREAM must be http://<host>[:port], no path (got: $upstream)" >&2
  exit 1
fi

envsubst '${API_UPSTREAM} ${NGINX_LOCAL_RESOLVERS}' \
  < /etc/nginx/api-proxy.conf.template > /etc/nginx/runtime/api-proxy.conf

echo "$ME: /api/* -> $upstream"
