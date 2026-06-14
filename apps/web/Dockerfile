# syntax=docker/dockerfile:1
# ---- Web image: TanStack Start (Nitro server) ----
# Build context is the REPO ROOT (so the Bun workspace resolves).
#   docker build -f apps/web/Dockerfile \
#     --build-arg VITE_API_URL=https://marketplace-api.dyn.cloud.e-infra.cz \
#     --build-arg VITE_TURNSTILE_SITE_KEY=... -t marketplace-web .
#
# NOTE: VITE_* values are baked in at BUILD time (Vite inlines import.meta.env),
# so the API URL must be known when the image is built, not at deploy time.

# --- build ---
FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

ENV NODE_ENV=production
ARG VITE_API_URL
ARG VITE_TURNSTILE_SITE_KEY
# vite.config.ts uses envDir '../../', so write the build-time env to repo-root .env
RUN printf 'VITE_API_URL=%s\nVITE_TURNSTILE_SITE_KEY=%s\n' \
      "$VITE_API_URL" "$VITE_TURNSTILE_SITE_KEY" > .env
RUN cd apps/web && bun run build

# --- runtime: run the Nitro server output ---
FROM oven/bun:1
WORKDIR /app/apps/web
# .output is self-contained (Nitro bundles its deps under .output/server).
COPY --from=build /app/apps/web/.output ./.output
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
