import { createFileRoute } from '@tanstack/react-router'
import { wrapEdenError } from '#/lib/api-error'
import { Suspense, useState } from 'react'
import { useSuspenseQuery, useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { z } from 'zod'
import { api } from '#/api'
import { BackButton } from '#/components/BackButton'
import { EmptyState } from '#/components/EmptyState'
import { PostCard } from '#/components/PostCard'
import { PostsGridSkeleton } from '#/components/PostsGridSkeleton'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { PaginationBar } from '#/components/PaginationBar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#/components/ui/tabs'
import { hasPermissions, Permissions } from '@marketplace/shared'
import { useCurrentUser } from '#/lib/queries/users'
import { useLocale } from '#/lib/useLocale'
import {
  profileQueryOptions,
  profilePostsQueryOptions,
  profilePostsCountQueryOptions,
} from '#/lib/queries/profiles'

const searchSchema = z.object({
  page: z.number().int().positive().optional().catch(undefined),
  tab: z.enum(['active', 'archived']).optional().catch(undefined),
})

export const Route = createFileRoute('/$locale/_app/admin/users/$userId/profile/$profileId/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { page, tab } }) => ({ page, tab }),
  loader: ({ context: { queryClient }, params: { profileId }, deps: { page = 1 } }) => {
    void queryClient.prefetchQuery(profileQueryOptions(profileId))
    void queryClient.prefetchQuery(profilePostsQueryOptions(profileId, page))
    void queryClient.prefetchQuery(profilePostsCountQueryOptions(profileId))
  },
  component: ProfileDetailPage,
})

type Post = { postId: string; postTitle: string }

function ProfileInfoCard({ profileId }: { profileId: string }) {
  const { data: profile } = useSuspenseQuery(profileQueryOptions(profileId))

  return (
    <Card className="mb-6">
      <CardContent className="pt-2">
        <div className="flex items-start gap-4">
          <ProfileAvatar
            name={profile.name}
            className="size-16 shrink-0 shadow-md"
            fallbackClassName="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-lg"
          />
          <div className="flex-1">
            <h1 className="text-xl font-semibold mb-0.5">{profile.name}</h1>
            <p className="text-sm text-muted-foreground mb-1">{profile.email}</p>
            {profile.bio && <p className="text-sm text-muted-foreground mb-2">{profile.bio}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
              {profile.phoneNumber && <span>📞 {profile.phoneNumber}</span>}
              {profile.fax && <span>📠 {profile.fax}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileInfoSkeleton() {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <Skeleton className="size-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfilePostsList({
  profileId,
  userId: _userId,
  canDeletePost,
  archived,
  page,
}: {
  profileId: string
  userId: string
  canDeletePost: boolean
  archived: boolean
  page: number
}) {
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data: postsData } = useSuspenseQuery(profilePostsQueryOptions(profileId, page, archived))

  const posts = postsData?.items ?? []
  const totalPages = postsData?.totalPages ?? 1

  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }), replace: true })

  const deleteMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.admin.posts({ id: postId }).delete({})
      if (error) throw wrapEdenError(error, 'Failed to delete post.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] })
      setDeleteTarget(null)
    },
  })

  const { t } = useTranslation()

  if (posts.length === 0) {
    return (
      <EmptyState
        message={archived ? t('profiles.noArchivedPosts') : t('profiles.noActivePosts')}
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            showFavouriteButton={false}
            onDelete={canDeletePost ? () => setDeleteTarget(post) : undefined}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-6"
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('myPostings.deleteTitle')}
        description={t('myPostings.deleteMessage', { title: deleteTarget?.postTitle ?? '' })}
        confirmLabel={t('myPostings.delete')}
        destructive
        reasonLabel={t('admin.reports.reason')}
        reasonRequired
        onConfirm={() => deleteMutation.mutateAsync(deleteTarget!.postId)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

function ProfileDetailPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { userId, profileId } = Route.useParams()
  const navigate = Route.useNavigate()
  const { tab, page = 1 } = Route.useSearch()
  const activeTab = tab ?? 'active'
  const { data: user } = useCurrentUser()
  const permissions = user?.role?.permissions ?? []
  const canDeletePost = hasPermissions(permissions, [Permissions.AdminPostsDeleteAny])

  const { data: postCounts } = useQuery(profilePostsCountQueryOptions(profileId))

  function handleTabChange(value: string) {
    navigate({
      search: (prev) => ({
        ...prev,
        tab: value === 'archived' ? 'archived' : undefined,
        page: undefined,
      }),
      replace: true,
    })
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        onClick={() => navigate({ to: '/$locale/admin/users/$userId', params: { locale, userId } })}
        label={t('admin.backToUser')}
      />

      <Suspense fallback={<ProfileInfoSkeleton />}>
        <ProfileInfoCard profileId={profileId} />
      </Suspense>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList variant="line" className="gap-6 mb-4">
          <TabsTrigger value="active">
            {t('profiles.activeTab')}
            {postCounts ? ` (${postCounts.active})` : ''}
          </TabsTrigger>
          <TabsTrigger value="archived">
            {t('profiles.archivedTab')}
            {postCounts ? ` (${postCounts.archived})` : ''}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <Suspense fallback={<PostsGridSkeleton />}>
            <ProfilePostsList
              profileId={profileId}
              userId={userId}
              canDeletePost={canDeletePost}
              archived={false}
              page={page}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="archived">
          <Suspense fallback={<PostsGridSkeleton />}>
            <ProfilePostsList
              profileId={profileId}
              userId={userId}
              canDeletePost={canDeletePost}
              archived={true}
              page={page}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  )
}
