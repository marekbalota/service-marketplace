---
name: backend-conventions
description: Backend coding conventions for this project — Elysia route structure, Drizzle ORM usage, database schema rules. Use when writing API routes, database queries, migrations, or anything in apps/api.
user-invocable: false
---

## Module Structure

Each resource lives in `src/modules/<resource>/` with three files:

```
src/modules/posts/
├── model.ts      # TypeBox schemas + UnwrapSchema types
├── service.ts    # Business logic (abstract class with static methods)
└── index.ts      # Elysia plugin — wires model + service
```

Register each module's Elysia plugin in `src/index.ts`:

```ts
import { postsRoutes } from './modules/posts'
import { categoriesRoutes } from './modules/categories'
```

### model.ts

Use Elysia's `t` (TypeBox) for schemas. Derive TypeScript types with `UnwrapSchema` — never write types separately:

```ts
import { t, type UnwrapSchema } from 'elysia'

export const PostsModel = {
  findAllQuery: t.Object({ ... }),
  findAllResponse: t.Object({ ... }),
} as const

export type PostsModel = {
  [k in keyof typeof PostsModel]: UnwrapSchema<typeof PostsModel[k]>
}
```

### service.ts

Use `abstract class` with `static async` methods. Name methods after CRUD intent: `findAll`, `findById`, `create`, `update`, `delete`.

```ts
import type { PostsModel } from './model'

export abstract class PostsService {
  static async findAll(query: PostsModel['findAllQuery']) { ... }
  static async findById(id: string) { ... }
}
```

**Always wrap multiple DB calls in a transaction:**

```ts
return db.transaction(async (tx) => {
  const [countRow] = await tx.select({ total: count() }).from(posts)
  const items = await tx.select().from(posts).limit(size)
  return { items, total }
})
```

A single DB call does not need a transaction.

Import the Drizzle singleton — never instantiate a new one:

```ts
import { db } from '../../db'
```

### index.ts

Thin controller — only wires validation schemas and service calls. Always use `async/await` and declare response codes:

```ts
export const postsRoutes = new Elysia({ prefix: '/posts' })
  .get(
    '/',
    async ({ query }) => await PostsService.findAll(query),
    {
      query: PostsModel.findAllQuery,
      response: { 200: PostsModel.findAllResponse },
    },
  )
```

## Database Schema Rules

- All PKs are UUIDs with `defaultRandom()`.
- **Soft delete only** — set `deletedAt` timestamp, never hard-delete.
- Always filter out soft-deleted rows: `where: isNull(table.deletedAt)`.
- `post_type` enum: `REQUEST | OFFER`
- `rate_type` enum: `HOURLY | DAILY | FIXED`
- `reviews.rating` is constrained to 1–5.
- Junction tables use composite PKs.

## Testing API Routes

**Every route handler must have a `bun:test` integration test** in the same module directory as `index.test.ts`.

Use `Elysia.handle()` — no HTTP server or network needed:

```ts
// apps/api/src/modules/posts/index.test.ts
import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { postsRoutes } from '.'

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
