# Marketplace for Services — CLAUDE.md

A service marketplace where users post offers or requests for services (e.g. tutoring, plumbing, design). Posts include a title, description, price, and contact details, and are organised by category. Users can rate each other through reviews.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Start (SPA mode), Tailwind CSS v4, Shadcn/UI |
| Backend | ElysiaJS |
| ORM | Drizzle ORM |
| Database | PostgreSQL 17 |
| Runtime | Bun |
| Data Fetching | TanStack Query v5 |
| Testing | Vitest, Testing Library |

## Project Structure

```
pb138-marketplace_for_services/
├── apps/
│   ├── api/                      # ElysiaJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── index.ts      # Drizzle singleton (import `db` from here)
│   │   │   │   ├── schema.ts     # All Drizzle table + relation definitions
│   │   │   │   └── seed.ts       # Upsert-based seed script
│   │   │   ├── routes/           # One file per resource (posts.ts, categories.ts, …)
│   │   │   └── index.ts          # Server entry point — registers plugins, CORS
│   │   └── drizzle/              # Generated SQL migrations
│   └── web/                      # TanStack Start frontend (port 3000)
│       └── src/
│           ├── routes/           # File-based routes (TanStack Router)
│           ├── components/       # Shared UI components
│           │   └── ui/           # Shadcn/UI primitives
│           ├── api.ts            # Eden Treaty typed client (import as `api`)
│           ├── router.tsx        # Router factory + exported `queryClient`
│           └── styles.css        # Global styles + Tailwind theme tokens
├── docs/                         # Non-code project resources
│   ├── erd.puml                  # Entity-relationship diagram (source of truth for schema)
│   └── requirements.md           # Full functional and non-functional requirements
├── docker-compose.yml            # PostgreSQL 17 container
└── package.json                  # Workspace root
```

## Database Schema

Schema is defined in `apps/api/src/db/schema.ts`. The ERD (`docs/erd.puml`) is the source of truth.

- All primary keys are UUIDs with `defaultRandom()`.
- Soft deletes via `deleted_at timestamp` on every table — never hard-delete rows.
- `post_type` enum: `REQUEST | OFFER`
- `rate_type` enum: `HOURLY | DAILY | FIXED`
- `reviews.rating` is constrained to values 1–5.
- Junction tables (`role_permissions`, `post_categories`, `post_locations`, `favourites`) use composite primary keys.

## Code Conventions

- All TypeScript — no `any` unless unavoidable.
- Soft-delete pattern: set `deleted_at` rather than deleting rows.
- Backend routes live in `apps/api/src/routes/` — one file per resource, registered as Elysia plugins in `index.ts`.
- Frontend routes are file-based under `apps/web/src/routes/` (TanStack Router convention).
- Use Shadcn/UI components for all UI elements; extend with Tailwind v4 utility classes.
- To add a new Shadcn component: `bunx --bun shadcn@latest add <name>`
- Write unit tests with Vitest; write end-to-end tests covering critical user flows.
