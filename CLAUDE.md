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
│   │   ├── drizzle/              # Generated SQL migrations
│   │   ├── drizzle.config.ts
│   │   └── .env                  # DATABASE_URL (copy from .env.example)
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
bun run --filter api db:seed       # Seed sample data
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

# 5. (Optional) Seed sample data
bun run --filter api db:seed

# 6. Start both servers
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

## API Client (Eden Treaty)

The frontend communicates with the backend via [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html) — a type-safe HTTP client generated from the Elysia app's type definition.

- The configured client lives in `apps/web/src/api.ts` and is imported as `import { api } from '#/api'`.
- All backend routes are still standard REST — Eden is purely a typed wrapper around `fetch`.
- When adding a new Elysia route, it automatically becomes available and typed on the client with no extra steps.
- CORS is configured in `apps/api/src/index.ts` to allow requests from `http://localhost:3000`.
- The `api` package is added as a `devDependency` in `apps/web` so types can be imported without bundling server code.

```ts
// Example usage in a route or component
import { api } from '#/api'

const { data, error } = await api.posts.get()
```

## Data Fetching Pattern (TanStack Query + Router)

All server data is fetched via **TanStack Query** and integrated with **TanStack Router** loaders.

### Query options

Define query options with `queryOptions()` so the key and function are co-located and reusable:

```ts
export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'],
  queryFn: async () => {
    const { data, error } = await api.categories.get()
    if (error) throw error
    return data as Category[]
  },
})
```

### Route loader — prefetch before render

Use the route `loader` to prefetch data into the cache before the component renders. The `queryClient` is available via router context (already wired up in `router.tsx`):

```ts
export const Route = createFileRoute('/some-route')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(categoriesQueryOptions)
  },
  pendingComponent: MySkeletonComponent,
  component: MyPage,
})
```

- Use `await ensureQueryData(...)` to block render until data is ready — `pendingComponent` shows in the meantime.
- Use `void prefetchQuery(...)` (no await) when you want the component to render immediately and let Suspense handle the loading state instead.
- Add `loaderDeps` only when filter params should re-run the loader on navigation. Omit it when filter changes should be handled by Suspense inside the component.

### Component — read from cache

Use `useSuspenseQuery` in components so data is guaranteed to be defined (no undefined checks):

```ts
const { data: categories } = useSuspenseQuery(categoriesQueryOptions)
```

Use plain `useQuery` when you want the component to render immediately (e.g. the filter bar must show while posts are still loading):

```ts
const { data: categories = [] } = useQuery(categoriesQueryOptions)
```

### Suspense for partial loading states

Wrap only the data-dependent section in `<Suspense>` so the rest of the page (e.g. a filter bar) stays visible:

```tsx
<Suspense fallback={<PostsSkeleton />}>
  <PostsList type={type} category={category} />
</Suspense>
```

Extract the suspended child into its own component that calls `useSuspenseQuery`.

### Cache lifetime

`staleTime` defaults to **1 minute** (set in `router.tsx`). Repeated filter combinations are served instantly from cache within that window.

## URL Search Params

Use URL search params (not `useState`) for any state the user might want to share or bookmark — filters, search queries, sort order, pagination, active tabs, etc.

### Pattern

```ts
export const Route = createFileRoute('/posts')({
  validateSearch: (search): { q?: string; type?: PostTypeFilter } => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    type: VALID_TYPES.includes(search.type as PostTypeFilter)
      ? (search.type as PostTypeFilter)
      : undefined,
  }),
  component: PostsPage,
})

function PostsPage() {
  const { q = '', type = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()

  const setType = (value: PostTypeFilter) =>
    navigate({ search: (prev) => ({ ...prev, type: value === 'all' ? undefined : value }) })
}
```

Key rules:
- **Store default values as `undefined`** so they're omitted from the URL (`/?type=offer` not `/?q=&type=offer&sort=newest`).
- **Validate in `validateSearch`** — always sanitise raw URL strings against a known-values array at runtime (TypeScript types are erased at runtime).
- **Navigate with a updater function** (`search: (prev) => ({ ...prev, key: value })`) to preserve other params.

## Code Conventions

- All TypeScript — no `any` unless unavoidable.
- Soft-delete pattern: set `deleted_at` rather than deleting rows.
- Backend routes live in `apps/api/src/routes/` — one file per resource, registered as Elysia plugins in `index.ts`.
- Frontend routes are file-based under `apps/web/src/routes/` (TanStack Router convention).
- Use Shadcn/UI components for all UI elements; extend with Tailwind v4 utility classes.
- To add a new Shadcn component: `bunx --bun shadcn@latest add <name>`
- Write unit tests with Vitest; write end-to-end tests covering critical user flows.
