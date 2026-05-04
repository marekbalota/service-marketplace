import { createFileRoute } from '@tanstack/react-router'
import { wrapEdenError } from '#/lib/api-error'
import { Suspense, useState } from 'react'
import { useSuspenseQuery, useQueryClient, useMutation } from '@tanstack/react-query'
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
import { hasPermissions, Permissions } from '@marketplace/shared'
import { useCurrentUser } from '#/lib/queries/users'
import { profileQueryOptions, profilePostsQueryOptions } from '#/lib/queries/profiles'

const searchSchema = z.object({
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/admin/users/$userId/profile/$profileId/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context: { queryClient }, params: { profileId }, deps: { page = 1 } }) => {
    void queryClient.prefetchQuery(profileQueryOptions(profileId))
    void queryClient.prefetchQuery(profilePostsQueryOptions(profileId, page))
  },
  component: ProfileDetailPage,
})

type Post = { postId: string; postTitle: string }

function ProfilePostsContent({
  profileId,
  canDeletePost,
}: {
  profileId: string
  userId: string
  canDeletePost: boolean
}) {
  const navigate = Route.useNavigate()
  const { page = 1 } = Route.useSearch()
  const queryClient = useQueryClient()
  const { data: profile } = useSuspenseQuery(profileQueryOptions(profileId))
  const { data: postsData } = useSuspenseQuery(profilePostsQueryOptions(profileId, page))

  const posts = postsData?.items ?? []
  const totalPages = postsData?.totalPages ?? 1

  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }) })

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

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-2">
          <div className="flex items-start gap-4">
            <ProfileAvatar name={profile.name} className="size-16 shrink-0 shadow-md" fallbackClassName="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-lg" />
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

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Posts by {profile.name}</h2>
        <p className="text-muted-foreground text-sm">
          {postsData?.total ?? 0} {postsData?.total === 1 ? 'post' : 'posts'} found
        </p>
      </div>

      {posts.length === 0 ? (
        <EmptyState message="No posts found for this profile." />
      ) : (
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
      )}

      {totalPages > 1 && (
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete post?"
        description={`This will permanently remove "${deleteTarget?.postTitle ?? ''}". This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        reasonLabel="Reason (optional)"
        onConfirm={() => deleteMutation.mutateAsync(deleteTarget!.postId)}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}

function ProfileDetailSkeleton() {
  return (
    <>
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
      <PostsGridSkeleton />
    </>
  )
}

function ProfileDetailPage() {
  const { userId, profileId } = Route.useParams()
  const navigate = Route.useNavigate()
  const { data: user } = useCurrentUser()
  const permissions = user?.role?.permissions ?? []
  const canDeletePost = hasPermissions(permissions, [Permissions.AdminPostsDeleteAny])

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        onClick={() => navigate({ to: '/admin/users/$userId', params: { userId } })}
        label="Back to User"
      />
      <Suspense fallback={<ProfileDetailSkeleton />}>
        <ProfilePostsContent
          profileId={profileId}
          userId={userId}
          canDeletePost={canDeletePost}
        />
      </Suspense>
    </main>
  )
}
