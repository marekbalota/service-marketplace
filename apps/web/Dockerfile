# syntax=docker/dockerfile:1
# ---- Web image: TanStack Start SPA built to static files, served by nginx ----
# Build context is the REPO ROOT (so the Bun workspace resolves).
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_API_URL=https://marketplace-api.dyn.cloud.e-infra.cz \
#     --build-arg VITE_TURNSTILE_SITE_KEY=... -t marketplace-web .
#
# NOTE: VITE_* values are baked in at BUILD time (Vite inlines import.meta.env),
# so the API URL must be known when the image is built, not at deploy time.

# --- build the static SPA ---
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile
COPY . .

ARG VITE_API_URL
ARG VITE_TURNSTILE_SITE_KEY
# vite.config.ts uses envDir '../../', so write the build-time env to the repo-root .env
RUN printf 'VITE_API_URL=%s\nVITE_TURNSTILE_SITE_KEY=%s\n' \
      "$VITE_API_URL" "$VITE_TURNSTILE_SITE_KEY" > .env
RUN cd apps/web && bun run build

# --- serve static assets (unprivileged nginx, listens on :8080) ---
FROM nginxinc/nginx-unprivileged:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# TanStack Start SPA build output lives in .output/public
COPY --from=build /app/apps/web/.output/public /usr/share/nginx/html
EXPOSE 8080
