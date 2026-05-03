import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { BackButton } from '#/components/BackButton'
import { profileQueryOptions, imagesQueryOptions, profileLocationsQueryOptions } from '#/lib/queries/profiles'

export const Route = createFileRoute('/_app/profiles/$profileId')({
  loader: async ({ context: { queryClient }, params: { profileId } }) => {
    await queryClient.ensureQueryData(profileQueryOptions(profileId))
  },
  pendingComponent: ProfileViewSkeleton,
  component: ProfileViewPage,
})

function ProfileViewSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <Skeleton className="mb-4 h-9 w-24" />
      <Skeleton className="mb-1 h-8 w-48" />
      <Skeleton className="mb-6 h-5 w-40" />
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function ProfileViewPage() {
  const { profileId } = Route.useParams()
  const router = useRouter()
  const { data: profile } = useSuspenseQuery(profileQueryOptions(profileId))
  const { data: images = [] } = useQuery(imagesQueryOptions(profileId))
  const { data: locations = [] } = useQuery(profileLocationsQueryOptions(profileId))

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton onClick={() => router.history.back()} />

      <div className="mb-6">
        <h2 className="mb-1">{profile.name}</h2>
        <p className="text-muted-foreground text-sm">
          Member since {new Date(profile.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Contact and personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p>{profile.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Phone
                </p>
                <p>{profile.phoneNumber ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
            </div>

            {profile.fax && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Fax
                  </p>
                  <p>{profile.fax}</p>
                </div>
              </div>
            )}

            {profile.bio && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Bio
                </p>
                <p className="whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        {images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map(img => (
                  <img
                    key={img.imageId}
                    src={img.link}
                    alt={img.name}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved Locations */}
        {locations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Locations</CardTitle>
              <CardDescription>Locations this profile frequently works in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {locations.map(loc => {
                  const displayName = [loc.street, loc.houseNumber, loc.city, loc.region, loc.country]
                    .filter(Boolean).join(', ') || 'Unknown location'
                  const detail = [
                    loc.country && `Country: ${loc.country}`,
                    loc.region  && `• Region: ${loc.region}`,
                    loc.city    && `• City: ${loc.city}`,
                  ].filter(Boolean).join(' ')

                  return (
                    <div
                      key={loc.locationId}
                      className="flex items-center p-4 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-medium text-sm">{displayName}</p>
                        {detail && (
                          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
