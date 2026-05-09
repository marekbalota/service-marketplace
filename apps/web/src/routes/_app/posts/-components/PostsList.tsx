import { useMemo } from 'react'
import { useSuspenseQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { PostCard } from '#/components/PostCard'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { PaginationBar } from '#/components/PaginationBar'
import { Route } from '../index'
import { favouritesQueryOptions } from '#/lib/queries/posts'
import { postsQueryOptions, type RatingRange } from '../-queries/posts'

export function PostsList({ type, category, q, sort, page, favouritesOnly, rating, country, region, city }: {
  type: 'all' | 'offer' | 'request'
  category?: string | string[]
  q: string
  sort: 'newest' | 'price-low' | 'price-high' | 'name' | 'reviews-most' | 'reviews-least'
  page: number
  favouritesOnly: boolean
  rating?: RatingRange | RatingRange[]
  country?: string
  region?: string
  city?: string
}) {
  const { data: user } = useCurrentUser()
  const isAuthenticated = user != null
  const { activeProfile } = useActiveProfile()

  const activeProfileId = activeProfile?.userProfileId
  const profileId = favouritesOnly ? activeProfileId : undefined
  const { data } = useSuspenseQuery(postsQueryOptions({ type, category, q, sort, page, rating, profileId, country, region, city }))

  const { data: favouritesData } = useQuery({
    ...favouritesQueryOptions(activeProfileId ?? ''),
    enabled: isAuthenticated && !favouritesOnly && !!activeProfileId,
  })

  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) })

  const profileIdPostsPredicate = (query: { queryKey: unknown }) =>
    Array.isArray(query.queryKey) &&
    query.queryKey[0] === 'posts' &&
    (query.queryKey[1] as { profileId?: string } | undefined)?.profileId != null

  const handleFavouriteToggle = () => {
    if (favouritesOnly) {
      queryClient.invalidateQueries({ predicate: profileIdPostsPredicate })
    } else {
      queryClient.removeQueries({ predicate: profileIdPostsPredicate })
    }
  }

  const favouritePostIds = useMemo(() => {
    if (!isAuthenticated) return new Set<string>()
    if (favouritesOnly) return new Set(data.items.map(p => p.postId))
    if (!favouritesData?.items) return new Set<string>()
    return new Set(favouritesData.items.map((f: { postId: string }) => f.postId))
  }, [isAuthenticated, favouritesData, favouritesOnly, data.items])

  const totalItems = data.total
  const totalPages = data.totalPages

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <p className="mb-4 text-muted-foreground">
        {favouritesOnly
          ? `${totalItems} favourite${totalItems !== 1 ? 's' : ''}`
          : `${totalItems} service${totalItems !== 1 ? 's' : ''} available`}
      </p>

      {data.items.length === 0 ? (
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
          {data.items.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              isFavourite={favouritePostIds.has(post.postId)}
              onFavouriteToggle={handleFavouriteToggle}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
      )}
    </main>
  )
}
