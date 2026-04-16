import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { authClient } from '#/auth'
import { api } from '#/api'
import { profilesQueryOptions } from '#/contexts/ActiveProfileContext'
import { buttonVariants } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ProfileForm,
  ImageInputSection,
  type ProfileFormValues,
} from '../../-components/ProfileForm'
import { imagesQueryOptions } from '#/lib/profileQueries'

export const Route = createFileRoute('/_app/account-settings/$profileId/edit')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) throw redirect({ to: '/login' })
  },
  loader: async ({ context: { queryClient }, params }) => {
    const profiles = await queryClient.ensureQueryData(profilesQueryOptions)
    const isOwner = profiles?.some(p => p.userProfileId === params.profileId)
    if (!isOwner) throw redirect({ to: '/account-settings' })
  },
  pendingComponent: EditSkeleton,
  component: EditProfilePage,
})

function EditSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="mb-6 h-8 w-32" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </main>
  )
}

function EditProfilePage() {
  const { profileId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: profiles } = useSuspenseQuery(profilesQueryOptions)
  const profile = profiles!.find(p => p.userProfileId === profileId)!

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
      queryClient.invalidateQueries({ queryKey: profilesQueryOptions.queryKey })
      navigate({ to: '/account-settings' })
    },
  })

  const addImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const { error } = await api.profiles({ id: profileId }).images.post({ file })
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
      <div className="mb-6 flex items-center gap-3">
        <Link to="/account-settings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Link>
        <h1 className="text-sm font-semibold">Update your profile information</h1>
      </div>
      {patchMutation.isError && (
        <p className="mb-4 text-sm text-destructive">{(patchMutation.error as Error).message}</p>
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
    </main>
  )
}
