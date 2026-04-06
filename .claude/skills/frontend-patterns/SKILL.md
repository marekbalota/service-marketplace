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

- **Default values as `undefined`** — omitted from the URL.
- **Validate in `validateSearch`** — sanitise raw strings against a known-values array.
- **Navigate with an updater function** to preserve other params.
