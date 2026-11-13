# syntax=docker/dockerfile:1.7

# Landing image. Build from the repository root (the pnpm workspace lockfile lives there):
#   docker build -f landing/Dockerfile -t dmc-268-landing:local .
# The app address is set at container start with APP_URL, not at build time (docker/landing/).

FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY landing/package.json ./landing/
RUN pnpm install --frozen-lockfile --filter ./landing

COPY landing ./landing
RUN pnpm --dir landing run build

# Slim: no curl, no extra nginx modules and their libraries. Nothing in the container uses them
# (the healthcheck is busybox wget), and each is one more package for Trivy to turn red on.
FROM nginxinc/nginx-unprivileged:1.30-alpine-slim AS runtime

USER root
# No package list: apk add would install what slim leaves out. apk update stays for its log line
# (docs/CICD.md §1); it leaves its indexes in the cache, so the cache goes in this same layer.
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

# config.json is rendered from APP_URL at start by the image's envsubst step into a dir of its
# own (not the web root, which stays read-only for nginx); 15-check-app-url.sh runs before it.
# Group-writable like the base image's /etc/nginx dirs: an arbitrary uid with gid 0 works too.
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/runtime
RUN mkdir -p /etc/nginx/runtime /etc/nginx/templates && chown nginx:root /etc/nginx/runtime \
  && chmod 775 /etc/nginx/runtime

COPY docker/landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/landing/config.json.template /etc/nginx/templates/config.json.template
# Executable in git; COPY keeps the mode (no --chmod: the legacy builder lacks it).
COPY docker/landing/15-check-app-url.sh /docker-entrypoint.d/15-check-app-url.sh
COPY --from=build /app/landing/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

# --start-interval: without it the first probe waits 5 s, whatever the time nginx takes to start.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --start-interval=1s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
