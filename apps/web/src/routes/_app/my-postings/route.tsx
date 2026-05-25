import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { wrapEdenError } from '#/lib/api-error'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#/components/ui/tabs'
import { cn } from '#/lib/utils'
import { PaginationBar } from '#/components/PaginationBar'
import { profilePostsQueryOptions, profilePostsCountQueryOptions } from '#/lib/queries/profiles'

type Post = { postId: string; postTitle: string }

const searchSchema = z.object({
  page: z.number().int().positive().optional().catch(undefined),
  tab: z.enum(['active', 'archived']).optional().catch(undefined),
})

export const Route = createFileRoute('/_app/my-postings')({
  validateSearch: searchSchema,
  beforeLoad: ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href }, replace: true })
  },
  component: MyPostingsPage,
})

function PostsGrid({
  profileId,
  page,
  archived,
}: {
  profileId: string
  page: number
  archived: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(profilePostsQueryOptions(profileId, page, archived))
  const navigate = Route.useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.posts({ id: postId }).delete()
      if (error) throw wrapEdenError(error, 'Failed to delete post.')
    },
    onSuccess: () => {
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] })
    },
  })

  const setPage = (value: number) =>
    navigate({
      search: (prev) => ({ ...prev, page: value === 1 ? undefined : value }),
      replace: true,
    })

  const posts = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  if (posts.length === 0 && page === 1) {
    return archived ? (
      <EmptyState message={t('myPostings.noArchived')} />
    ) : (
      <EmptyState message={t('myPostings.noPostings')}>
        <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
          <Plus className="size-4" />
          {t('myPostings.createFirst')}
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
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-8"
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('myPostings.deleteTitle')}
        description={t('myPostings.deleteMessage', { title: deleteTarget?.postTitle ?? '' })}
        confirmLabel={t('myPostings.delete')}
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.postId)
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

function MyPostingsPage() {
  const { t } = useTranslation()
  const { activeProfile } = useActiveProfile()
  const { page = 1, tab } = Route.useSearch()
  const navigate = Route.useNavigate()

  const profileId = activeProfile?.userProfileId ?? ''

  const { data: postCounts } = useQuery({
    ...profilePostsCountQueryOptions(profileId),
    enabled: !!activeProfile,
  })

  function handleTabChange(value: string) {
    navigate({
      search: () => ({ tab: value === 'archived' ? 'archived' : undefined }),
      replace: true,
    })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={t('myPostings.title')}
        description={t('myPostings.subtitle')}
        action={
          <Link to="/create-post" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
            <Plus className="size-4" />
            {t('myPostings.createPosting')}
          </Link>
        }
      />

      <Tabs value={tab ?? 'active'} onValueChange={handleTabChange}>
        <TabsList variant="line" className="gap-6 mb-6">
          <TabsTrigger value="active">
            {t('myPostings.active')}
            {postCounts ? ` (${postCounts.active})` : ''}
          </TabsTrigger>
          <TabsTrigger value="archived">
            {t('myPostings.archived')}
            {postCounts ? ` (${postCounts.archived})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeProfile ? (
            <Suspense fallback={<PostsGridSkeleton />}>
              <PostsGrid profileId={activeProfile.userProfileId} page={page} archived={false} />
            </Suspense>
          ) : (
            <EmptyState message={t('errors.noProfile')} />
          )}
        </TabsContent>

        <TabsContent value="archived">
          {activeProfile ? (
            <Suspense fallback={<PostsGridSkeleton />}>
              <PostsGrid profileId={activeProfile.userProfileId} page={page} archived={true} />
            </Suspense>
          ) : (
            <EmptyState message={t('errors.noProfile')} />
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
