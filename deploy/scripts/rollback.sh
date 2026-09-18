#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/dmc-268-ui}"
COMPOSE_FILE="${APP_DIR}/compose.yml"
STATE_FILE="${APP_DIR}/.deploy-state"
PREVIOUS_FILE="${STATE_FILE}.previous"
REQUESTED_IMAGE="${1:-}"
BOOTSTRAP_NAME="${BOOTSTRAP_NAME:-dmc-268-ui-bootstrap}"
BOOTSTRAP_IMAGE="${BOOTSTRAP_IMAGE:-nginx:1.27-alpine}"

restore_bootstrap() {
  if [[ -f "${COMPOSE_FILE}" && -f "${APP_DIR}/.env" ]]; then
    docker compose -f "${COMPOSE_FILE}" --env-file "${APP_DIR}/.env" down --remove-orphans >/dev/null 2>&1 || true
  fi

  docker rm -f "${BOOTSTRAP_NAME}" >/dev/null 2>&1 || true
  docker pull "${BOOTSTRAP_IMAGE}"
  docker run -d --name "${BOOTSTRAP_NAME}" --restart unless-stopped \
    --label dmc-268.role=bootstrap -p 80:80 "${BOOTSTRAP_IMAGE}"

  rm -f "${STATE_FILE}" "${PREVIOUS_FILE}"
  echo "restored bootstrap container ${BOOTSTRAP_NAME}"
}

if [[ -n "${REQUESTED_IMAGE}" ]]; then
  IMAGE="${REQUESTED_IMAGE}"
elif [[ -f "${PREVIOUS_FILE}" ]]; then
  IMAGE="$(awk -F= '/^current_image=/{print $2}' "${PREVIOUS_FILE}")"
elif [[ -f "${STATE_FILE}" ]]; then
  echo "deployment recorded but no previous release to restore" >&2
  exit 1
else
  restore_bootstrap
  exit 0
fi

if [[ -z "${IMAGE}" ]]; then
  echo "previous image reference is empty" >&2
  exit 1
fi

cd "${APP_DIR}"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

if docker inspect "${BOOTSTRAP_NAME}" >/dev/null 2>&1; then
  docker rm -f "${BOOTSTRAP_NAME}" >/dev/null
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
