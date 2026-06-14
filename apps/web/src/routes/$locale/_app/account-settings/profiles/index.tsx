import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageLightbox } from '#/components/ImageLightbox'
import { Plus, Edit, Trash2, CheckCircle2, Eye, Phone, Printer } from 'lucide-react'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { PageHeader } from '#/components/PageHeader'
import { BackButton } from '#/components/BackButton'
import { api } from '#/api'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { imagesQueryOptions } from '#/lib/queries/profiles'
import type { UserProfile } from '#/types/api'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { useLocale } from '#/lib/useLocale'

export const Route = createFileRoute('/$locale/_app/account-settings/profiles/')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(currentUserQueryOptions)
  },
  pendingComponent: ManageProfilesSkeleton,
  component: ManageProfilesPage,
})

function ManageProfilesSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="flex gap-4">
              <Skeleton className="size-14 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

function DeleteProfileButton({ profile }: { profile: UserProfile }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.profiles({ id: profile.userProfileId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
    },
    onError: (err) => {
      const msg = (err as { value?: { message?: string } }).value?.message ?? (err as Error).message
      setErrorMsg(msg)
    },
  })

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        className="w-24 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={mutation.isPending}
        onClick={() => {
          setErrorMsg(null)
          mutation.mutate()
        }}
      >
        <Trash2 className="size-4" />
        {t('common.delete')}
      </Button>
      {errorMsg && <p className="max-w-48 text-right text-xs text-destructive">{errorMsg}</p>}
    </div>
  )
}

function ProfileCard({
  profile,
  isActive,
  isOnly,
}: {
  profile: UserProfile
  isActive: boolean
  isOnly: boolean
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data: images = [] } = useQuery(imagesQueryOptions(profile.userProfileId))
  const visibleImages = images.slice(0, 3)
  const extraCount = images.length - visibleImages.length
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 items-start gap-4">
            <ProfileAvatar
              name={profile.name}
              imageUrl={profile.profileImageUrl ?? undefined}
              className="size-14 shrink-0 shadow-md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                {isActive && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                      'bg-active-bg text-active-fg border-active-border',
                    )}
                  >
                    <CheckCircle2 className="size-3" />
                    {t('profiles.active')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
              {profile.bio && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>
              )}
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {profile.phoneNumber && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    {profile.phoneNumber}
                  </p>
                )}
                {profile.fax && (
                  <p className="flex items-center gap-1.5">
                    <Printer className="size-3.5 shrink-0" />
                    {profile.fax}
                  </p>
                )}
              </div>
              {visibleImages.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  {visibleImages.map((img, i) => (
                    <img
                      key={img.imageId}
                      src={img.link}
                      alt={img.name}
                      className="size-10 cursor-pointer rounded-md border object-cover transition-opacity hover:opacity-80"
                      onClick={() => setLightboxIndex(i)}
                    />
                  ))}
                  {extraCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setLightboxIndex(visibleImages.length)}
                      className="size-10 text-xs"
                    >
                      +{extraCount}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <Link
              to="/$locale/profiles/$profileId"
              params={{ locale, profileId: profile.userProfileId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-24 gap-2')}
            >
              <Eye className="size-4" />
              {t('common.view')}
            </Link>
            <Link
              to="/$locale/account-settings/profiles/$profileId/edit"
              params={{ locale, profileId: profile.userProfileId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-24 gap-2')}
            >
              <Edit className="size-4" />
              {t('common.edit')}
            </Link>
            {!isOnly && <DeleteProfileButton profile={profile} />}
          </div>
        </div>
      </CardContent>

      <ImageLightbox
        images={images.map((img) => ({ src: img.link, alt: img.name }))}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </Card>
  )
}

function ManageProfilesPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const profiles = user?.profiles ?? []

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <BackButton
        label={t('profiles.backToSettings')}
        onClick={() => navigate({ to: '/$locale/account-settings', params: { locale } })}
      />
      <PageHeader
        title={t('profiles.title')}
        description={t('profiles.subtitle')}
        action={
          <Link
            to="/$locale/account-settings/profiles/create"
            params={{ locale }}
            className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}
          >
            <Plus className="size-4" />
            {t('profiles.addProfile')}
          </Link>
        }
      />

      <div className="space-y-4">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.userProfileId}
            profile={profile}
            isActive={profile.userProfileId === activeProfile?.userProfileId}
            isOnly={profiles.length === 1}
          />
        ))}
      </div>
    </main>
  )
}
