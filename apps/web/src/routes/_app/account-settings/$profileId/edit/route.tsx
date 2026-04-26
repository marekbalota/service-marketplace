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

  const patchMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { error } = await api.profiles({ id: profileId }).patch({
        name:        values.name,
        email:       values.email,
        bio:         values.bio || null,
        phoneNumber: values.phoneNumber || null,
        fax:         values.fax || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      queryClient.invalidateQueries({ queryKey: profileQueryOptions(profileId).queryKey })
      navigate({ to: '/account-settings' })
    },
  })

  const addImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const { error } = await api.images.post({ file, profileId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profileId).queryKey })
    },
  })

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await api.images({ id: imageId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profileId).queryKey })
    },
  })

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
          <h1 className="text-lg font-semibold text-nav-browse-fg">Update your profile information</h1>
          {patchMutation.isError && (
            <p className="text-sm text-destructive">{(patchMutation.error as Error).message}</p>
          )}
          {addImageMutation.isError && (
            <p className="text-sm text-destructive">{(addImageMutation.error as Error).message}</p>
          )}
          <ProfileForm
            defaultValues={defaultValues}
            onSubmit={(v) => patchMutation.mutate(v)}
            submitLabel="Save Changes"
            isPending={patchMutation.isPending}
          >
            <ImageInputSection
              previews={images.map(img => img.link)}
              onFilePicked={(file) => addImageMutation.mutate(file)}
              onRemove={(i) => {
                const img = images[i]
                if (img) deleteImageMutation.mutate(img.imageId)
              }}
              isUploading={addImageMutation.isPending}
            />
          </ProfileForm>
        </CardContent>
      </Card>
    </main>
  )
}
