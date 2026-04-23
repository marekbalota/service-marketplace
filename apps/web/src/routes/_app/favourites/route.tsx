import { Suspense } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart, ArrowLeft } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { Skeleton } from '#/components/ui/skeleton'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useCurrentUser } from '#/lib/userQueries'
import { useActiveProfile } from '#/hooks/useActiveProfile'

export function favouritesQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['favourites', profileId],
    queryFn: async () => {
      const { data, error } = await api.favourites.get({ query: { profileId } })
      if (error) throw error
      return data
    },
  })
}

export const Route = createFileRoute('/_app/favourites')({
  beforeLoad: ({ context: { user } }) => {
    if (!user) throw redirect({ to: '/login' })
  },
  pendingComponent: FavouritesPageSkeleton,
  component: FavouritesPage,
})

function FavouritesPageSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </main>
  )
}

function FavouritesGrid() {
  const queryClient = useQueryClient()
  const { activeProfile } = useActiveProfile()
  const profileId = activeProfile!.userProfileId
  const { data } = useSuspenseQuery(favouritesQueryOptions(profileId))
  const favouritePosts = data?.items ?? []

  const removeMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.favourites({ postId }).delete({ profileId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites', profileId] })
    },
  })

  if (favouritePosts.length === 0) {
    return (
      <div className="py-16 text-center">
        <Heart className="mx-auto size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">No favourites yet</h3>
        <p className="mt-2 text-muted-foreground">
          Browse posts and click the heart icon to save your favourites.
        </p>
        <Link to="/posts" className={cn(buttonVariants({ variant: 'default' }), 'mt-6 gap-2')}>
          <ArrowLeft className="size-4" />
          Browse Posts
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {favouritePosts.map((post) => (
        <PostCard
          key={post.postId}
          post={post}
          isFavourite={true}
          onFavouriteToggle={() => removeMutation.mutate(post.postId)}
          favouriteDisabled={removeMutation.isPending}
        />
      ))}
    </div>
  )
}

function FavouritesPage() {
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">My Favourites</h1>
            <p className="mt-1 text-muted-foreground">
              Posts you've saved for later
            </p>
          </div>
        </div>
      </div>

      {user && activeProfile ? (
        <Suspense fallback={<FavouritesPageSkeleton />}>
          <FavouritesGrid />
        </Suspense>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Please sign in to view your favourites.</p>
        </div>
      )}
    </main>
  )
}
