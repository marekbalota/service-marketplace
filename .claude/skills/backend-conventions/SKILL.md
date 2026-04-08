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

## Testing API Routes

**Every route handler must have a `bun:test` integration test** in the same `routes/` directory (e.g. `posts.test.ts` beside `posts.ts`).

Use `Elysia.handle()` — no HTTP server or network needed:

```ts
// apps/api/src/routes/posts.test.ts
import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { postsRoutes } from './posts'

const app = new Elysia().use(postsRoutes)

describe('GET /posts', () => {
  it('returns 200 with items, total, and totalPages', async () => {
    const res = await app.handle(new Request('http://localhost/posts?size=5'))
    expect(res.status).toBe(200)
    const body = await res.json() as { items: unknown[]; total: number; totalPages: number }
    expect(Array.isArray(body.items)).toBe(true)
    expect(typeof body.total).toBe('number')
  })

  it('returns 422 for invalid query params', async () => {
    const res = await app.handle(new Request('http://localhost/posts?type=INVALID'))
    expect(res.status).toBe(422)
  })
})
```

**What to cover for each route:**
- Happy path: correct status + response shape
- Each filter/query param: filters actually constrain results
- Validation: invalid param values return 422
- Pagination: `size` limits items; `offset` returns a different page

Run: `bun test` inside `apps/api/`.

> These are integration tests — they hit the real database. Ensure the Docker container is running (`docker compose up -d`).

## Drizzle Commands

```bash
bun run --filter api db:generate   # After schema changes
bun run --filter api db:migrate    # Apply migrations
bun run --filter api db:studio     # GUI browser
bun run --filter api db:seed       # Seed sample data
```
