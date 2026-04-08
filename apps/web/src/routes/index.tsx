import { createFileRoute } from '@tanstack/react-router'
import { useMemo, Suspense } from 'react'
import { queryOptions, useSuspenseQuery, useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { Input } from '#/components/ui/input'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'

import type { Post, Category } from '#/types'

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name'
type PostTypeFilter = 'all' | 'offer' | 'request'

const VALID_TYPES: PostTypeFilter[] = ['all', 'offer', 'request']
const VALID_SORTS: SortOption[] = ['newest', 'price-low', 'price-high', 'name']

const POST_TYPE_LABELS: Record<PostTypeFilter, string> = {
  all: 'All Types',
  offer: 'Offers Only',
  request: 'Requests Only',
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
  name: 'Name: A to Z',
}

// --- Query options ---

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'],
  queryFn: async () => {
    const { data, error } = await api.categories.get()
    if (error) throw error
    return data as Category[]
  },
})

export function postsQueryOptions(deps: { type?: PostTypeFilter; category?: string }) {
  const query: Record<string, string> = {}
  if (deps.type && deps.type !== 'all') query.type = deps.type.toUpperCase()
  if (deps.category && deps.category !== 'all') query.categoryId = deps.category

  return queryOptions({
    queryKey: ['posts', deps],
    queryFn: async () => {
      const { data, error } = await api.posts.get({ query })
      if (error) throw error
      return data as Post[]
    },
  })
}

// --- Route ---

export const Route = createFileRoute('/')({
  validateSearch: (search): {
    q?: string
    type?: PostTypeFilter
    category?: string
    sort?: SortOption
  } => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    type: VALID_TYPES.includes(search.type as PostTypeFilter)
      ? (search.type as PostTypeFilter)
      : undefined,
    category: typeof search.category === 'string' ? search.category : undefined,
    sort: VALID_SORTS.includes(search.sort as SortOption)
      ? (search.sort as SortOption)
      : undefined,
  }),
  // Blocks render until initial data is ready — pendingComponent shows in the meantime.
  // No loaderDeps: filter changes go through Suspense inside the component.
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(categoriesQueryOptions),
      queryClient.ensureQueryData(postsQueryOptions({})),
    ])
  },
  pendingComponent: PageSkeleton,
  component: HomePage,
})

// --- Skeletons ---

function PostSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-6 w-14" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

function PostsSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <PostSkeleton key={i} />)}
      </div>
    </main>
  )
}

// Shown by TanStack Router during initial route load (while loader is awaiting data)
function PageSkeleton() {
  return (
    <>
      <div className="border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search services, providers, or keywords..."
                disabled
                className="pl-9"
              />
            </div>
            <Skeleton className="size-9 shrink-0 rounded-md md:hidden" />
          </div>
          <div className="hidden gap-3 md:flex">
            <Skeleton className="h-9 w-[160px] rounded-md" />
            <Skeleton className="h-9 w-[200px] rounded-md" />
            <Skeleton className="h-9 w-[200px] rounded-md" />
          </div>
        </div>
      </div>
      <PostsSkeleton />
    </>
  )
}

// --- Posts list (suspends while its query is loading) ---

function PostsList({ type, category, q, sort }: {
  type: PostTypeFilter
  category: string
  q: string
  sort: SortOption
}) {
  const { data: posts } = useSuspenseQuery(postsQueryOptions({ type, category }))

  const filteredAndSorted = useMemo(() => {
    let result = posts

    if (q) {
      const lower = q.toLowerCase()
      result = result.filter(
        (p) =>
          p.postTitle.toLowerCase().includes(lower) ||
          p.description.toLowerCase().includes(lower) ||
          p.authorName.toLowerCase().includes(lower),
      )
    }

    const sorted = [...result]
    if (sort === 'price-low') {
      sorted.sort((a, b) => parseFloat(a.price ?? '0') - parseFloat(b.price ?? '0'))
    } else if (sort === 'price-high') {
      sorted.sort((a, b) => parseFloat(b.price ?? '0') - parseFloat(a.price ?? '0'))
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.postTitle.localeCompare(b.postTitle))
    }

    return sorted
  }, [posts, q, sort])

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <p className="mb-4 text-muted-foreground">
        {filteredAndSorted.length} service{filteredAndSorted.length !== 1 ? 's' : ''} available
      </p>

      {filteredAndSorted.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No services found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSorted.map((post) => (
            <PostCard key={post.postId} post={post} />
          ))}
        </div>
      )}
    </main>
  )
}

// --- Page ---

function HomePage() {
  const { q = '', type = 'all', category = 'all', sort = 'newest' } = Route.useSearch()
  const navigate = Route.useNavigate()

  // useQuery (not suspense) so the filter bar renders immediately before categories arrive
  const { data: categories = [] } = useQuery(categoriesQueryOptions)

  const setQ = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, q: value || undefined }) })
  const setType = (value: PostTypeFilter) =>
    navigate({ search: (prev) => ({ ...prev, type: value === 'all' ? undefined : value }) })
  const setCategory = (value: string | null) =>
    navigate({ search: (prev) => ({ ...prev, category: !value || value === 'all' ? undefined : value }) })
  const setSort = (value: SortOption) =>
    navigate({ search: (prev) => ({ ...prev, sort: value === 'newest' ? undefined : value }) })

  const filterControls = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Post Type</label>
        <Select value={type} onValueChange={(v) => setType(v as PostTypeFilter)}>
          <SelectTrigger>
            <SelectValue>{POST_TYPE_LABELS[type]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="offer">Offers Only</SelectItem>
            <SelectItem value="request">Requests Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue>
              {category === 'all'
                ? 'All Categories'
                : (categories.find((c) => c.categoryId === category)?.name ?? 'All Categories')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.categoryId} value={cat.categoryId}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Sort By</label>
        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger>
            <SelectValue>{SORT_LABELS[sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="name">Name: A to Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  )

  return (
    <>
      {/* Search & Filters bar — always visible */}
      <div className="border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search services, providers, or keywords..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Mobile filter sheet */}
            <Sheet>
              <SheetTrigger className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'shrink-0 md:hidden')}>
                <SlidersHorizontal className="size-4" />
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters & Sort</SheetTitle>
                  <SheetDescription>Refine your search results</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">{filterControls}</div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop filters */}
          <div className="hidden gap-3 md:flex">
            <Select value={type} onValueChange={(v) => setType(v as PostTypeFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue>{POST_TYPE_LABELS[type]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="offer">Offers Only</SelectItem>
                <SelectItem value="request">Requests Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue>
                  {category === 'all'
                    ? 'All Categories'
                    : (categories.find((c) => c.categoryId === category)?.name ?? 'All Categories')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.categoryId} value={cat.categoryId}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue>{SORT_LABELS[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Posts — Suspense boundary only covers this area */}
      <Suspense fallback={<PostsSkeleton />}>
        <PostsList type={type} category={category} q={q} sort={sort} />
      </Suspense>
    </>
  )
}
