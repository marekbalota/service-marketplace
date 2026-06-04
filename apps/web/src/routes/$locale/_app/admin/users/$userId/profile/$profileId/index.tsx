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
  tab: z.enum(['active', 'archived', 'banned']).optional().catch(undefined),
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
  canBanPost,
  status,
  page,
}: {
  profileId: string
  userId: string
  canBanPost: boolean
  status: 'active' | 'archived' | 'banned'
  page: number
}) {
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const { data: postsData } = useSuspenseQuery(profilePostsQueryOptions(profileId, page, status))

  const posts = postsData?.items ?? []
  const totalPages = postsData?.totalPages ?? 1

  const { t } = useTranslation()
  const [banTarget, setBanTarget] = useState<Post | null>(null)
  const [unbanTarget, setUnbanTarget] = useState<Post | null>(null)

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }), replace: true })

  const banMutation = useMutation({
    mutationFn: async ({ postId, banReason }: { postId: string; banReason: string }) => {
      const { error } = await api.admin.posts({ id: postId }).delete({ banReason })
      if (error) throw wrapEdenError(error, t('admin.banPost.failed'))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setBanTarget(null)
    },
  })

  const unbanMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await api.admin.posts({ id: postId }).unban.patch()
      if (error) throw wrapEdenError(error, t('admin.unbanPost.failed'))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', profileId, 'posts'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setUnbanTarget(null)
    },
  })

  if (posts.length === 0) {
    const messages: Record<typeof status, string> = {
      banned: t('profiles.noBannedPosts'),
      archived: t('profiles.noArchivedPosts'),
      active: t('profiles.noActivePosts'),
    }
    return <EmptyState message={messages[status]} />
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.postId}
            post={post}
            showFavouriteButton={false}
            isBanned={status === 'banned'}
            onDelete={canBanPost && status !== 'banned' ? () => setBanTarget(post) : undefined}
            onUnban={canBanPost && status === 'banned' ? () => setUnbanTarget(post) : undefined}
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
        open={!!banTarget}
        title={t('admin.banPost.title')}
        description={t('admin.banPost.description', { title: banTarget?.postTitle ?? '' })}
        confirmLabel={t('admin.banPost.submit')}
        destructive
        isPending={banMutation.isPending}
        reasonLabel={t('admin.banPost.reason')}
        reasonRequired
        onConfirm={async (reason) => {
          if (banTarget && reason)
            await banMutation.mutateAsync({ postId: banTarget.postId, banReason: reason })
        }}
        onClose={() => setBanTarget(null)}
      />

      <ConfirmDialog
        open={!!unbanTarget}
        title={t('admin.unbanPost.title')}
        description={t('admin.unbanPost.description')}
        isPending={unbanMutation.isPending}
        onConfirm={async () => {
          if (unbanTarget) await unbanMutation.mutateAsync(unbanTarget.postId)
        }}
        onClose={() => setUnbanTarget(null)}
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
  const canBanPost = hasPermissions(permissions, [Permissions.AdminPostsDeleteAny])

  const { data: postCounts } = useQuery(profilePostsCountQueryOptions(profileId))

  function handleTabChange(value: string) {
    const tabMap: Record<string, 'archived' | 'banned' | undefined> = {
      active: undefined,
      archived: 'archived',
      banned: 'banned',
    }
    navigate({
      search: (prev) => ({ ...prev, tab: tabMap[value], page: undefined }),
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
          <TabsTrigger value="banned">
            {t('profiles.bannedTab')}
            {postCounts ? ` (${postCounts.banned})` : ''}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <Suspense fallback={<PostsGridSkeleton />}>
            <ProfilePostsList
              profileId={profileId}
              userId={userId}
              canBanPost={canBanPost}
              status="active"
              page={page}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="archived">
          <Suspense fallback={<PostsGridSkeleton />}>
            <ProfilePostsList
              profileId={profileId}
              userId={userId}
              canBanPost={canBanPost}
              status="archived"
              page={page}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="banned">
          <Suspense fallback={<PostsGridSkeleton />}>
            <ProfilePostsList
              profileId={profileId}
              userId={userId}
              canBanPost={canBanPost}
              status="banned"
              page={page}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  )
}
