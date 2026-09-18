#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dmc-268-ui}"
IMAGE="${1:-${IMAGE:-}}"
COMPOSE_FILE="${APP_DIR}/compose.yml"
STATE_FILE="${APP_DIR}/.deploy-state"

if [[ -z "${IMAGE}" ]]; then
  echo "usage: deploy.sh <image-ref>" >&2
  exit 1
fi

mkdir -p "${APP_DIR}"
cd "${APP_DIR}"

if [[ -f "${STATE_FILE}" ]]; then
  cp "${STATE_FILE}" "${STATE_FILE}.previous"
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

if docker inspect dmc-268-ui-bootstrap >/dev/null 2>&1; then
  docker rm -f dmc-268-ui-bootstrap >/dev/null
fi

docker pull "${IMAGE}"
printf 'IMAGE=%s\n' "${IMAGE}" > "${APP_DIR}/.env"
docker compose -f "${COMPOSE_FILE}" --env-file "${APP_DIR}/.env" up -d --remove-orphans --wait --wait-timeout 90

{
  echo "current_image=${IMAGE}"
  echo "deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "${STATE_FILE}"

echo "deployed ${IMAGE}"
