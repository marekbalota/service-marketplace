import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import { User } from 'lucide-react'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { BackButton } from '#/components/BackButton'
import { profileQueryOptions, imagesQueryOptions } from '#/lib/profileQueries'

export const Route = createFileRoute('/_app/profiles/$profileId')({
  loader: async ({ context: { queryClient }, params: { profileId } }) => {
    await queryClient.ensureQueryData(profileQueryOptions(profileId))
  },
  pendingComponent: ProfileViewSkeleton,
  component: ProfileViewPage,
})

function ProfileViewSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="mb-6 h-8 w-24" />
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
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
    </main>
  )
}

export function ProfileViewPage() {
  const { profileId } = Route.useParams()
  const router = useRouter()
  const { data: profile } = useSuspenseQuery(profileQueryOptions(profileId))
  const { data: images = [] } = useQuery(imagesQueryOptions(profileId))

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackButton onClick={() => router.history.back()} />
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--lagoon)] to-[var(--lagoon-deep)] shadow-md">
              <User className="size-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{profile.name}</h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide">Phone</p>
                <p>{profile.phoneNumber ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide">Fax</p>
                <p>{profile.fax ?? <span className="text-muted-foreground">—</span>}</p>
              </div>
            </div>

            {profile.bio && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide">Bio</p>
                <p className="whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}

            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide">Images</p>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <img
                      key={img.imageId}
                      src={img.link}
                      alt={img.name}
                      className="h-24 w-full rounded-lg border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-3 text-xs text-muted-foreground">
              <p>Member since {new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
