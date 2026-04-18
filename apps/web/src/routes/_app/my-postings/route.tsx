import { Suspense } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { PostCardSkeleton } from '#/components/PostCardSkeleton'
import { EmptyState } from '#/components/EmptyState'
import { PageHeader } from '#/components/PageHeader'
import { useActiveUser } from '#/contexts/ActiveUserContext'
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
  beforeLoad: async ({ context : { user } }) => {
    if (!user) throw redirect({ to: '/login' })
  },
  component: MyPostingsPage,
})

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
      <EmptyState message="You haven't created any postings yet.">
        <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
          <Plus className="size-4" />
          Create your first posting
        </Link>
      </EmptyState>
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
  const { activeProfile } = useActiveUser()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title="My Postings"
        description="Manage your service offerings"
        action={
          <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
            <Plus className="size-4" />
            Create Posting
          </Link>
        }
      />

      {activeProfile ? (
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <PostsGrid profileId={activeProfile.userProfileId} />
        </Suspense>
      ) : (
        <EmptyState message="No profile found." />
      )}
    </main>
  )
}
