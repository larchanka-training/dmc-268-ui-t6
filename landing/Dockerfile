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

FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime

USER root
RUN apk update && apk upgrade --no-cache && apk add --no-cache --upgrade pcre2 tiff libexpat brotli-libs curl

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

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
