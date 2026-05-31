import { createFileRoute, Link } from '@tanstack/react-router'
import { Suspense, useState, useEffect } from 'react'
import { useDebouncer } from '@tanstack/react-pacer'
import { z } from 'zod'
import { Plus, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { Skeleton } from '#/components/ui/skeleton'
import { PostsGridSkeleton } from '#/components/PostsGridSkeleton'
import { SearchFilterBar, type FilterItem } from '#/components/SearchFilterBar'
import { useCurrentUser } from '#/lib/queries/users'
import { categoriesQueryOptions } from '#/lib/queries/posts'
import { postsQueryOptions, PAGE_SIZE } from './-queries/posts'
import { PostsList } from './-components/PostsList'
import { PostTypeSelect } from './-components/PostTypeSelect'
import { CategorySelect } from './-components/CategorySelect'
import { SortSelect } from './-components/SortSelect'
import { RatingSelect } from './-components/RatingSelect'
import { LocationSelect } from './-components/LocationSelect'
import { useLocale } from '#/lib/useLocale'

const postTypeEnum = z.enum(['all', 'offer', 'request'])
const sortEnum = z.enum([
  'newest',
  'price-low',
  'price-high',
  'name',
  'reviews-most',
  'reviews-least',
])
const ratingRangeSchema = z.enum(['5-4', '4-3', '3-2', '2-1', 'none'])

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  type: postTypeEnum.optional().catch(undefined),
  category: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .catch(undefined),
  sort: sortEnum.optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
  favourites: z.boolean().optional().catch(undefined),
  rating: z
    .union([ratingRangeSchema, z.array(ratingRangeSchema)])
    .optional()
    .catch(undefined),
  country: z.string().optional().catch(undefined),
  region: z.string().optional().catch(undefined),
  city: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/$locale/_app/posts/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { q, type, category, sort, page, rating, country, region, city } }) => ({
    q,
    type,
    category,
    sort,
    page,
    rating,
    country,
    region,
    city,
  }),
  loader: async ({
    context: { queryClient },
    deps: { q, type, category, sort = 'newest', page = 1, rating, country, region, city },
    params,
  }) => {
    const locale = params.locale as string
    await Promise.all([
      queryClient.ensureQueryData(categoriesQueryOptions(locale)),
      queryClient.ensureQueryData(
        postsQueryOptions({ q, type, category, sort, page, rating, country, region, city, locale }),
      ),
    ])
  },
  pendingComponent: PageSkeleton,
  component: HomePage,
})

function PostsSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="mb-4 h-4 w-40" />
      <PostsGridSkeleton count={PAGE_SIZE} />
    </main>
  )
}

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

function HomePage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const {
    q = '',
    type = 'all',
    category,
    sort = 'newest',
    page = 1,
    favourites = false,
    rating,
    country,
    region,
    city,
  } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: user } = useCurrentUser()
  const isAuthenticated = user != null

  const [inputValue, setInputValue] = useState(q)
  useEffect(() => {
    setInputValue(q)
  }, [q])

  const searchDebouncer = useDebouncer(
    (value: string) =>
      navigate({ search: (prev) => ({ ...prev, q: value || undefined, page: undefined }) }),
    { wait: 400 },
  )

  const toggleFavourites = () => {
    navigate({
      search: (prev) => ({ ...prev, favourites: !favourites || undefined, page: undefined }),
    })
  }

  useEffect(() => {
    if (!isAuthenticated && favourites) {
      navigate({ search: (prev) => ({ ...prev, favourites: undefined }) })
    }
  }, [isAuthenticated, favourites, navigate])

  const filters: FilterItem[] = [
    ...(isAuthenticated
      ? [
          {
            label: t('posts.favourites'),
            control: (
              <Button
                variant={favourites ? 'default' : 'outline'}
                className="w-full gap-2"
                onClick={toggleFavourites}
              >
                <Heart className={cn('size-4', favourites && 'fill-red-500')} />
                {favourites ? t('posts.favourites') : t('posts.showFavourites')}
              </Button>
            ),
          },
        ]
      : []),
    {
      label: t('posts.postType'),
      control: <PostTypeSelect />,
      desktopWidth: isAuthenticated ? 'w-[200px]' : 'flex-1',
    },
    {
      label: t('posts.category'),
      control: <CategorySelect />,
      desktopWidth: isAuthenticated ? 'w-[200px]' : 'flex-1',
    },
    {
      label: t('posts.ratingLabel'),
      control: <RatingSelect />,
      desktopWidth: isAuthenticated ? 'w-[200px]' : 'flex-1',
    },
    {
      label: t('posts.sortBy'),
      control: <SortSelect />,
      desktopWidth: isAuthenticated ? 'w-[200px]' : 'flex-1',
    },
    {
      label: t('posts.locations'),
      control: <LocationSelect />,
      desktopWidth: isAuthenticated ? 'w-[240px]' : 'flex-1',
    },
  ]

  return (
    <>
      <div className="border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <SearchFilterBar
            searchPlaceholder={t('posts.searchPlaceholder')}
            searchValue={inputValue}
            onSearchChange={(value) => {
              setInputValue(value)
              searchDebouncer.maybeExecute(value)
            }}
            filters={filters}
            sheetTitle={t('posts.filters')}
            sheetDescription={t('posts.filtersSubtitle')}
            action={
              isAuthenticated ? (
                <Link
                  to="/$locale/create-post" params={{ locale }}
                  className={cn(buttonVariants({ variant: 'default' }), 'shrink-0 gap-2')}
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">{t('posts.newPost')}</span>
                </Link>
              ) : undefined
            }
          />
        </div>
      </div>

      <Suspense fallback={<PostsSkeleton />}>
        <PostsList
          type={type}
          category={category}
          q={q}
          sort={sort}
          page={page}
          favouritesOnly={favourites}
          rating={rating}
          country={country}
          region={region}
          city={city}
        />
      </Suspense>
    </>
  )
}
