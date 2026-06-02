# syntax=docker/dockerfile:1
# ---- API image: ElysiaJS on Bun ----
# Build context is the REPO ROOT (so the Bun workspace resolves).
#   docker build -f apps/api/Dockerfile -t marketplace-api .
#
# Single stage on purpose: Bun's workspace node_modules layout (hoisting +
# symlinks) does not survive a cross-stage `COPY node_modules`, so we install
# with the full source present — the same way the web image builds.

FROM oven/bun:1
WORKDIR /app

# Copy the whole repo (node_modules is excluded via .dockerignore) and install.
COPY . .
RUN bun install --frozen-lockfile

RUN chmod +x /app/apps/api/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001
# Runs drizzle migrations (and optional seed) then launches the server.
CMD ["/app/apps/api/docker-entrypoint.sh"]
