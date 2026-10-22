#!/usr/bin/env bash
# External check of the landing behind the edge proxy, run on the CI runner.
#
#   landing-healthcheck.sh <base-url> <app-url>      /health is ok and /config.json carries <app-url>
#   landing-healthcheck.sh <base-url> --bootstrap    / answers 200 (bootstrap nginx after a rollback)
#
# The landing hostnames are routed by the API repo (deploy/edge/Caddyfile). Until that route is
# deployed Caddy has no site, hence no certificate, for <base-url> and the TLS handshake fails
# (curl exit 35): the check is then skipped with a warning, and compose up --wait (the container
# health check on the VM) stays the only gate. Any other answer is checked strictly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${1:-}"
EXPECTED="${2:-}"

if [[ -z "${BASE_URL}" || -z "${EXPECTED}" ]]; then
  echo "usage: landing-healthcheck.sh <base-url> <app-url|--bootstrap>" >&2
  exit 1
fi
BASE_URL="${BASE_URL%/}"

probe=0
curl -s -o /dev/null --max-time 10 "${BASE_URL}/" || probe=$?
if [[ "${probe}" -eq 35 ]]; then
  echo "::warning::the edge proxy has no TLS site for ${BASE_URL} yet (route from the API repo, deploy/edge/Caddyfile); external landing check skipped, the container passed its health check on the VM"
  exit 0
fi

if [[ "${EXPECTED}" == "--bootstrap" ]]; then
  # The bootstrap nginx has no /health; it must answer 200 on /.
  if ! code="$(curl -fsS -o /dev/null -w '%{http_code}' --retry 12 --retry-delay 5 --retry-all-errors --max-time 5 "${BASE_URL}/")"; then
    echo "bootstrap check failed on ${BASE_URL}/ (HTTP ${code:-none})" >&2
    exit 1
  fi
  if [[ "${code}" != "200" ]]; then
    echo "bootstrap returned HTTP ${code} on ${BASE_URL}/, expected 200" >&2
    exit 1
  fi
  echo "bootstrap check passed: HTTP ${code} on ${BASE_URL}/"
  exit 0
fi

"${SCRIPT_DIR}/healthcheck.sh" "${BASE_URL}/health"

expected_config="{\"appUrl\":\"${EXPECTED}\"}"
if ! config="$(curl -fsS --max-time 5 "${BASE_URL}/config.json")"; then
  echo "failed to read ${BASE_URL}/config.json" >&2
  exit 1
fi
if [[ "${config}" != "${expected_config}" ]]; then
  echo "${BASE_URL}/config.json is '${config}', expected '${expected_config}'" >&2
  exit 1
fi
echo "config check passed: ${config}"
