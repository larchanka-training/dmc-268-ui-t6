# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src ./src

ARG VITE_GITHUB_CLIENT_ID
ARG VITE_GITHUB_APP_SLUG
# User docs address for the user menu; empty: the staging docs (src/shared/config/env.ts).
ARG VITE_DOCS_URL
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
ENV VITE_GITHUB_APP_SLUG=$VITE_GITHUB_APP_SLUG
ENV VITE_DOCS_URL=$VITE_DOCS_URL

RUN pnpm run build

# Slim: no curl, no extra nginx modules and their libraries. Nothing in the container uses them
# (the healthcheck is busybox wget), and each is one more package for Trivy to turn red on.
FROM nginxinc/nginx-unprivileged:1.30-alpine-slim AS runtime

USER root
# No package list: apk add would install what slim leaves out. apk update stays for its log line
# (docs/CICD.md §1); it leaves its indexes in the cache, so the cache goes in this same layer.
RUN apk update && apk upgrade --no-cache && rm -rf /var/cache/apk/*

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx
EXPOSE 8080

# --start-interval: without it the first probe waits 5 s, whatever the time nginx takes to start.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --start-interval=1s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
