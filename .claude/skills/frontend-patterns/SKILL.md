---
name: frontend-patterns
description: Frontend coding patterns for this project — Eden Treaty API client, TanStack Query data fetching, URL search params. Use when writing React components, route files, or anything in apps/web.
user-invocable: false
---

## API Client (Eden Treaty)

```ts
import { api } from '#/api'

const { data, error } = await api.posts.get()
```

New Elysia routes are automatically typed — no extra steps needed.

## Data Fetching Pattern (TanStack Query + Router)

### 1. Define query options

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

### 2. Prefetch in route loader

```ts
export const Route = createFileRoute('/some-route')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(categoriesQueryOptions),
  pendingComponent: MySkeletonComponent,
  component: MyPage,
})
```

- `await ensureQueryData(...)` — blocks render; shows `pendingComponent` while loading.
- `void prefetchQuery(...)` — renders immediately; use `<Suspense>` inside the component.
- Add `loaderDeps` only when filter params should re-trigger the loader on navigation.

### 3. Read in components

```ts
// Guaranteed defined — use inside <Suspense>:
const { data } = useSuspenseQuery(categoriesQueryOptions)

// Renders immediately while loading:
const { data = [] } = useQuery(categoriesQueryOptions)
```

### 4. Suspense for partial loading states

```tsx
<Suspense fallback={<PostsSkeleton />}>
  <PostsList type={type} category={category} />
</Suspense>
```

`staleTime` defaults to **1 minute** (set in `router.tsx`).

## URL Search Params

Use URL search params (not `useState`) for any shareable or bookmarkable state.

Always validate with a **Zod schema** passed directly to `validateSearch` (Zod v4 implements Standard Schema — no adapter package needed):

```ts
import { z } from 'zod'

const sortEnum = z.enum(['newest', 'price-low', 'price-high', 'name'])
type SortOption = z.infer<typeof sortEnum>  // infer the type — don't write it manually

const searchSchema = z.object({
  q:    z.string().optional().catch(undefined),
  sort: sortEnum.optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/posts')({
  validateSearch: searchSchema,  // schema.parse is called automatically
  component: PostsPage,
})

function PostsPage() {
  const { q = '', sort = 'newest', page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()

  const setSort = (value: SortOption) =>
    navigate({ search: (prev) => ({ ...prev, sort: value === 'newest' ? undefined : value, page: undefined }) })
}
```

- **`.catch(undefined)`** — malformed URL params silently fall back to `undefined` instead of showing an error screen. Use `.default(value)` only if you intentionally want a hard error on invalid input.
- **Default values as `undefined`** — keeps the URL clean; apply defaults with `= fallback` in `useSearch()`.
- **Infer types from the schema** with `z.infer<typeof myEnum>` — never duplicate enum values as a separate TypeScript type.
- **Navigate with an updater function** to preserve other params.

## Testing Components and Pure Functions

**Every non-trivial component and exported pure function must have a Vitest test** in a `.test.tsx` / `.test.ts` file next to the source.

Setup is already in place: `vitest.config.ts`, `src/test-setup.ts` (jest-dom matchers), jsdom environment.

### Component test (Testing Library)

```tsx
// apps/web/src/components/MyCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MyCard } from './MyCard'

describe('MyCard', () => {
  it('renders the title', () => {
    render(<MyCard title="Hello" />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn()
    render(<MyCard title="Hello" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

- Components that use `Route.useSearch()` or `Route.useNavigate()` depend on TanStack Router — test the pure logic separately and test router-dependent behaviour in e2e.
- Export any pure function you want to unit test (e.g. `export function buildPageNumbers`).

### Pure function test

```ts
// apps/web/src/routes/index.test.ts
import { describe, it, expect } from 'vitest'
import { buildPageNumbers } from './index'

describe('buildPageNumbers', () => {
  it('inserts ellipsis for gaps', () => {
    expect(buildPageNumbers(1, 10)).toEqual([1, 2, 'ellipsis', 10])
  })
})
```

**What to cover:**
- Rendering: key text, badges, conditional elements
- Interaction: clicks, toggles, input changes
- Edge cases: empty arrays, null/undefined props, boundary values for pure functions

Run: `bun run test` from workspace root, or `vitest run` inside `apps/web/`.

## Zod — When to Use It

Use Zod at **trust boundaries** where the data source is external or uncontrolled:

| Situation | Use Zod? |
|-----------|----------|
| `validateSearch` in TanStack Router | **Yes** — URL is user-controlled |
| Form input (e.g. react-hook-form) | **Yes** — user-controlled |
| External API response (third-party) | **Yes** — shape isn't guaranteed |
| Eden Treaty response (`api.posts.get()`) | No — Elysia types flow through automatically |
| Internal data passed between components | No — TypeScript already guarantees the shape |

**Prefer `.catch()` over `.default()`** for anything URL-facing so a bad link never breaks the page.

**Infer, don't duplicate**: always derive TypeScript types from the schema:

```ts
// Good
const postTypeEnum = z.enum(['all', 'offer', 'request'])
type PostTypeFilter = z.infer<typeof postTypeEnum>

// Bad — type and schema can drift out of sync
type PostTypeFilter = 'all' | 'offer' | 'request'
const VALID_TYPES = ['all', 'offer', 'request']
```
