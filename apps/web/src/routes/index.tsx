import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { queryOptions, useSuspenseQuery, useQuery, keepPreviousData } from '@tanstack/react-query'
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name'
type PostTypeFilter = 'all' | 'offer' | 'request'

const PAGE_SIZE = 12

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

export type Category = {
  categoryId: string
  name: string
  description: string | null
}

export type Post = {
  postId: string
  postTitle: string
  description: string
  postType: string
  price: string | null
  rateType: string | null
  createdAt: string | Date
  authorName: string
  categories: { categoryId: string; name: string }[]
}

export type PostsPage = {
  items: Post[]
  total: number
  totalPages: number
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

export function postsQueryOptions(deps: {
  type?: PostTypeFilter
  category?: string
  q?: string
  sort?: SortOption
  page?: number
}) {
  const query: Record<string, string> = {}
  if (deps.type && deps.type !== 'all')         query.type       = deps.type.toUpperCase()
  if (deps.category && deps.category !== 'all') query.categoryId = deps.category
  if (deps.q)                                   query.search     = deps.q
  if (deps.sort && deps.sort !== 'newest')      query.sort       = deps.sort
  if (deps.page && deps.page > 1)               query.page       = String(deps.page)
  query.pageSize = String(PAGE_SIZE)

  return queryOptions({
    queryKey: ['posts', deps],
    queryFn: async () => {
      const { data, error } = await api.posts.get({ query })
      if (error) throw error
      return data as PostsPage
    },
    placeholderData: keepPreviousData,
  })
}

// --- Route ---

export const Route = createFileRoute('/')({
  validateSearch: (search): {
    q?: string
    type?: PostTypeFilter
    category?: string
    sort?: SortOption
    page?: number
  } => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    type: VALID_TYPES.includes(search.type as PostTypeFilter)
      ? (search.type as PostTypeFilter)
      : undefined,
    category: typeof search.category === 'string' ? search.category : undefined,
    sort: VALID_SORTS.includes(search.sort as SortOption)
      ? (search.sort as SortOption)
      : undefined,
    page: typeof search.page === 'number' && search.page > 0
      ? Math.floor(search.page)
      : undefined,
  }),
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
        {Array.from({ length: PAGE_SIZE }).map((_, i) => <PostSkeleton key={i} />)}
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

// --- Page number builder ---

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const pages = new Set<number>()
  pages.add(1)
  pages.add(total)
  for (let p = Math.max(1, current - 1); p <= Math.min(total, current + 1); p++) {
    pages.add(p)
  }
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]!
    const prev = sorted[i - 1]
    if (i > 0 && prev !== undefined && curr - prev > 1) result.push('ellipsis')
    result.push(curr)
  }
  return result
}

// --- Posts list (suspends while its query is loading) ---

function PostsList({ type, category, q, sort, page }: {
  type: PostTypeFilter
  category: string
  q: string
  sort: SortOption
  page: number
}) {
  const { data } = useSuspenseQuery(postsQueryOptions({ type, category, q, sort, page }))
  const navigate = Route.useNavigate()

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) })

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <p className="mb-4 text-muted-foreground">
        {data.total} service{data.total !== 1 ? 's' : ''} available
      </p>

      {data.items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No services found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((post) => (
            <PostCard key={post.postId} post={post} />
          ))}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(page - 1)}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {buildPageNumbers(page, data.totalPages).map((item, i) =>
                item === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      isActive={item === page}
                      onClick={() => setPage(item)}
                      className="cursor-pointer"
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(page + 1)}
                  aria-disabled={page >= data.totalPages}
                  className={page >= data.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </main>
  )
}

// --- Page ---

function HomePage() {
  const { q = '', type = 'all', category = 'all', sort = 'newest', page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()

  // useQuery (not suspense) so the filter bar renders immediately before categories arrive
  const { data: categories = [] } = useQuery(categoriesQueryOptions)

  const setQ = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }) })
  const setType = (value: PostTypeFilter) =>
    navigate({ search: (prev) => ({ ...prev, type: value === 'all' ? undefined : value, page: undefined }) })
  const setCategory = (value: string) =>
    navigate({ search: (prev) => ({ ...prev, category: value === 'all' ? undefined : value, page: undefined }) })
  const setSort = (value: SortOption) =>
    navigate({ search: (prev) => ({ ...prev, sort: value === 'newest' ? undefined : value, page: undefined }) })

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
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
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

            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
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
        <PostsList type={type} category={category} q={q} sort={sort} page={page} />
      </Suspense>
    </>
  )
}
