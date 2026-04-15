import { Suspense } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { useActiveProfile } from '#/hooks/useActiveProfile'
import { Skeleton } from '#/components/ui/skeleton'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'

export function myPostingsQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'posts'],
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).posts.get()
      if (error) throw error
      return data
    },
  })
}

export const Route = createFileRoute('/_app/my-postings')({
  beforeLoad: ({ context: { user } }) => {
    if (!user) throw redirect({ to: '/login' })
  },
  component: MyPostingsPage,
})

function PostsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
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
  )
}

function PostsGrid({ profileId }: { profileId: string }) {
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(myPostingsQueryOptions(profileId))
  const posts = data ?? []

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.posts({ id: postId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] })
    },
  })

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted-foreground">You haven't created any postings yet.</p>
        <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
          <Plus className="size-4" />
          Create your first posting
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard
          key={post.postId}
          post={post}
          onDelete={() => deleteMutation.mutate(post.postId)}
          deleteDisabled={deleteMutation.isPending}
        />
      ))}
    </div>
  )
}

function MyPostingsPage() {
  const { user } = Route.useRouteContext()
  const { activeProfile } = useActiveProfile(user)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">My Postings</h1>
          <p className="mt-1 text-muted-foreground">Manage your service offerings</p>
        </div>
        <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
          <Plus className="size-4" />
          Create Posting
        </Link>
      </div>

      {activeProfile ? (
        <Suspense fallback={<PostsSkeleton />}>
          <PostsGrid profileId={activeProfile.userProfileId} />
        </Suspense>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No profile found.</p>
        </div>
      )}
    </main>
  )
}
