import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { buttonVariants } from '#/components/ui/button'
import { BackButton } from '#/components/BackButton'
import { Card, CardContent } from '#/components/ui/card'
import {
  ProfileForm,
  ImageInputSection,
  type ProfileFormValues,
} from '../-components/ProfileForm'

export const Route = createFileRoute('/_app/account-settings/create')({
  component: CreateProfilePage,
})

function CreateProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])
  const [uploadWarning, setUploadWarning] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { data, error } = await api.profiles.post({
        name:        values.name,
        email:       values.email,
        bio:         values.bio || undefined,
        phoneNumber: values.phoneNumber || undefined,
        fax:         values.fax || undefined,
      })
      if (error) throw error

      let failedCount = 0
      if (data && 'userProfileId' in data) {
        for (const { file } of pendingFiles) {
          const { error: uploadError } = await api.images.post({ file, profileId: data.userProfileId })
          if (uploadError) failedCount++
        }
      }
      return { failedCount }
    },
    onSuccess: ({ failedCount }) => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      cleanup()
      if (failedCount > 0) {
        setUploadWarning(
          `Profile created! However, ${failedCount} image${failedCount > 1 ? 's' : ''} failed to upload. ` +
          `Images are optional — you can add them later by editing the profile.`,
        )
      } else {
        navigate({ to: '/account-settings' })
      }
    },
  })

  function cleanup() {
    for (const { preview } of pendingFiles) URL.revokeObjectURL(preview)
    setPendingFiles([])
  }

  function addFile(file: File) {
    setPendingFiles(prev => [...prev, { file, preview: URL.createObjectURL(file) }])
  }

  function removeFile(index: number) {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[index]!.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const defaultValues: ProfileFormValues = { name: '', email: '', bio: '', phoneNumber: '', fax: '' }

  if (uploadWarning) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BackButton onClick={() => navigate({ to: '/account-settings' })} />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300">
              <p className="font-medium">Profile created with a warning</p>
              <p className="mt-1">{uploadWarning}</p>
            </div>
            <Link to="/account-settings" className={buttonVariants({ variant: 'default' })}>
              Go to Account Settings
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackButton onClick={() => navigate({ to: '/account-settings' })} />
      <Card>
        <CardContent className="p-6 space-y-4">
          <h1 className="text-lg font-semibold text-nav-browse-fg">Add a new profile to your account</h1>
          {mutation.isError && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <ProfileForm
            defaultValues={defaultValues}
            onSubmit={(v) => mutation.mutate(v)}
            submitLabel="Create Profile"
            isPending={mutation.isPending}
          >
            <ImageInputSection
              previews={pendingFiles.map(f => f.preview)}
              onFilePicked={addFile}
              onRemove={removeFile}
            />
          </ProfileForm>
        </CardContent>
      </Card>
    </main>
  )
}
