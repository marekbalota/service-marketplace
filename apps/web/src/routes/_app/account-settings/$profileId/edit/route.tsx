import { useState, useEffect, useRef } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, Plus, MapPin, Loader2 } from 'lucide-react'
import { api } from '#/api'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { BackButton } from '#/components/BackButton'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '#/components/ui/dialog'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import {
  ProfileForm,
  ImageInputSection,
  type ProfileFormValues,
} from '../../-components/ProfileForm'
import { imagesQueryOptions, profileQueryOptions, profileLocationsQueryOptions } from '#/lib/queries/profiles'

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
      if (error) throw error

      await Promise.all(pendingFiles.map(({ file }) =>
        api.images.post({ file, profileId }).then(({ error }) => { if (error) throw error })
      ))

      await Promise.all(pendingDeletes.map(imageId =>
        api.images({ id: imageId }).delete().then(({ error }) => { if (error) throw error })
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
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <BackButton onClick={() => navigate({ to: '/account-settings' })} />
      <Card>
        <CardContent className="p-6 space-y-4">
          <h1 className="text-lg font-semibold text-nav-browse-fg">Update your profile information</h1>
          {saveMutation.isError && (
            <p className="text-sm text-destructive">{(saveMutation.error as Error).message}</p>
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
      <SavedLocationsSection profileId={profileId} />
    </main>
  )
}

const addLocationSchema = z.object({
  country:     z.string().optional(),
  region:      z.string().optional(),
  city:        z.string().optional(),
  street:      z.string().optional(),
  houseNumber: z.string().optional(),
})
type AddLocationValues = z.infer<typeof addLocationSchema>

function SavedLocationsSection({ profileId }: { profileId: string }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: locations = [] } = useQuery(profileLocationsQueryOptions(profileId))

  const addMutation = useMutation({
    mutationFn: async (body: AddLocationValues) => {
      const { error } = await api.profiles({ id: profileId }).locations.post(body)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileLocationsQueryOptions(profileId).queryKey })
      setDialogOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await api.profiles({ id: profileId }).locations({ locationId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileLocationsQueryOptions(profileId).queryKey })
      setDeleteId(null)
    },
  })

  const { control, handleSubmit, reset, formState: { errors } } = useForm<AddLocationValues>({
    resolver: zodResolver(addLocationSchema),
    defaultValues: { country: '', region: '', city: '', street: '', houseNumber: '' },
  })

  const onAdd: SubmitHandler<AddLocationValues> = (values) => {
    const clean = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v || undefined])
    ) as AddLocationValues
    addMutation.mutate(clean)
  }

  function formatLocation(loc: { country: string | null; region: string | null; city: string | null; street: string | null; houseNumber: string | null }) {
    return [loc.city, loc.region, loc.country].filter(Boolean).join(', ') || 'Unknown location'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Saved Locations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved locations yet.</p>
        ) : (
          <ul className="space-y-2">
            {locations.map((loc) => (
              <li key={loc.locationId} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{formatLocation(loc)}</p>
                    {loc.street && (
                      <p className="truncate text-xs text-muted-foreground">
                        {[loc.street, loc.houseNumber].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteId(loc.locationId)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Button variant="outline" size="sm" className="gap-2" onClick={() => { reset(); setDialogOpen(true) }}>
          <Plus className="size-4" />
          Add Location
        </Button>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) setDialogOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAdd)} className="space-y-3">
            {(['country', 'region', 'city', 'street', 'houseNumber'] as const).map((fieldName) => (
              <Field key={fieldName} data-invalid={!!errors[fieldName]}>
                <FieldLabel>{fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}</FieldLabel>
                <Controller
                  name={fieldName}
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        placeholder={`Enter ${fieldName.toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2')}`}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </>
                  )}
                />
              </Field>
            ))}
            {addMutation.isError && (
              <p className="text-sm text-destructive">{(addMutation.error as Error).message}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        title="Remove Location"
        description="Are you sure you want to remove this location from your profile?"
        confirmLabel="Remove"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId) }}
        onClose={() => setDeleteId(null)}
      />
    </Card>
  )
}
