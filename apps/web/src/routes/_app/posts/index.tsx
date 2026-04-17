import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense, useState, useEffect } from 'react'
import { useDebouncer } from '@tanstack/react-pacer'
import { queryOptions, useSuspenseQuery, useQuery, keepPreviousData } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus, Search } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { PostCardSkeleton } from '#/components/PostCardSkeleton'
import { EmptyState } from '#/components/EmptyState'
import { SearchFilterBar } from '#/components/SearchFilterBar'
import { Input } from '#/components/ui/input'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton'
import { useActiveUser } from '#/contexts/ActiveUserContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '#/components/ui/pagination'

const postTypeEnum = z.enum(['all', 'offer', 'request'])
const sortEnum = z.enum(['newest', 'price-low', 'price-high', 'name'])

const searchSchema = z.object({
  q:        z.string().optional().catch(undefined),
  type:     postTypeEnum.optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  sort:     sortEnum.optional().catch(undefined),
  page:     z.number().int().positive().optional().catch(undefined),
})

type PostTypeFilter = z.infer<typeof postTypeEnum>
type SortOption = z.infer<typeof sortEnum>

const PAGE_SIZE = 12

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
    return data
  },
})

export function postsQueryOptions(deps: {
  type?: PostTypeFilter
  category?: string
  q?: string
  sort: SortOption
  page: number
}) {
  const query = {
    type:       deps.type && deps.type !== 'all' ? deps.type.toUpperCase() as 'OFFER' | 'REQUEST' : undefined,
    categoryId: deps.category !== 'all' ? deps.category : undefined,
    search:     deps.q,
    sort:       deps.sort,
    offset:     (deps.page - 1) * PAGE_SIZE,
    size:       PAGE_SIZE,
  }

  return queryOptions({
    queryKey: ['posts', deps],
    queryFn: async () => {
      const { data, error } = await api.posts.get({ query })
      if (error) throw error
      return data
    },
    placeholderData: keepPreviousData,
  })
}

// --- Route ---

export const Route = createFileRoute('/_app/posts/')({
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(categoriesQueryOptions),
      queryClient.ensureQueryData(postsQueryOptions({ sort: 'newest', page: 1 })),
    ])
  },
  pendingComponent: PageSkeleton,
  component: HomePage,
})

// --- Skeletons ---

function PostsSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
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
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="size-9 shrink-0 rounded-md" />
            </div>
            <div className="hidden gap-3 md:flex">
              <Skeleton className="h-9 w-[160px] rounded-md" />
              <Skeleton className="h-9 w-[200px] rounded-md" />
              <Skeleton className="h-9 w-[200px] rounded-md" />
            </div>
          </div>
        </div>
      </div>
      <PostsSkeleton />
    </>
  )
}

// --- Page number builder ---

export function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
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
        <EmptyState message="No services found matching your criteria." />
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

// --- Filter select sub-components ---
// Each reads its own slice of search params and navigates independently,
// so they render correctly both in the mobile Sheet and the desktop bar.

function PostTypeSelect() {
  const { type = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <Select
      value={type}
      onValueChange={(v) =>
        navigate({ search: (prev) => ({ ...prev, type: v === 'all' ? undefined : (v as PostTypeFilter), page: undefined }) })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{POST_TYPE_LABELS[type]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(POST_TYPE_LABELS) as [PostTypeFilter, string][]).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CategorySelect() {
  const { category = 'all' } = Route.useSearch()
  const navigate = Route.useNavigate()
  // useQuery (not suspense) so the filter bar renders immediately before categories arrive
  const { data: categories = [] } = useQuery(categoriesQueryOptions)
  return (
    <Select
      value={category}
      onValueChange={(v) =>
        v && navigate({ search: (prev) => ({ ...prev, category: v === 'all' ? undefined : v, page: undefined }) })
      }
    >
      <SelectTrigger className="w-full">
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
  )
}

function SortSelect() {
  const { sort = 'newest' } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <Select
      value={sort}
      onValueChange={(v) =>
        navigate({ search: (prev) => ({ ...prev, sort: v === 'newest' ? undefined : (v as SortOption), page: undefined }) })
      }
    >
      <SelectTrigger className="w-full">
        <SelectValue>{SORT_LABELS[sort]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// --- Page ---

function HomePage() {
  const { q = '', type = 'all', category = 'all', sort = 'newest', page = 1 } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useActiveUser()

  const [inputValue, setInputValue] = useState(q)
  useEffect(() => { setInputValue(q) }, [q])

  const searchDebouncer = useDebouncer(
    (value: string) => navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }) }),
    { wait: 400 },
  )

  return (
    <>
      {/* Search & Filters bar */}
      <div className="border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <SearchFilterBar
            search={
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search services, providers, or keywords..."
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    searchDebouncer.maybeExecute(e.target.value)
                  }}
                  className="pl-9"
                />
              </div>
            }
            filters={[
              { label: 'Post Type', control: <PostTypeSelect />, desktopWidth: 'w-[160px]' },
              { label: 'Category', control: <CategorySelect />, desktopWidth: 'w-[200px]' },
              { label: 'Sort By', control: <SortSelect />, desktopWidth: 'w-[200px]' },
            ]}
            sheetTitle="Filters & Sort"
            sheetDescription="Refine your search results"
            action={
              user !== null ? (
                <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'shrink-0 gap-2')}>
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">New Post</span>
                </Link>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Posts — Suspense boundary only covers this area */}
      <Suspense fallback={<PostsSkeleton />}>
        <PostsList type={type} category={category} q={q} sort={sort} page={page} />
      </Suspense>
    </>
  )
}
