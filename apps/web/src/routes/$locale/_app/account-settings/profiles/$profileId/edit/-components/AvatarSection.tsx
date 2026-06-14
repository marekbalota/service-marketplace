import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { ImageLightbox } from '#/components/ImageLightbox'
import { CropAvatarDialog } from './CropAvatarDialog'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { profileQueryOptions } from '#/lib/queries/profiles'

export function AvatarSection({
  profileId,
  name,
  imageUrl,
}: {
  profileId: string
  name: string
  imageUrl: string | null | undefined
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
    queryClient.invalidateQueries({ queryKey: profileQueryOptions(profileId).queryKey })
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { error } = await api.profiles({ id: profileId }).avatar.put({ file })
      if (error) throw wrapEdenError(error, 'Failed to upload avatar.')
    },
    onSuccess: invalidate,
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.profiles({ id: profileId }).avatar.delete()
      if (error) throw wrapEdenError(error, 'Failed to remove avatar.')
    },
    onSuccess: invalidate,
  })

  const isPending = uploadMutation.isPending || removeMutation.isPending

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setCropSrc(URL.createObjectURL(file))
      e.target.value = ''
    }
  }

  function handleCropConfirm(file: File) {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    uploadMutation.mutate(file)
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profiles.avatar')}</CardTitle>
        <CardDescription>{t('profiles.avatarSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="relative">
          <button
            type="button"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-default"
            disabled={!imageUrl || isPending}
            onClick={() => {
              if (imageUrl) setLightboxOpen(true)
            }}
            aria-label={imageUrl ? t('profiles.viewAvatar') : undefined}
          >
            <ProfileAvatar name={name} imageUrl={imageUrl ?? undefined} className="size-28" />
          </button>

          <button
            type="button"
            className="absolute bottom-0.5 right-0.5 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('profiles.changeAvatar')}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
          </button>
        </div>

        {imageUrl && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isPending}
              onClick={() => removeMutation.mutate()}
            >
              <Trash2 className="size-4" />
              {t('profiles.removeAvatar')}
            </Button>

            <ImageLightbox
              images={[{ src: imageUrl, alt: name }]}
              initialIndex={0}
              open={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
            />
          </>
        )}

        {(uploadMutation.isError || removeMutation.isError) && (
          <p className="text-sm text-destructive">
            {((uploadMutation.error ?? removeMutation.error) as Error).message}
          </p>
        )}
      </CardContent>

      {cropSrc && (
        <CropAvatarDialog
          imageSrc={cropSrc}
          open={true}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </Card>
  )
}
