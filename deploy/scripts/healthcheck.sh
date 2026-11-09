#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
# Optional: the "service" the /health body must name. Behind the shared edge proxy another app's
# /health must not pass (Deploy prod passes dmc-268-ui). The landing and docs checks call this
# script without it.
SERVICE="${2:-}"
ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-12}"
SLEEP_SECONDS="${HEALTHCHECK_SLEEP:-5}"

if [[ -z "${TARGET}" ]]; then
  echo "usage: healthcheck.sh <url> [service]" >&2
  exit 1
fi

if [[ "${TARGET}" != */health ]]; then
  TARGET="${TARGET%/}/health"
fi

for attempt in $(seq 1 "${ATTEMPTS}"); do
  if body="$(curl -fsS --max-time 5 "${TARGET}")"; then
    if printf '%s' "${body}" | grep -q '"status":"ok"' \
      && { [[ -z "${SERVICE}" ]] || printf '%s' "${body}" | grep -qF "\"service\":\"${SERVICE}\""; }; then
      echo "health check passed on attempt ${attempt}: ${body}"
      exit 0
    fi
    echo "unexpected health payload on attempt ${attempt}: ${body}" >&2
  else
    echo "health check attempt ${attempt}/${ATTEMPTS} failed" >&2
  fi
  sleep "${SLEEP_SECONDS}"
done

echo "health check failed after ${ATTEMPTS} attempts: ${TARGET}" >&2
exit 1
