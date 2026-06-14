# syntax=docker/dockerfile:1
# ---- Web image: TanStack Start SPA built to static files, served by nginx ----
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
# Build the SPA. The prerender step writes the static shell
# (.output/public/_shell.html) as its final artifact, but the build process then
# hangs on dangling SSR timers (TanStack/router#6602) and never exits — and Docker
# won't finish a RUN until every process it spawned exits. So run the build in its
# own session (setsid), stop the whole process group once the shell exists, and
# gate success on the shell actually being produced (a real build failure still
# fails the image because the file never appears).
RUN cd apps/web && ( \
      setsid sh -c 'echo $$ > /tmp/build.pid; exec bun run build' & \
      while :; do \
        BPID=$(cat /tmp/build.pid 2>/dev/null || echo); \
        if [ -f .output/public/_shell.html ]; then \
          sleep 3; \
          [ -n "$BPID" ] && kill -KILL -"$BPID" 2>/dev/null || true; \
          break; \
        fi; \
        if [ -n "$BPID" ] && ! kill -0 "$BPID" 2>/dev/null; then break; fi; \
        sleep 1; \
      done; \
      test -f .output/public/_shell.html \
    )

# --- runtime: serve the prerendered SPA as static files (unprivileged nginx, :8080) ---
# TanStack Start SPA mode is built for static hosting: serve .output/public and fall
# all unknown routes back to the prerendered shell (_shell.html) so client-side routing
# works on deep links / refresh. No SSR server is needed — the backend is the separate
# API. See https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode
FROM nginxinc/nginx-unprivileged:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# SPA mode emits only static assets + the shell under .output/public (no SSR server).
COPY --from=build /app/apps/web/.output/public /usr/share/nginx/html
EXPOSE 8080
