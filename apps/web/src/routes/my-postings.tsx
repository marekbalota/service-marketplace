import { createFileRoute } from '@tanstack/react-router'
import { queryOptions, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { useActiveProfile } from '#/contexts/ActiveProfileContext'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { Post, PostsPage } from '#/types'

export function myPostingsQueryOptions(authorId: string) {
  return queryOptions({
    queryKey: ['posts', { authorId }],
    queryFn: async () => {
      const { data, error } = await api.posts.get({
        query: { authorId, size: 100 },
      })
      if (error) throw error
      return data as PostsPage
    },
    enabled: !!authorId,
  })
}

export const Route = createFileRoute('/my-postings')({
  component: MyPostingsPage,
})

function PostsGrid({ authorId }: { authorId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery(myPostingsQueryOptions(authorId))
  const posts = data?.items ?? []

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.posts({ id: postId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  if (isLoading) {
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

  if (posts.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">You haven't created any postings yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post: Post) => (
        <div key={post.postId} className="relative">
          <PostCard post={post} />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-10 top-3 text-muted-foreground hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(post.postId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function MyPostingsPage() {
  const { activeProfile, isLoading: profileLoading } = useActiveProfile()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">My Postings</h1>
          <p className="mt-1 text-muted-foreground">Manage your service offerings</p>
        </div>
      </div>

      {profileLoading || !activeProfile ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      ) : (
        <PostsGrid authorId={activeProfile.userProfileId} />
      )}
    </main>
  )
}
