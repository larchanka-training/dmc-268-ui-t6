#!/usr/bin/env bash
# External check of the landing behind the edge proxy, run on the CI runner.
#
#   landing-healthcheck.sh <base-url> <app-url>      /health is ok and /config.json carries <app-url>
#
# The landing hostnames are routed by the API repo (deploy/edge/Caddyfile). Until that route is
# deployed Caddy has no site, hence no certificate, for <base-url> and the TLS handshake fails
# (curl exit 35). LANDING_EDGE_ROUTED (repository variable of the same name) bounds that window:
#   unset or false   exit 35 skips the check with a warning; compose up --wait (the container
#                    health check on the VM) stays the only gate
#   true             the route is live: exit 35 (no site, no certificate) fails like any other error
# Any other answer is checked strictly in both cases.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${1:-}"
EXPECTED="${2:-}"
ROUTED="${LANDING_EDGE_ROUTED:-false}"

if [[ -z "${BASE_URL}" || -z "${EXPECTED}" ]]; then
  echo "usage: landing-healthcheck.sh <base-url> <app-url>" >&2
  exit 1
fi
if [[ "${ROUTED}" != "true" && "${ROUTED}" != "false" ]]; then
  echo "LANDING_EDGE_ROUTED must be true, false or unset, got: ${ROUTED}" >&2
  exit 1
fi
BASE_URL="${BASE_URL%/}"

probe=0
curl -s -o /dev/null --max-time 10 "${BASE_URL}/" || probe=$?
if [[ "${probe}" -eq 35 ]]; then
  if [[ "${ROUTED}" == "true" ]]; then
    echo "TLS handshake with ${BASE_URL} failed (curl exit 35), but LANDING_EDGE_ROUTED=true: the edge proxy has no site or certificate for the landing host (deploy/edge/Caddyfile and Caddy logs in the API repo)" >&2
    exit 1
  fi
  echo "::warning::the edge proxy has no TLS site for ${BASE_URL} yet (curl exit 35, route from the API repo, deploy/edge/Caddyfile); external landing check skipped, the container passed its health check on the VM. Set the repository variable LANDING_EDGE_ROUTED=true once that route is deployed"
  exit 0
fi

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
