import { Suspense, useState } from 'react'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { api } from '#/api'
import { PostCard } from '#/components/PostCard'
import { EmptyState } from '#/components/EmptyState'
import { PageHeader } from '#/components/PageHeader'
import { PostsGridSkeleton } from '#/components/PostsGridSkeleton'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { useActiveProfile } from '#/context/activeProfile'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { PaginationBar } from '#/components/PaginationBar'
import { profilePostsQueryOptions } from '#/lib/queries/profiles'

type Post = { postId: string; postTitle: string }

const searchSchema = z.object({
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/my-postings')({
  validateSearch: searchSchema,
  beforeLoad: ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: MyPostingsPage,
})

function PostsGrid({ profileId, page }: { profileId: string; page: number }) {
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(profilePostsQueryOptions(profileId, page))
  const navigate = Route.useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.posts({ id: postId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] })
    },
  })

  const setPage = (value: number) =>
    navigate({ search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }) })

  const posts = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  if (posts.length === 0 && page === 1) {
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
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            onDelete={() => setDeleteTarget(post)}
            deleteDisabled={deleteMutation.isPending}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} className="mt-8" />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete post?"
        description={`This will permanently remove "${deleteTarget?.postTitle ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={async () => { if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.postId) }}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

function MyPostingsPage() {
  const { activeProfile } = useActiveProfile()
  const { page = 1 } = Route.useSearch()

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
        <Suspense fallback={<PostsGridSkeleton />}>
          <PostsGrid profileId={activeProfile.userProfileId} page={page} />
        </Suspense>
      ) : (
        <EmptyState message="No profile found." />
      )}
    </main>
  )
}
