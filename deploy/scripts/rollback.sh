#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dmc-268-ui}"
COMPOSE_FILE="${APP_DIR}/compose.yml"
STATE_FILE="${APP_DIR}/.deploy-state"
PREVIOUS_FILE="${STATE_FILE}.previous"
REQUESTED_IMAGE="${1:-}"

if [[ -n "${REQUESTED_IMAGE}" ]]; then
  IMAGE="${REQUESTED_IMAGE}"
elif [[ -f "${PREVIOUS_FILE}" ]]; then
  IMAGE="$(awk -F= '/^current_image=/{print $2}' "${PREVIOUS_FILE}")"
else
  echo "no previous deployment recorded and no image tag provided" >&2
  exit 1
fi

if [[ -z "${IMAGE}" ]]; then
  echo "previous image reference is empty" >&2
  exit 1
fi

cd "${APP_DIR}"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

docker pull "${IMAGE}"
printf 'IMAGE=%s\n' "${IMAGE}" > "${APP_DIR}/.env"
docker compose -f "${COMPOSE_FILE}" --env-file "${APP_DIR}/.env" up -d --remove-orphans --wait --wait-timeout 90

{
  echo "current_image=${IMAGE}"
  echo "deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "rolled_back=true"
} > "${STATE_FILE}"

echo "rolled back to ${IMAGE}"
