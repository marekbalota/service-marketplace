# syntax=docker/dockerfile:1
# ---- API image: ElysiaJS on Bun ----
# Build context is the REPO ROOT (so the Bun workspace resolves).
#   docker build -f apps/api/Dockerfile -t marketplace-api .

# --- deps: install workspace dependencies (cached on manifest changes) ---
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

# --- runtime ---
FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production
# node_modules from the deps stage (workspace symlinks point at the source copied below)
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3001
# Runs drizzle migrations (and optional seed) then launches the server.
CMD ["/usr/local/bin/entrypoint.sh"]
