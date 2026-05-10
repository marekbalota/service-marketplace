import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Suspense } from 'react'
import { Star, Mail, Phone, Printer, MapPin } from 'lucide-react'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { PostCard } from '#/components/PostCard'
import { EmptyState } from '#/components/EmptyState'
import { PostsGridSkeleton } from '#/components/PostsGridSkeleton'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '#/components/ui/tabs'
import { BackButton } from '#/components/BackButton'
import { ImageLightbox } from '#/components/ImageLightbox'
import { PaginationBar } from '#/components/PaginationBar'
import {
  profileQueryOptions,
  imagesQueryOptions,
  profileLocationsQueryOptions,
  profilePostsQueryOptions,
  profilePostsCountQueryOptions,
} from '#/lib/queries/profiles'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { formatLocationDisplayName, formatLocationDetail } from '#/lib/locationFormat'

const searchSchema = z.object({
  tab: z.enum(['active', 'archived']).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/_app/profiles/$profileId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { tab, page } }) => ({ tab, page }),
  loader: async ({
    context: { queryClient },
    params: { profileId },
    deps: { page: _page, tab: _tab },
  }) => {
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-16" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PostsGridSkeleton count={6} columns={2} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function ProfilePostsGrid({
  profileId,
  page,
  archived,
  isOwner,
}: {
  profileId: string
  page: number
  archived: boolean
  isOwner: boolean
}) {
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(profilePostsQueryOptions(profileId, page, archived, 6))
  const posts = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  const setPage = (p: number) =>
    navigate({ search: (prev) => ({ ...prev, page: p === 1 ? undefined : p }), replace: true })

  if (posts.length === 0) {
    return <EmptyState message={`No ${archived ? 'archived' : 'active'} posts.`} />
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {posts.map((post) => (
          <PostCard key={post.postId} post={post} showFavouriteButton={!isOwner} />
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-4"
        />
      )}
    </>
  )
}

function ProfileViewPage() {
  const { profileId } = Route.useParams()
  const router = useRouter()
  const { tab, page = 1 } = Route.useSearch()
  const activeTab = tab ?? 'active'
  const navigate = Route.useNavigate()

  const { data: profile } = useSuspenseQuery(profileQueryOptions(profileId))
  const { data: images = [] } = useQuery(imagesQueryOptions(profileId))
  const { data: locations = [] } = useQuery(profileLocationsQueryOptions(profileId))
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const isOwner = activeProfile?.userProfileId === profileId
  const isAuthenticated = user != null

  const { data: postCounts } = useQuery({
    ...profilePostsCountQueryOptions(profileId),
    enabled: isAuthenticated,
  })

  function handleTabChange(value: string) {
    navigate({
      search: () => ({ tab: value === 'archived' ? 'archived' : undefined }),
      replace: true,
    })
  }

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
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Bio
                    </p>
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
                      <span className="font-medium">{profile.averageRating.toFixed(1)} / 5.0</span>
                    </div>
                  </>
                )}
              </div>

              {locations.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <CardTitle className="text-sm">Locations</CardTitle>
                    {locations.map((loc) => {
                      const detail = formatLocationDetail(loc)
                      return (
                        <div key={loc.locationId} className="flex items-start gap-2 text-sm">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{formatLocationDisplayName(loc)}</p>
                            {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {images.length > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <img
                        key={img.imageId}
                        src={img.link}
                        alt={img.name}
                        className="h-20 w-full cursor-pointer rounded-lg border object-cover transition-opacity hover:opacity-90"
                        onClick={() => setLightboxIndex(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Posts column */}
        <Card className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">Posts</h2>
                {isAuthenticated && (
                  <TabsList>
                    <TabsTrigger value="active">
                      Active{postCounts ? ` (${postCounts.active})` : ''}
                    </TabsTrigger>
                    <TabsTrigger value="archived">
                      Archived{postCounts ? ` (${postCounts.archived})` : ''}
                    </TabsTrigger>
                  </TabsList>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <p className="text-muted-foreground">Sign in to view this user's posts.</p>
              ) : (
                <>
                  <TabsContent value="active">
                    <Suspense fallback={<PostsGridSkeleton count={6} columns={2} />}>
                      <ProfilePostsGrid
                        profileId={profileId}
                        page={page}
                        archived={false}
                        isOwner={isOwner}
                      />
                    </Suspense>
                  </TabsContent>
                  <TabsContent value="archived">
                    <Suspense fallback={<PostsGridSkeleton count={6} columns={2} />}>
                      <ProfilePostsGrid
                        profileId={profileId}
                        page={page}
                        archived={true}
                        isOwner={isOwner}
                      />
                    </Suspense>
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <ImageLightbox
        images={images.map((img) => ({ src: img.link, alt: img.name }))}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </main>
  )
}
