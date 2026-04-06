---
name: backend-conventions
description: Backend coding conventions for this project — Elysia route structure, Drizzle ORM usage, database schema rules. Use when writing API routes, database queries, migrations, or anything in apps/api.
user-invocable: false
---

## Route Structure

Each route file exports a single Elysia plugin and is registered in `src/index.ts`:

```ts
// apps/api/src/routes/posts.ts
import { Elysia } from 'elysia'
import { db } from '../db'

export const postsPlugin = new Elysia({ prefix: '/posts' })
  .get('/', async () => {
    return db.query.posts.findMany({ where: isNull(posts.deletedAt) })
  })
```

Import the Drizzle singleton — never instantiate a new one:

```ts
import { db } from '../db'
```

CORS is configured in `src/index.ts` for `http://localhost:3000`.

## Database Schema Rules

- All PKs are UUIDs with `defaultRandom()`.
- **Soft delete only** — set `deletedAt` timestamp, never hard-delete.
- Always filter out soft-deleted rows: `where: isNull(table.deletedAt)`.
- `post_type` enum: `REQUEST | OFFER`
- `rate_type` enum: `HOURLY | DAILY | FIXED`
- `reviews.rating` is constrained to 1–5.
- Junction tables use composite PKs.

## Drizzle Commands

```bash
bun run --filter api db:generate   # After schema changes
bun run --filter api db:migrate    # Apply migrations
bun run --filter api db:studio     # GUI browser
bun run --filter api db:seed       # Seed sample data
```
