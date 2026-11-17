# syntax=docker/dockerfile:1.7

# User docs image. Build from the repository root (the pnpm workspace lockfile lives there, and the
# dashboard mockups import styles and components from src/):
#   docker build -f docs-site/Dockerfile -t dmc-268-docs:local .
# next build writes a static export (basePath /docs) to docs-site/out; nginx serves it under /docs.

FROM node:24-alpine AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

# The root project too: the mockups import src/, whose dependencies (refractor and others) resolve
# from the root node_modules.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY docs-site/package.json ./docs-site/
RUN pnpm install --frozen-lockfile --filter . --filter ./docs-site

# Baked into the pages at build time; empty means the staging dashboard (docs-site/lib/shared.ts).
ARG NEXT_PUBLIC_APP_URL=""
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY src ./src
COPY docs-site ./docs-site
RUN pnpm --dir docs-site run build

# Slim: no curl, no extra nginx modules and their libraries. Nothing in the container uses them
# (the healthcheck is busybox wget), and each is one more package for Trivy to turn red on.
FROM nginxinc/nginx-unprivileged:1.30-alpine-slim AS runtime

USER root
# No package list: apk add would install what slim leaves out. apk update stays for its log line
# (docs/CICD.md §1); it leaves its indexes in the cache, so the cache goes in this same layer.
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

COPY docker/docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/docs-site/out /usr/share/nginx/html/docs

USER nginx
EXPOSE 8080

# --start-interval: without it the first probe waits 5 s, whatever the time nginx takes to start.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --start-interval=1s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
