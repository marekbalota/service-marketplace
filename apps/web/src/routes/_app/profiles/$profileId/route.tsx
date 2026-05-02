import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import { Star, Mail, Phone, Printer } from 'lucide-react'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { PostCard } from '#/components/PostCard'
import { EmptyState } from '#/components/EmptyState'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { BackButton } from '#/components/BackButton'
import { profileQueryOptions, imagesQueryOptions, profilePostsQueryOptions } from '#/lib/queries/profiles'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { useState } from 'react'

export const Route = createFileRoute('/_app/profiles/$profileId')({
  loader: async ({ context: { queryClient }, params: { profileId } }) => {
    await queryClient.ensureQueryData(profileQueryOptions(profileId))
  },
  pendingComponent: ProfileViewSkeleton,
  component: ProfileViewPage,
})

function ProfileViewSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="mb-6 h-8 w-24" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="mx-auto size-24 rounded-full" />
              <div className="space-y-2 text-center">
                <Skeleton className="mx-auto h-6 w-40" />
                <Skeleton className="mx-auto h-4 w-28" />
              </div>
              <Separator />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

const PAGE_SIZE = 12

function ProfileViewPage() {
  const { profileId } = Route.useParams()
  const router = useRouter()
  const { data: profile } = useSuspenseQuery(profileQueryOptions(profileId))
  const { data: images = [] } = useQuery(imagesQueryOptions(profileId))
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()

  const isOwner = activeProfile?.userProfileId === profileId
  const isAuthenticated = user != null

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [page, setPage] = useState(1)

  const { data: postsData, isLoading: postsLoading } = useQuery({
    ...profilePostsQueryOptions(profileId, page, activeTab === 'archived'),
    enabled: isAuthenticated,
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <BackButton onClick={() => router.history.back()} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-center">
                <ProfileAvatar name={profile.name} className="size-24" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-semibold">{profile.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                {profile.bio && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bio</p>
                    <p className="whitespace-pre-wrap">{profile.bio}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
                {profile.phoneNumber && (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>{profile.phoneNumber}</span>
                  </div>
                )}
                {profile.fax && (
                  <div className="flex items-start gap-2">
                    <Printer className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>{profile.fax}</span>
                  </div>
                )}
                {profile.averageRating !== null && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Star className="size-4 fill-star-filled text-star-filled shrink-0" />
                      <span className="font-medium">
                        {profile.averageRating.toFixed(1)} / 5.0
                      </span>
                    </div>
                  </>
                )}
              </div>

              {images.length > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img) => (
                      <img
                        key={img.imageId}
                        src={img.link}
                        alt={img.name}
                        className="h-20 w-full rounded-lg border object-cover"
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main column — posts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Posts</h2>
            {isOwner && (
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as 'active' | 'archived')
                  setPage(1)
                }}
              >
                <TabsList>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {!isAuthenticated ? (
            <p className="text-muted-foreground">Sign in to view this user's posts.</p>
          ) : postsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : postsData?.items.length === 0 ? (
            <EmptyState message={`No ${activeTab} posts.`} />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {postsData?.items.map((post) => (
                  <PostCard key={post.postId} post={post} showFavouriteButton={!isOwner} />
                ))}
              </div>
              {(postsData?.totalPages ?? 1) > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page} / {postsData?.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === postsData?.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
