#!/usr/bin/env bash
# External check of the user docs behind the edge proxy, run on the CI runner.
#
#   docs-healthcheck.sh <docs-url>      e.g. https://staging.<APP_DOMAIN>/docs
#
# The docs share the landing host: the edge proxy (API repo, deploy/edge/Caddyfile) sends /docs and
# /docs/* there to docs-staging:8080, everything else to the landing. So the check asks for the
# docs service by name: without the route, /docs/health reaches the landing, which answers with its
# own page. Every failure, a TLS handshake one included, goes through the retries of
# healthcheck.sh (12 x 5 s).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_URL="${1:-}"

if [[ -z "${DOCS_URL}" ]]; then
  echo "usage: docs-healthcheck.sh <docs-url>" >&2
  exit 1
fi
DOCS_URL="${DOCS_URL%/}"

"${SCRIPT_DIR}/healthcheck.sh" "${DOCS_URL}/health"

expected_health='{"status":"ok","service":"dmc-268-docs"}'
if ! health="$(curl -fsS --retry 5 --retry-delay 3 --retry-all-errors --max-time 5 "${DOCS_URL}/health")"; then
  echo "failed to read ${DOCS_URL}/health" >&2
  exit 1
fi
if [[ "${health}" != "${expected_health}" ]]; then
  echo "${DOCS_URL}/health is '${health}', expected '${expected_health}' (is /docs routed to the docs container?)" >&2
  exit 1
fi

# The Introduction (the base path itself) and one inner page must be real pages.
for page in "${DOCS_URL}" "${DOCS_URL}/quickstart"; do
  if ! code="$(curl -sS -o /dev/null -w '%{http_code}' --retry 5 --retry-delay 3 --retry-all-errors --max-time 5 "${page}")"; then
    echo "failed to read ${page}" >&2
    exit 1
  fi
  if [[ "${code}" != "200" ]]; then
    echo "${page} returned HTTP ${code}, expected 200" >&2
    exit 1
  fi
done
echo "docs check passed: ${health}, ${DOCS_URL} and ${DOCS_URL}/quickstart answer 200"
