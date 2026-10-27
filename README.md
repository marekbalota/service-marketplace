# Marketplace for Services

A full-stack monorepo where users post offers or requests for services (e.g. tutoring, plumbing, design). Posts are organised by category and users can rate each other through reviews.

## Live Deployment

The app is deployed and available at **https://marketplace.dyn.cloud.e-infra.cz/**

| Layer        | Tech                                                       |
| ------------ | ---------------------------------------------------------- |
| Frontend     | TanStack Start (SPA), React 19, Tailwind CSS v4, Shadcn/UI |
| Backend      | ElysiaJS, Drizzle ORM                                      |
| Database     | PostgreSQL 17                                              |
| File Storage | MinIO (S3-compatible)                                      |
| Runtime      | Bun                                                        |

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Docker](https://www.docker.com) with Compose v2
- A free [Geoapify](https://myprojects.geoapify.com) API key (required — see step 2)

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Most defaults work out of the box for local development, but **one value must be filled in manually**: a [Geoapify](https://www.geoapify.com) API key, used for location/address autocomplete and for geocoding during database seeding.

1. Register for a free account at <https://myprojects.geoapify.com> (free tier: 3000 requests/day).
2. Create a project and copy its API key.
3. Set it in your `.env`:

   ```bash
   GEOAPIFY_API_KEY=your-geoapify-api-key
   ```

Without a valid key the API will fail to start (the key is required on boot), and location search and seeding will not work. See `.env.example` for all other available variables.

### 3. Start Docker services

```bash
docker compose up -d
```

### 4. Run migrations

```bash
bun run --filter api db:migrate
```

### 5. Seed the database (first time only)

```bash
bun run --filter api db:seed
```

### 6. Start the development servers

```bash
bun run dev
```

| Service            | URL                           |
| ------------------ | ----------------------------- |
| Frontend           | http://localhost:3000         |
| API                | http://localhost:3001         |
| API docs (Swagger) | http://localhost:3001/swagger |
| MinIO console      | http://localhost:9001         |

## Project Structure

```
pb138-marketplace_for_services/
├── apps/
│   ├── api/                  # ElysiaJS backend (port 3001)
│   │   ├── src/db/           # Drizzle schema, migration runner, seed
│   │   ├── src/lib/          # Infrastructure: env, email, storage, RBAC, logger
│   │   ├── src/modules/      # One folder per feature (routes, service, model, tests)
│   │   └── drizzle/          # Generated SQL migrations
│   └── web/                  # TanStack Start SPA (port 3000)
│       └── src/
│           ├── routes/       # File-based routes (TanStack Router)
│           ├── components/   # Shared components (ui/ holds Shadcn primitives)
│           ├── lib/          # Utilities, i18n, shared query options
│           └── translations/ # EN / SK / CS strings
├── packages/shared/          # Code shared by api and web (permissions, error codes, locales)
├── e2e/                      # Playwright end-to-end tests
├── charts/marketplace/       # Helm chart for Kubernetes deployment
├── docs/                     # Requirements, ERD, screen flow, deployment guide
└── docker-compose.yml        # Local Postgres, MinIO, Redis, Mailpit
```

See [docs/deployment.md](./docs/deployment.md) for how the app is deployed.

## Testing

```bash
bun run test          # Unit + integration tests (API via bun:test, web via Vitest)
bun run test:e2e      # End-to-end tests via Playwright (requires both dev servers running)
```

> API integration tests hit the real database — ensure Docker is running before running tests.

## Database

The project uses Drizzle ORM. All schema changes go through migrations.

```bash
bun run --filter api db:generate   # Generate migration after editing schema.ts
bun run --filter api db:migrate    # Apply pending migrations
bun run --filter api db:studio     # Open Drizzle Studio (database GUI)
bun run --filter api db:seed       # Seed with sample data
```

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](./LICENSE) — free to use, modify, and share for any **noncommercial** purpose (including education and research). Commercial use is not permitted.

> Required Notice: Copyright 2026 Marek Balota, Ladislav Miklánek, Matúš Čarnogurský, and Viliam Gibas (https://github.com/marekbalota/service-marketplace)
