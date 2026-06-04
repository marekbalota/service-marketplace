import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { wrapEdenError } from '#/lib/api-error'
import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useLocale } from '#/lib/useLocale'
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
  tab: z.enum(['active', 'archived', 'banned']).optional().catch(undefined),
})

export const Route = createFileRoute('/$locale/_app/my-postings')({
  validateSearch: searchSchema,
  beforeLoad: ({ context: { user }, location, params }) => {
    if (!user)
      throw redirect({
        to: '/$locale/login',
        params,
        search: { redirect: location.href },
        replace: true,
      })
  },
  component: MyPostingsPage,
})

function PostsGrid({
  profileId,
  page,
  status,
}: {
  profileId: string
  page: number
  status: 'active' | 'archived' | 'banned'
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(profilePostsQueryOptions(profileId, page, status))
  const navigate = Route.useNavigate()
  const locale = useLocale()
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
    if (status === 'banned') return <EmptyState message={t('myPostings.noBanned')} />
    if (status === 'archived') return <EmptyState message={t('myPostings.noArchived')} />
    return (
      <EmptyState message={t('myPostings.noPostings')}>
        <Link
          to="/$locale/create-post"
          params={{ locale }}
          className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}
        >
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
            isBanned={status === 'banned'}
            onDelete={status !== 'banned' ? () => setDeleteTarget(post) : undefined}
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
  const locale = useLocale()

  const profileId = activeProfile?.userProfileId ?? ''

  const { data: postCounts } = useQuery({
    ...profilePostsCountQueryOptions(profileId),
    enabled: !!activeProfile,
  })

  function handleTabChange(value: string) {
    const tabMap: Record<string, 'archived' | 'banned' | undefined> = {
      active: undefined,
      archived: 'archived',
      banned: 'banned',
    }
    navigate({
      search: () => ({ tab: tabMap[value] }),
      replace: true,
    })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader
        title={t('myPostings.title')}
        description={t('myPostings.subtitle')}
        action={
          <Link
            to="/$locale/create-post"
            params={{ locale }}
            className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}
          >
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
          <TabsTrigger value="banned">
            {t('myPostings.banned')}
            {postCounts ? ` (${postCounts.banned})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeProfile ? (
            <Suspense fallback={<PostsGridSkeleton />}>
              <PostsGrid profileId={activeProfile.userProfileId} page={page} status="active" />
            </Suspense>
          ) : (
            <EmptyState message={t('errors.noProfile')} />
          )}
        </TabsContent>

        <TabsContent value="archived">
          {activeProfile ? (
            <Suspense fallback={<PostsGridSkeleton />}>
              <PostsGrid profileId={activeProfile.userProfileId} page={page} status="archived" />
            </Suspense>
          ) : (
            <EmptyState message={t('errors.noProfile')} />
          )}
        </TabsContent>

        <TabsContent value="banned">
          {activeProfile ? (
            <Suspense fallback={<PostsGridSkeleton />}>
              <PostsGrid profileId={activeProfile.userProfileId} page={page} status="banned" />
            </Suspense>
          ) : (
            <EmptyState message={t('errors.noProfile')} />
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}
