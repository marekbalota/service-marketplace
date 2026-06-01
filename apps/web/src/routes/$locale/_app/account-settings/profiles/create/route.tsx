import { useState, useEffect, useRef } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { BackButton } from '#/components/BackButton'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { profileSchema, type ProfileFormValues } from '../../-components/profileSchema'
import { ProfileFields } from '../../-components/ProfileFields'
import { ImagePickerGrid } from '#/components/ImagePickerGrid'
import { useLocale } from '#/lib/useLocale'

export const Route = createFileRoute('/$locale/_app/account-settings/profiles/create')({
  component: CreateProfilePage,
})

function CreateProfilePage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])
  const [uploadWarning, setUploadWarning] = useState<string | null>(null)
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

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', bio: '', phoneNumber: '', fax: '' },
    mode: 'onTouched',
  })

  const mutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { data, error } = await api.profiles.post({
        name: values.name,
        email: values.email,
        bio: values.bio || undefined,
        phoneNumber: values.phoneNumber || undefined,
        fax: values.fax || undefined,
      })
      if (error) throw wrapEdenError(error, 'Failed to create profile.')

      let failedCount = 0
      if (data && 'userProfileId' in data) {
        for (const { file } of pendingFilesRef.current) {
          const { error: uploadError } = await api.images.post({
            file,
            profileId: data.userProfileId,
          })
          if (uploadError) failedCount++
        }
      }
      return { failedCount }
    },
    onSuccess: ({ failedCount }) => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      for (const { preview } of pendingFilesRef.current) URL.revokeObjectURL(preview)
      setPendingFiles([])
      if (failedCount > 0) {
        setUploadWarning(t('profiles.imageWarningMessage', { count: failedCount }))
      } else {
        navigate({ to: '/$locale/account-settings/profiles', params: { locale } })
      }
    },
  })

  function addFile(file: File) {
    const preview = URL.createObjectURL(file)
    setPendingFiles((prev) => [...prev, { file, preview }])
  }

  function removeFile(index: number) {
    const preview = pendingFiles[index]?.preview
    if (preview) URL.revokeObjectURL(preview)
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit: SubmitHandler<ProfileFormValues> = (values) => mutation.mutate(values)

  if (uploadWarning) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-6">
        <BackButton
          onClick={() => navigate({ to: '/$locale/account-settings/profiles', params: { locale } })}
        />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="rounded-lg border bg-muted p-4 text-sm">
              <p className="font-medium">{t('profiles.imageWarning')}</p>
              <p className="mt-1 text-muted-foreground">{uploadWarning}</p>
            </div>
            <Link
              to="/$locale/account-settings/profiles"
              params={{ locale }}
              className={buttonVariants({ variant: 'default' })}
            >
              {t('profiles.goToManage')}
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        onClick={() => navigate({ to: '/$locale/account-settings/profiles', params: { locale } })}
      />

      <div className="mb-6">
        <h2 className="mb-2">{t('profiles.createTitle')}</h2>
        <p className="text-muted-foreground">{t('profiles.createSubtitle')}</p>
      </div>

      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profiles.basicInfo')}</CardTitle>
            <CardDescription>{t('profiles.contactInfo')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileFields control={form.control} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profiles.images')}</CardTitle>
            <CardDescription>{t('profiles.imagesAddDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ImagePickerGrid
              previews={pendingFiles.map((f) => f.preview)}
              onFilePicked={addFile}
              onRemove={removeFile}
            />
          </CardContent>
        </Card>

        {mutation.isError && (
          <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
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
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mutation.isPending ? t('profiles.creating') : t('profiles.createProfile')}
          </Button>
        </div>
      </form>
    </main>
  )
}
