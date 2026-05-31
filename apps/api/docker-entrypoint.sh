#!/bin/sh
# Entrypoint for the API container.
# Applies pending Drizzle migrations, optionally seeds, then starts Elysia.
# DATABASE_URL (and all other config) is provided by the environment in k8s.
set -e

cd /app/apps/api

echo "[entrypoint] applying database migrations"
bun run src/db/migrate.ts

if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] seeding database (upsert)"
  # Seed is idempotent; never let a seed hiccup crash-loop the pod.
  bun run src/db/seed.ts || echo "[entrypoint] WARN: seed failed, continuing"
fi

echo "[entrypoint] starting API on :3001"
exec bun run src/index.ts
