import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '#/auth'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useDebouncer } from '@tanstack/react-pacer'
import { queryOptions, useSuspenseQuery, useQuery, keepPreviousData } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus, Heart } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { PostCardSkeleton } from '#/components/PostCardSkeleton'
import { EmptyState } from '#/components/EmptyState'
import { SearchFilterBar, type FilterItem } from '#/components/SearchFilterBar'
import { Button, buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton'
import { MultiSelect } from '#/components/ui/multi-select'
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
const sortEnum = z.enum(['newest', 'price-low', 'price-high', 'name', 'reviews-most', 'reviews-least'])

const ratingRangeSchema = z.enum(['5-4', '4-3', '3-2', '2-1', 'none'])

const searchSchema = z.object({
  q:        z.string().optional().catch(undefined),
  type:     postTypeEnum.optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  sort:     sortEnum.optional().catch(undefined),
  page:     z.number().int().positive().optional().catch(undefined),
  favourites: z.boolean().optional().catch(undefined),
  rating:   z.union([ratingRangeSchema, z.array(ratingRangeSchema)]).optional().catch(undefined),
})

type PostTypeFilter = z.infer<typeof postTypeEnum>
type SortOption = z.infer<typeof sortEnum>
type RatingRange = z.infer<typeof ratingRangeSchema>

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
  'reviews-most': 'Reviews: Most First',
  'reviews-least': 'Reviews: Fewest First',
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

function normalizeRating(rating: z.infer<typeof ratingRangeSchema> | z.infer<typeof ratingRangeSchema>[] | undefined): string[] {
  if (!rating) return []
  return Array.isArray(rating) ? rating : [rating]
}

export function postsQueryOptions(deps: {
  type?: PostTypeFilter
  category?: string
  q?: string
  sort: SortOption
  page: number
  rating?: z.infer<typeof ratingRangeSchema> | z.infer<typeof ratingRangeSchema>[]
}) {
  const ratingRanges = normalizeRating(deps.rating)
  // Build rating filter params - multiple ranges will be sent as comma-separated min-max pairs
  const ratingFilter = ratingRanges.length > 0
    ? ratingRanges.map(r => {
        if (r === '5-4') return { min: 4, max: 5 }
        if (r === '4-3') return { min: 3, max: 4 }
        if (r === '3-2') return { min: 2, max: 3 }
        if (r === '2-1') return { min: 1, max: 2 }
        if (r === 'none') return { min: 0, max: 0 }
        return null
      }).filter(Boolean)
    : undefined

  const query = {
    type:       deps.type && deps.type !== 'all' ? deps.type.toUpperCase() as 'OFFER' | 'REQUEST' : undefined,
    categoryId: deps.category !== 'all' ? deps.category : undefined,
    search:     deps.q,
    sort:       deps.sort,
    ratingFilter: ratingFilter ? JSON.stringify(ratingFilter) : undefined,
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

export const favouritesQueryOptions = queryOptions({
  queryKey: ['favourites'],
  queryFn: async () => {
    const { data, error } = await api.favourites.get()
    if (error) throw error
    return data
  },
})

// --- Route ---

export const Route = createFileRoute('/_app/posts/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { q, type, category, sort, page } }) => ({ q, type, category, sort, page }),
  loader: async ({ context: { queryClient }, deps: { q, type, category, sort = 'newest', page = 1 } }) => {
    await Promise.all([
      queryClient.ensureQueryData(categoriesQueryOptions),
      queryClient.ensureQueryData(postsQueryOptions({ q, type, category, sort, page })),
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

function PostsList({ type, category, q, sort, page, favouritesOnly, rating }: {
  type: PostTypeFilter
  category: string
  q: string
  sort: SortOption
  page: number
  favouritesOnly: boolean
  rating?: z.infer<typeof ratingRangeSchema> | z.infer<typeof ratingRangeSchema>[]
}) {
  const { data } = useSuspenseQuery(postsQueryOptions({ type, category, q, sort, page, rating }))
  const { data: session } = authClient.useSession()
  const isAuthenticated = !!session?.user

  // Prefetch favourites if authenticated
  const { data: favouritesData } = useQuery({
    ...favouritesQueryOptions,
    enabled: isAuthenticated,
  })

  const navigate = Route.useNavigate()

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) })

  // Build set of favourite post IDs (only for authenticated users)
  const favouritePostIds = useMemo(() => {
    if (!isAuthenticated || !favouritesData?.items) return new Set<string>()
    return new Set(favouritesData.items.map((f: { postId: string }) => f.postId))
  }, [isAuthenticated, favouritesData])

  // Filter posts if favouritesOnly mode
  const displayPosts = useMemo(() => {
    if (!favouritesOnly) return data.items
    return data.items.filter((post: { postId: string }) => favouritePostIds.has(post.postId))
  }, [data.items, favouritePostIds, favouritesOnly])

  const totalItems = favouritesOnly ? displayPosts.length : data.total
  const totalPages = favouritesOnly
    ? Math.ceil(displayPosts.length / PAGE_SIZE)
    : data.totalPages

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <p className="mb-4 text-muted-foreground">
        {totalItems} service{totalItems !== 1 ? 's' : ''} available
        {favouritesOnly && ' (favourites only)'}
      </p>

      {displayPosts.length === 0 ? (
        <div className="py-12 text-center">
          {favouritesOnly ? (
            <>
              <Heart className="mx-auto size-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No favourites found matching your criteria.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse posts and click the heart icon to add them to your favourites.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No services found matching your criteria.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayPosts.map((post: { postId: string }) => (
            <PostCard
              key={post.postId}
              post={post}
              isFavourite={favouritePostIds.has(post.postId)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && !favouritesOnly && (
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

              {buildPageNumbers(page, totalPages).map((item, i) =>
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
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
            : (categories.find((c: { categoryId: string; name: string }) => c.categoryId === category)?.name ?? 'All Categories')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Categories</SelectItem>
        {categories.map((cat: { categoryId: string; name: string }) => (
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

const RATING_OPTIONS: { value: RatingRange; label: string }[] = [
  { value: '5-4', label: '5-4 ★' },
  { value: '4-3', label: '4-3 ★' },
  { value: '3-2', label: '3-2 ★' },
  { value: '2-1', label: '2-1 ★' },
  { value: 'none', label: 'Without review' },
]

function RatingSelect() {
  const { rating } = Route.useSearch()
  const navigate = Route.useNavigate()
  const selected = normalizeRating(rating)

  return (
    <MultiSelect
      options={RATING_OPTIONS}
      value={selected}
      onValueChange={(next) =>
        navigate({
          search: (prev) => ({
            ...prev,
            rating: next.length > 0 ? (next as RatingRange[]) : undefined,
            page: undefined,
          }),
        })
      }
      placeholder="All Ratings"
      displayMode="text"
      showSelectAll
    />
  )
}


// --- Page ---

function HomePage() {
  const { q = '', type = 'all', category = 'all', sort = 'newest', page = 1, favourites = false, rating } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = useActiveUser()
  const isAuthenticated = user !== null

  const [inputValue, setInputValue] = useState(q)
  useEffect(() => { setInputValue(q) }, [q])

  const searchDebouncer = useDebouncer(
    (value: string) => navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }) }),
    { wait: 400 },
  )

  const toggleFavourites = () => {
    navigate({ search: (prev) => ({ ...prev, favourites: !favourites || undefined, page: undefined }) })
  }

  // Clear favourites filter when user logs out
  useEffect(() => {
    if (!isAuthenticated && favourites) {
      navigate({ search: (prev) => ({ ...prev, favourites: undefined }) })
    }
  }, [isAuthenticated, favourites, navigate])

  const filters: FilterItem[] = [
    ...(isAuthenticated ? [{
      label: 'Favourites',
      control: (
        <Button variant={favourites ? 'default' : 'outline'} className="w-full gap-2" onClick={toggleFavourites}>
          <Heart className={cn('size-4', favourites && 'fill-red-500')} />
          {favourites ? 'Favourites' : 'Show Favourites'}
        </Button>
      ),
    }] : []),
    { label: 'Post Type', control: <PostTypeSelect />, desktopWidth: 'w-[160px]' },
    { label: 'Category', control: <CategorySelect />, desktopWidth: 'w-[200px]' },
    { label: 'Rating', control: <RatingSelect />, desktopWidth: 'w-[160px]' },
    { label: 'Sort By', control: <SortSelect />, desktopWidth: 'w-[220px]' },
  ]

  return (
    <>
      {/* Search & Filters bar */}
      <div className="border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <SearchFilterBar
            searchPlaceholder="Search services, providers, or keywords..."
            searchValue={inputValue}
            onSearchChange={(value) => {
              setInputValue(value)
              searchDebouncer.maybeExecute(value)
            }}
            filters={filters}
            sheetTitle="Filters & Sort"
            sheetDescription="Refine your search results"
            action={
              isAuthenticated ? (
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
        <PostsList type={type} category={category} q={q} sort={sort} page={page} favouritesOnly={favourites} rating={rating} />
      </Suspense>
    </>
  )
}
