#!/usr/bin/env bash
# External check of the landing behind the edge proxy, run on the CI runner.
#
#   landing-healthcheck.sh <base-url> <app-url>      /health is ok and /config.json carries <app-url>
#
# The landing hostnames are routed by the API repo (deploy/edge/Caddyfile, api#240, deployed
# before the landing). Every failure, a TLS handshake one included, goes through the retries of
# healthcheck.sh (12 x 5 s): a certificate still being issued gets time, a missing route fails.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${1:-}"
EXPECTED="${2:-}"

if [[ -z "${BASE_URL}" || -z "${EXPECTED}" ]]; then
  echo "usage: landing-healthcheck.sh <base-url> <app-url>" >&2
  exit 1
fi
BASE_URL="${BASE_URL%/}"

"${SCRIPT_DIR}/healthcheck.sh" "${BASE_URL}/health"

expected_config="{\"appUrl\":\"${EXPECTED}\"}"
if ! config="$(curl -fsS --retry 5 --retry-delay 3 --retry-all-errors --max-time 5 "${BASE_URL}/config.json")"; then
  echo "failed to read ${BASE_URL}/config.json" >&2
  exit 1
fi
if [[ "${config}" != "${expected_config}" ]]; then
  echo "${BASE_URL}/config.json is '${config}', expected '${expected_config}'" >&2
  exit 1
fi
echo "config check passed: ${config}"
