#!/usr/bin/env bash

# Helpers for the Docker Compose .env file on the host (IMAGE, DEPLOY_MODE, EDGE_ALIAS). Values
# are written so Compose reads them literally ($ escaped as $$). Never source that file as
# shell code.

read_compose_env_var() {
  local key="$1" file="$2"
  [[ -f "${file}" ]] || return 1
  awk -F= -v k="${key}" '
    $0 !~ /^[[:space:]]*#/ && $1 == k {
      sub(/^[^=]*=/, "")
      gsub(/^[[:space:]]+|[[:space:]]+$/, "")
      gsub(/\$\$/, "$")
      print
      exit
    }
  ' "${file}"
}

escape_compose_value() {
  local value="$1"
  value="${value//\$/\$\$}"
  printf '%s' "${value}"
}

write_compose_env_file() {
  local file="$1" image="$2" deploy_mode="$3" edge_alias="$4"
  umask 077
  {
    printf 'IMAGE=%s\n' "$(escape_compose_value "${image}")"
    printf 'DEPLOY_MODE=%s\n' "$(escape_compose_value "${deploy_mode}")"
    printf 'EDGE_ALIAS=%s\n' "$(escape_compose_value "${edge_alias}")"
  } > "${file}"
  chmod 600 "${file}"
}
