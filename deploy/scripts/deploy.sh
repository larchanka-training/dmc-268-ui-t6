#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source-path=SCRIPTDIR source=env-file.sh
source "${SCRIPT_DIR}/env-file.sh"

APP_DIR="${APP_DIR:-/opt/dmc-268-ui}"
IMAGE="${1:-${IMAGE:-}}"
COMPOSE_FILE="${APP_DIR}/compose.yml"
STATE_FILE="${APP_DIR}/.deploy-state"
ENV_FILE="${APP_DIR}/.env"
ROLLBACK_SCRIPT="${APP_DIR}/rollback.sh"
# One compose project per app dir: dmc-268-ui on the Terraform host (the project cloud-init's
# dmc-268-ui-bootstrap belongs to), dmc-268-ui-staging on the shared course VPS.
COMPOSE_PROJECT="${COMPOSE_PROJECT:-$(basename "${APP_DIR}")}"
BOOTSTRAP_NAME="${BOOTSTRAP_NAME:-${COMPOSE_PROJECT}-bootstrap}"

if [[ -z "${IMAGE}" ]]; then
  echo "usage: deploy.sh <image-ref>" >&2
  exit 1
fi

mkdir -p "${APP_DIR}"
cd "${APP_DIR}"

if [[ -f "${ENV_FILE}" ]]; then
  DEPLOY_MODE="${DEPLOY_MODE:-$(read_compose_env_var DEPLOY_MODE "${ENV_FILE}")}"
  EDGE_ALIAS="${EDGE_ALIAS:-$(read_compose_env_var EDGE_ALIAS "${ENV_FILE}")}"
fi

# ports: publish the UI on host port 80 (dedicated Terraform host).
# edge: no host port; join the edge proxy network as EDGE_ALIAS (shared course VPS).
DEPLOY_MODE="${DEPLOY_MODE:-ports}"
if [[ "${DEPLOY_MODE}" != "ports" && "${DEPLOY_MODE}" != "edge" ]]; then
  echo "DEPLOY_MODE must be ports or edge, got: ${DEPLOY_MODE}" >&2
  exit 1
fi
if [[ "${DEPLOY_MODE}" == "edge" && ! "${EDGE_ALIAS:-}" =~ ^[a-z0-9]+(-[a-z0-9]+)+$ ]]; then
  echo "EDGE_ALIAS (<service>-<env>) is required in edge mode, got: ${EDGE_ALIAS:-}" >&2
  exit 1
fi
COMPOSE=(docker compose -p "${COMPOSE_PROJECT}" -f "${COMPOSE_FILE}" -f "${APP_DIR}/compose.${DEPLOY_MODE}.yml" --env-file "${ENV_FILE}")

# Per-run registry credentials: API and UI deploys share the root account on the course VPS, so
# docker login must not touch /root/.docker/config.json. A rollback started from here reuses it.
# Set up after the checks above: a rejected call makes no docker call at all.
DOCKER_CONFIG="$(mktemp -d)"
export DOCKER_CONFIG

logout_registry() {
  docker logout ghcr.io >/dev/null 2>&1 || true
}
cleanup_registry() {
  logout_registry
  rm -rf "${DOCKER_CONFIG}"
}
trap cleanup_registry EXIT

if [[ -f "${STATE_FILE}" ]]; then
  cp "${STATE_FILE}" "${STATE_FILE}.previous"
fi

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER:-github}" --password-stdin
fi

docker pull "${IMAGE}"
write_compose_env_file "${ENV_FILE}" "${IMAGE}" "${DEPLOY_MODE}" "${EDGE_ALIAS:-}"

if docker inspect "${BOOTSTRAP_NAME}" >/dev/null 2>&1; then
  docker rm -f "${BOOTSTRAP_NAME}" >/dev/null
fi

if ! "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout 90; then
  echo "compose up failed; rolling back" >&2
  ROLLBACK_MODE=auto "${ROLLBACK_SCRIPT}"
  exit 1
fi

# The host is a shared root account: drop the GHCR credential right after the last pull
# (compose up pulls again because of pull_policy: always). The EXIT trap stays as a fallback.
logout_registry

{
  echo "current_image=${IMAGE}"
  echo "deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "${STATE_FILE}"

echo "deployed ${IMAGE}"
