import { useState, useEffect, useRef } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { BackButton } from '#/components/BackButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { profileSchema, type ProfileFormValues } from '../../../-components/profileSchema'
import { ProfileFields } from '../../../-components/ProfileFields'
import { ImagePickerGrid } from '#/components/ImagePickerGrid'
import { AddLocationDialog } from './-components/AddLocationDialog'
import { type LocationSuggestion } from '#/components/LocationAutocomplete'
import { formatLocation, formatLocationDetail } from '#/lib/format'
import { useLocale } from '#/lib/useLocale'
import {
  imagesQueryOptions,
  profileQueryOptions,
  profileLocationsQueryOptions,
} from '#/lib/queries/profiles'

export const Route = createFileRoute('/$locale/_app/account-settings/profiles/$profileId/edit')({
  loader: async ({ context: { queryClient }, params }) => {
    const user = await queryClient.ensureQueryData(currentUserQueryOptions)
    const isOwner = user?.profiles.some((p) => p.userProfileId === params.profileId)
    if (!isOwner) throw redirect({ to: '/$locale/account-settings/profiles', params })
  },
  pendingComponent: EditSkeleton,
  component: EditProfilePage,
})

function EditSkeleton() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <Skeleton className="mb-4 h-9 w-36" />
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-6 h-5 w-96" />
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function EditProfilePage() {
  const { t } = useTranslation()
  const { profileId } = Route.useParams()
  const locale = useLocale()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user } = useCurrentUser()
  const profile = user?.profiles.find((p) => p.userProfileId === profileId)

  const { data: images = [] } = useQuery(imagesQueryOptions(profileId))
  const { data: locations = [] } = useQuery(profileLocationsQueryOptions(profileId))

  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([])

  const pendingFilesRef = useRef(pendingFiles)
  useEffect(() => {
    pendingFilesRef.current = pendingFiles
  }, [pendingFiles])
  useEffect(
    () => () => {
      for (const { preview } of pendingFilesRef.current) URL.revokeObjectURL(preview)
    },
    [],
  )

  const [showAddLocation, setShowAddLocation] = useState(false)
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name ?? '',
      email: profile?.email ?? '',
      bio: profile?.bio ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
      fax: profile?.fax ?? '',
    },
    mode: 'onTouched',
  })

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { error } = await api.profiles({ id: profileId }).patch({
        name: values.name,
        email: values.email,
        bio: values.bio || null,
        phoneNumber: values.phoneNumber || null,
        fax: values.fax || null,
      })
      if (error) throw wrapEdenError(error, 'Failed to update profile.')

      await Promise.all(
        pendingFiles.map(({ file }) =>
          api.images.post({ file, profileId }).then(({ error }) => {
            if (error) throw wrapEdenError(error, 'Failed to upload image.')
          }),
        ),
      )

      await Promise.all(
        pendingDeletes.map((imageId) =>
          api
            .images({ id: imageId })
            .delete()
            .then(({ error }) => {
              if (error) throw wrapEdenError(error, 'Failed to delete image.')
            }),
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      queryClient.invalidateQueries({ queryKey: profileQueryOptions(profileId).queryKey })
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profileId).queryKey })
      navigate({ to: '/$locale/account-settings/profiles', params: { locale } })
    },
  })

  const addLocationMutation = useMutation({
    mutationFn: async (suggestion: LocationSuggestion) => {
      const { error } = await api.profiles({ id: profileId }).locations.post({
        externalId: suggestion.id,
      })
      if (error) throw wrapEdenError(error, 'Failed to add location.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: profileLocationsQueryOptions(profileId).queryKey,
      })
      setShowAddLocation(false)
    },
  })

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await api.profiles({ id: profileId }).locations({ locationId }).delete()
      if (error) throw wrapEdenError(error, 'Failed to remove location.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: profileLocationsQueryOptions(profileId).queryKey,
      })
      setDeleteLocationId(null)
    },
  })

  if (!profile) return null

  const visibleImages = images.filter((img) => !pendingDeletes.includes(img.imageId))
  const previews = [...visibleImages.map((img) => img.link), ...pendingFiles.map((f) => f.preview)]

  function addFile(file: File) {
    const preview = URL.createObjectURL(file)
    setPendingFiles((prev) => [...prev, { file, preview }])
  }

  function removeImage(index: number) {
    if (index < visibleImages.length) {
      setPendingDeletes((prev) => [...prev, visibleImages[index]!.imageId])
    } else {
      const pendingIndex = index - visibleImages.length
      const preview = pendingFiles[pendingIndex]?.preview
      if (preview) URL.revokeObjectURL(preview)
      setPendingFiles((prev) => prev.filter((_, i) => i !== pendingIndex))
    }
  }

  const onSubmit: SubmitHandler<ProfileFormValues> = (values) => saveMutation.mutate(values)

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        label={t('profiles.backToProfiles')}
        onClick={() => navigate({ to: '/$locale/account-settings/profiles', params: { locale } })}
      />

      <div className="mb-6">
        <h2 className="mb-2">{t('profiles.editTitle')}</h2>
        <p className="text-muted-foreground">{t('profiles.editSubtitle')}</p>
      </div>

      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profiles.basicInfo')}</CardTitle>
            <CardDescription>{t('profiles.basicInfoSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileFields control={form.control} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profiles.images')}</CardTitle>
            <CardDescription>{t('profiles.imagesSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImagePickerGrid previews={previews} onFilePicked={addFile} onRemove={removeImage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{t('profiles.savedLocations')}</CardTitle>
                <CardDescription>{t('profiles.savedLocationsSubtitle')}</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => setShowAddLocation(true)}
              >
                <Plus className="size-4" />
                {t('profiles.addLocation')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddLocationDialog
              open={showAddLocation}
              onClose={() => setShowAddLocation(false)}
              onSave={(suggestion) => addLocationMutation.mutate(suggestion)}
              isPending={addLocationMutation.isPending}
              error={
                addLocationMutation.isError
                  ? (addLocationMutation.error as Error).message
                  : undefined
              }
            />

            {locations.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {t('profiles.noLocations')}
              </p>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div
                    key={loc.locationId}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card transition-colors"
                  >
                    <div>
                      <p className="font-medium">{formatLocation(loc)}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatLocationDetail(loc, t)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setDeleteLocationId(loc.locationId)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {saveMutation.isError && (
          <p className="text-sm text-destructive">{(saveMutation.error as Error).message}</p>
        )}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({ to: '/$locale/account-settings/profiles', params: { locale } })
            }
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={deleteLocationId !== null}
        title={t('profiles.removeLocation')}
        description={t('profiles.removeLocationConfirm')}
        confirmLabel={t('common.remove')}
        destructive
        isPending={deleteLocationMutation.isPending}
        onConfirm={() => {
          if (deleteLocationId) deleteLocationMutation.mutate(deleteLocationId)
        }}
        onClose={() => setDeleteLocationId(null)}
      />
    </main>
  )
}
