---
name: frontend-patterns
description: Frontend coding patterns for this project — Eden Treaty API client, TanStack Query data fetching, URL search params. Use when writing React components, route files, or anything in apps/web.
user-invocable: false
---

## UI Components

- **One component per file** — exception: Shadcn/UI compound components in `components/ui/` and private unexported helpers in route files that use `Route.use*()` hooks.
- **Named exports preferred** — `export function MyComponent`, not `export default`.
- **Don't repeat Tailwind utility strings** — if the same `className` appears in more than one place, extract it into a reusable component.
- **Semantic colors — no hardcoded shades** — never use `text-green-600`, `bg-blue-500`, etc. directly. Define semantic tokens in `styles.css` (`--color-price`, `--color-offer-bg`, etc.) and use those as Tailwind utilities (`text-price`, `bg-offer-bg`). This way a rebrand is a one-line change.
- **Use `cn()` for conditional/merged classes** — import from `#/lib/utils`. Use it whenever classes are conditional or when passing `className` to a Shadcn component so consumer classes can override defaults without conflicts.

```tsx
// Good
<Star className={cn('size-5', favorited ? 'fill-star-filled text-star-filled' : 'text-muted-foreground')} />
<Badge className={cn(isOffer ? 'bg-offer-bg text-offer-fg' : 'border-request-border text-request-fg')} />

// Bad
<Star className={`size-5 ${favorited ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
<Badge className={isOffer ? 'bg-green-100 text-green-800' : 'border-blue-500 text-blue-700'} />
```

Always use **Shadcn/UI components** (from `apps/web/src/components/ui/`) or project components (from `apps/web/src/components/`) instead of raw HTML elements.

| Need | Use | Not |
|------|-----|-----|
| Clickable action | `<Button>` | `<button>` |
| Navigation styled as button | `<Link className={buttonVariants(...)}>` | `<a>` or `<button onClick={navigate}>` |
| Text input | `<Input>` | `<input>` |
| Dropdown | `<Select>` / `<SelectTrigger>` etc. | `<select>` |
| Loading placeholder | `<Skeleton>` | custom divs with pulse animation |

```tsx
// Good
import { Button } from '#/components/ui/button'
<Button variant="outline" onClick={handleClick}>Try again</Button>

// Bad
<button className="..." onClick={handleClick}>Try again</button>
```

`buttonVariants` is only for applying button styles to non-`<Button>` elements (e.g. a `<Link>` that looks like a button). For actual buttons, use `<Button>` directly.

Before building a custom component, check if Shadcn already has one using the **shadcn MCP** (`mcp__shadcn__search_items_in_registries` or `mcp__shadcn__list_items_in_registries`). If a suitable component exists, install it with `bunx --bun shadcn@latest add <name>`. Only build a custom component when no suitable Shadcn primitive exists.

## SSR / Hydration Pitfalls (TanStack Start)

TanStack Start renders a server HTML shell before hydrating on the client. Two patterns consistently cause React 19 warnings here.

### Never read `localStorage` (or `window`) in a `useState` initializer

```tsx
// Bad — produces null on server, stored value on client → React 19 warns
//   "Can't perform a React state update on a component that hasn't mounted yet"
const [id, setId] = useState<string | null>(
  () => (typeof window !== 'undefined' ? localStorage.getItem('key') : null),
)

// Good — consistent initial value; read localStorage after mount
const [id, setId] = useState<string | null>(null)
useEffect(() => {
  const stored = localStorage.getItem('key')
  if (stored) setId(stored)
}, [])
```

The safe pattern is the one used in `ThemeToggle.tsx`: start with a universal default, hydrate from storage in `useEffect`.

### Add `suppressHydrationWarning` to `<html>` when an inline script sets theme attributes

The theme init script in `__root.tsx` sets `className`, `data-theme`, and `style.colorScheme` on `<html>` before React hydrates, so server HTML and client HTML always differ for that element. Suppress the warning at the source:

```tsx
<html lang="en" suppressHydrationWarning>
```

This is safe because the mismatch is intentional (the script runs before React and is correct by design).

### Use `nativeButton={false}` on Base UI `Close`/`Trigger` when the render prop is not a `<button>`

Base UI's `Dialog.Close` (and `SheetClose`) defaults to `nativeButton={true}`, which expects the rendered element to be a `<button>`. When using a `<Link>` as the render prop, add `nativeButton={false}` to suppress the accessibility warning:

```tsx
// Bad — Link is not a <button>
<SheetClose render={<Link to="/posts" />}>…</SheetClose>

// Good
<SheetClose nativeButton={false} render={<Link to="/posts" />}>…</SheetClose>
```

## API Client (Eden Treaty)

```ts
import { api } from '#/api'

const { data, error } = await api.posts.get()
```

New Elysia routes are automatically typed — no extra steps needed.

## Route File Structure

Routes live in `apps/web/src/routes/` and follow TanStack Router's file-based conventions:

```
routes/
  __root.tsx              # Root layout — always a flat file at the top level
  index.tsx               # Route at "/" — flat file (never move to a folder)
  index.test.ts           # Tests co-located next to the route file
  my-postings/            # Folder for /my-postings
    route.tsx             # ← always named route.tsx, NOT index.tsx
  posts/                  # Folder for /posts (when it has child routes)
    route.tsx             # Layout/route at /posts
    $postId/
      route.tsx           # Route at /posts/$postId
```

**Rules:**
- A standalone route with no children: use a **folder + `route.tsx`** (e.g. `my-postings/route.tsx`) or a flat file (`my-postings.tsx`) — both map to `/my-postings`.
- `index.tsx` inside a folder means **index child route** (e.g. `posts/index.tsx` → `/posts/` as a child of a `posts` layout). Do not use `index.tsx` for standalone routes — it requires a parent layout and breaks the route tree if none exists.
- Never have both `my-postings.tsx` and `my-postings/` — they resolve to the same path and cause an error.
- Prefix non-route files/folders with `-` (e.g. `-components/`) to exclude them from route generation.
- Test files are excluded via `routeFileIgnorePattern` in `vite.config.ts` — co-locate them next to the route file.

**Preferred structure for new routes:** always use the folder form so route-specific files can be co-located later.

## File Organisation

### Query options — shared vs. route-specific

**Tier A — `lib/queries/<resource>.ts`** (shared across routes)

Put a query option here when:
- Two or more routes use it, OR
- The same `queryKey` appears in two or more files (split-cache risk — both files write to the same cache slot but neither knows about the other's stale data).

```
apps/web/src/lib/queries/
  users.ts        # currentUserQueryOptions, ...
  profiles.ts     # profileQueryOptions, profilePostsQueryOptions, imagesQueryOptions, ...
  posts.ts        # categoriesQueryOptions, ...
  admin.ts        # rolesQueryOptions, permissionsQueryOptions (shared admin/roles + admin/users)
```

**Tier B — `<route>/-queries/<name>.ts`** (route-specific)

Put a query option here when it has exactly one consumer. The `-` prefix on the folder name excludes it from TanStack Router's route generation.

```
routes/_app/posts/$postId/
  -queries/
    posts.ts      # postDetailQueryOptions
    threads.ts    # existingThreadQueryOptions
```

Rule: never import from another route's `-queries/` folder. If two routes need the same query, promote it to `lib/queries/`.

### Route-specific components — `-components/` folder

Co-locate components that are only relevant to one route:

```
routes/_app/create-post/
  -components/
    LocationField.tsx
    PricingField.tsx
  route.tsx
```

Components that are reused across two or more routes always live in `components/` at the top of `src/`.

### Converting a flat route file to a directory

When a route file grows and needs its own `-components/` or `-queries/` folder, convert it:

```
# Before
routes/_app/posts/$postId.tsx

# After
routes/_app/posts/$postId/
  -queries/
    posts.ts
  -components/
    ReviewCard.tsx
  route.tsx      ← same module as $postId.tsx was
```

TanStack Router treats `$postId.tsx` and `$postId/route.tsx` identically at runtime. After moving, update `routeTree.gen.ts` — it imports from the old path and the dev server regenerates it automatically, but committed state needs a manual fix.

Use `route.tsx` for standalone routes; use `index.tsx` only for an index child of a layout route (e.g. `admin/users/index.tsx` is the `/admin/users/` child under the `admin/users` layout).

### Skeleton rule

| Skeleton scope | Location |
|----------------|----------|
| Used by two or more routes | `components/PostsGridSkeleton.tsx`, `components/PostCardSkeleton.tsx`, etc. |
| Used only within one route | Inline function in the route file (e.g. `function ProfileDetailSkeleton()`) |

Do not place single-use skeletons in `-components/` — they belong in the route file itself.

### Test co-location

Tests live next to their source file in the same directory:

```
-components/
  ReviewCard.tsx
  ReviewCard.test.tsx
lib/queries/
  profiles.ts
  profiles.test.ts
```

Route-level tests (loader, search params, navigation) live in the route's directory alongside `route.tsx` or `index.tsx`.

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
