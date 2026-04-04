# Marketplace for Services

A full-stack monorepo with a React frontend and a REST API backend.

| Layer | Tech |
|-------|------|
| Frontend | TanStack Start, React 19, Tailwind CSS v4, Shadcn |
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
cp api/.env.example api/.env
```

Edit `api/.env` if your local PostgreSQL credentials differ from the defaults.

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run migrations

```bash
bun run --filter api db:migrate
```

### 5. Start the development servers

```bash
bun run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |

## Database

The project uses Drizzle ORM. All schema changes go through migrations.

```bash
# After editing api/src/db/schema.ts, generate a new migration
bun run --filter api db:generate

# Apply pending migrations
bun run --filter api db:migrate

# Open Drizzle Studio (database GUI)
bun run --filter api db:studio
```

## Project Structure

```
marketplace-for-services/
├── api/                  # ElysiaJS backend
│   ├── src/
│   │   ├── db/
│   │   │   └── schema.ts # Drizzle schema definitions
│   │   └── index.ts      # Server entry point
│   ├── drizzle/          # Generated migration files
│   ├── drizzle.config.ts
│   └── .env.example
├── web/                  # TanStack Start frontend
│   ├── src/
│   │   ├── components/
│   │   ├── routes/
│   │   └── router.tsx
│   └── vite.config.ts
├── docker-compose.yml
├── tsconfig.json         # Shared base TypeScript config
└── package.json          # Workspace root
```
