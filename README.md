# Marketplace for Services

A full-stack monorepo where users post offers or requests for services (e.g. tutoring, plumbing, design). Posts are organised by category and users can rate each other through reviews.

| Layer | Tech |
|-------|------|
| Frontend | TanStack Start (SPA), React 19, Tailwind CSS v4, Shadcn/UI |
| Backend | ElysiaJS, Drizzle ORM |
| Database | PostgreSQL 17 |
| Runtime | Bun |

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Docker](https://www.docker.com) (for the database)

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run migrations

```bash
bun run --filter api db:migrate
```

### 5. (Optional) Seed the database

```bash
bun run --filter api db:seed
```

### 6. Start the development servers

```bash
bun run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |

## Project Structure

```
pb138-marketplace_for_services/
├── apps/
│   ├── api/                      # ElysiaJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── index.ts      # Drizzle singleton connection
│   │   │   │   ├── schema.ts     # All table + relation definitions
│   │   │   │   └── seed.ts       # Seed script (roles, accounts, posts, categories)
│   │   │   ├── routes/
│   │   │   │   ├── posts.ts      # GET /posts (search, type, category filters)
│   │   │   │   └── categories.ts # GET /categories
│   │   │   └── index.ts          # Server entry point + CORS
│   │   ├── drizzle/              # Generated SQL migrations
│   │   └── drizzle.config.ts
│   └── web/                      # TanStack Start frontend (port 3000)
│       └── src/
│           ├── routes/           # File-based routes (TanStack Router)
│           ├── components/       # Shared UI components
│           │   └── ui/           # Shadcn/UI components
│           ├── api.ts            # Eden Treaty typed API client
│           ├── router.tsx        # Router + QueryClient setup
│           └── styles.css        # Global styles + Tailwind
├── docs/                         # Non-code project resources
├── docker-compose.yml
├── tsconfig.json
├── .env.example                  # Copy to .env and fill in values
└── package.json                  # Workspace root
```

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
