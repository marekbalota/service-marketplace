import { useState } from 'react'
import { createFileRoute, redirect, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { authClient } from '#/auth'
import { api } from '#/api'
import { profilesQueryOptions } from '#/contexts/ActiveProfileContext'
import { buttonVariants } from '#/components/ui/button'
import {
  ProfileForm,
  ImageInputSection,
  type ProfileFormValues,
} from '../-components/ProfileForm'

export const Route = createFileRoute('/_app/account-settings/create')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) throw redirect({ to: '/login' })
  },
  component: CreateProfilePage,
})

function CreateProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])

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
      if (data && 'userProfileId' in data) {
        for (const { file } of pendingFiles) {
          await api.profiles({ id: data.userProfileId }).images.post({ file })
        }
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profilesQueryOptions.queryKey })
      cleanup()
      navigate({ to: '/account-settings' })
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/account-settings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create Profile</h1>
          <p className="text-sm text-muted-foreground">Add a new user profile to your account</p>
        </div>
      </div>
      {mutation.isError && (
        <p className="mb-4 text-sm text-destructive">{(mutation.error as Error).message}</p>
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
    </main>
  )
}
