# Marketplace for Services — CLAUDE.md

A service marketplace where users post offers or requests for services (e.g. tutoring, plumbing, design). Posts include a title, description, price, and contact details, and are organised by category. Users can rate each other through reviews.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TanStack Start, Tailwind CSS v4, Shadcn/UI |
| Backend | ElysiaJS |
| ORM | Drizzle ORM |
| Database | PostgreSQL 17 |
| Runtime | Bun |
| Testing | Vitest, Testing Library |

## Project Structure

```
pb138-marketplace_for_services/
├── apps/
│   ├── api/                      # ElysiaJS backend (port 3001)
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   └── schema.ts     # All Drizzle table + relation definitions
│   │   │   └── index.ts          # Server entry point
│   │   ├── drizzle/              # Generated SQL migrations
│   │   ├── drizzle.config.ts
│   │   └── .env                  # DATABASE_URL (copy from .env.example)
│   └── web/                      # TanStack Start frontend (port 3000)
│       └── src/
│           ├── routes/           # File-based routes (TanStack Router)
│           ├── components/       # Shared UI components
│           └── router.tsx
├── docs/                         # Non-code project resources
│   ├── erd.puml                  # Entity-relationship diagram (source of truth for schema)
│   ├── erd_image.png
│   ├── requirements.md           # Full functional and non-functional requirements
│   ├── creators.md
│   └── figma.md
├── docker-compose.yml            # PostgreSQL 17 container
├── tsconfig.json                 # Shared base TypeScript config
└── package.json                  # Workspace root
```

## Database Schema

Schema is defined in `apps/api/src/db/schema.ts` using Drizzle ORM. The ERD (`docs/erd.puml`) is the source of truth. Key design decisions:

- All primary keys are UUIDs with `defaultRandom()`.
- Soft deletes via `deleted_at timestamp` on every table — do not hard-delete rows.
- `post_type` enum: `REQUEST | OFFER`
- `rate_type` enum: `HOURLY | DAILY | FIXED`
- `reviews.rating` has a `CHECK` constraint enforcing values 1–5.
- Junction tables (`role_permissions`, `post_categories`, `post_locations`, `favourites`) use composite primary keys.

### Drizzle commands (run from repo root)

```bash
bun run --filter api db:generate   # Generate migration after schema changes
bun run --filter api db:migrate    # Apply pending migrations
bun run --filter api db:studio     # Open Drizzle Studio GUI
```

## Local Development Setup

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env

# 3. Start PostgreSQL
docker-compose up -d

# 4. Apply migrations
bun run --filter api db:migrate

# 5. Start both servers
bun run dev
```

## Key Functional Requirements

- Guest users can browse and filter posts (no login required).
- Authenticated users can: register/login/logout, manage multiple profiles per account, create/edit/delete their own posts, favourite posts, message post authors, leave reviews (1–5 stars), and report posts.
- Admins can ban users and manage categories via an admin interface.
- Users receive email notifications on registration and when they receive a message.
- Only the post creator or an admin may edit or delete a post.
- Passwords must be hashed before storage.
- The UI must support light and dark mode and be responsive.

## Code Conventions

- All TypeScript — no `any` unless unavoidable.
- Soft-delete pattern: set `deleted_at` rather than deleting rows.
- Backend routes live in `api/src/` alongside their Drizzle queries.
- Frontend routes are file-based under `web/src/routes/` (TanStack Router convention).
- Use Shadcn/UI components for all UI elements; extend with Tailwind v4 utility classes.
- Write unit tests with Vitest; write end-to-end tests covering critical user flows.
