import { useState, useEffect, useRef } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { BackButton } from '#/components/BackButton'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ProfileForm,
  ImageInputSection,
  type ProfileFormValues,
} from '../../-components/ProfileForm'
import { imagesQueryOptions, profileQueryOptions } from '#/lib/queries/profiles'

export const Route = createFileRoute('/_app/account-settings/$profileId/edit')({
  loader: async ({ context: { queryClient }, params }) => {
    const user = await queryClient.ensureQueryData(currentUserQueryOptions)
    const isOwner = user?.profiles.some(p => p.userProfileId === params.profileId)
    if (!isOwner) throw redirect({ to: '/account-settings' })
  },
  pendingComponent: EditSkeleton,
  component: EditProfilePage,
})

function EditSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="mb-6 h-8 w-32" />
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-56" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function EditProfilePage() {
  const { profileId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user } = useCurrentUser()
  const profile = user?.profiles.find(p => p.userProfileId === profileId)!

  const { data: images = [] } = useQuery(imagesQueryOptions(profileId))

  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([])

  const pendingFilesRef = useRef(pendingFiles)
  useEffect(() => { pendingFilesRef.current = pendingFiles }, [pendingFiles])
  useEffect(() => () => {
    for (const { preview } of pendingFilesRef.current) URL.revokeObjectURL(preview)
  }, [])

  const saveMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { error } = await api.profiles({ id: profileId }).patch({
        name:        values.name,
        email:       values.email,
        bio:         values.bio || null,
        phoneNumber: values.phoneNumber || null,
        fax:         values.fax || null,
      })
      if (error) throw wrapEdenError(error, 'Failed to save profile.')

      await Promise.all(pendingFiles.map(({ file }) =>
        api.images.post({ file, profileId }).then(({ error }) => { if (error) throw wrapEdenError(error, 'Failed to upload image.') })
      ))

      await Promise.all(pendingDeletes.map(imageId =>
        api.images({ id: imageId }).delete().then(({ error }) => { if (error) throw wrapEdenError(error, 'Failed to delete image.') })
      ))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      queryClient.invalidateQueries({ queryKey: profileQueryOptions(profileId).queryKey })
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profileId).queryKey })
      navigate({ to: '/account-settings' })
    },
  })

  const visibleImages = images.filter(img => !pendingDeletes.includes(img.imageId))
  const previews = [
    ...visibleImages.map(img => img.link),
    ...pendingFiles.map(f => f.preview),
  ]

  function addFile(file: File) {
    const preview = URL.createObjectURL(file)
    setPendingFiles(prev => [...prev, { file, preview }])
  }

  function removeAt(index: number) {
    if (index < visibleImages.length) {
      setPendingDeletes(prev => [...prev, visibleImages[index]!.imageId])
    } else {
      const pendingIndex = index - visibleImages.length
      const preview = pendingFiles[pendingIndex]?.preview
      if (preview) URL.revokeObjectURL(preview)
      setPendingFiles(prev => prev.filter((_, i) => i !== pendingIndex))
    }
  }

  const defaultValues: ProfileFormValues = {
    name:        profile.name,
    email:       profile.email,
    bio:         profile.bio ?? '',
    phoneNumber: profile.phoneNumber ?? '',
    fax:         profile.fax ?? '',
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackButton onClick={() => navigate({ to: '/account-settings' })} />
      <Card>
        <CardContent className="p-6 space-y-4">
          <h1 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Update your profile information</h1>
          {saveMutation.isError && (
            <p className="text-sm text-destructive">{saveMutation.error?.message}</p>
          )}
          <ProfileForm
            defaultValues={defaultValues}
            onSubmit={(v) => saveMutation.mutate(v)}
            submitLabel="Save Changes"
            isPending={saveMutation.isPending}
          >
            <ImageInputSection
              previews={previews}
              onFilePicked={addFile}
              onRemove={removeAt}
            />
          </ProfileForm>
        </CardContent>
      </Card>
    </main>
  )
}
