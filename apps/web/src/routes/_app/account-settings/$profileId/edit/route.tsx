import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, Plus, X, Loader2 } from 'lucide-react'
import { api } from '#/api'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { BackButton } from '#/components/BackButton'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { Field, FieldGroup, FieldLabel, FieldError } from '#/components/ui/field'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { profileSchema, type ProfileFormValues } from '../../-components/ProfileForm'
import {
  imagesQueryOptions,
  profileQueryOptions,
  profileLocationsQueryOptions,
} from '#/lib/queries/profiles'

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
  const { profileId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: user } = useCurrentUser()
  const profile = user?.profiles.find(p => p.userProfileId === profileId)!

  const { data: images = [] } = useQuery(imagesQueryOptions(profileId))
  const { data: locations = [] } = useQuery(profileLocationsQueryOptions(profileId))

  // Image state
  const [pendingUrls, setPendingUrls] = useState<string[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')

  // Location state
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [deleteLocationId, setDeleteLocationId] = useState<string | null>(null)
  const [newLocation, setNewLocation] = useState({
    country: '', region: '', city: '', street: '', houseNumber: '',
  })

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:        profile.name,
      email:       profile.email,
      bio:         profile.bio ?? '',
      phoneNumber: profile.phoneNumber ?? '',
      fax:         profile.fax ?? '',
    },
    mode: 'onTouched',
  })

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

      await Promise.all(
        pendingUrls.map(url =>
          api.images.url.post({ url, profileId }).then(({ error }) => { if (error) throw error })
        ),
      )

      await Promise.all(
        pendingDeletes.map(imageId =>
          api.images({ id: imageId }).delete().then(({ error }) => { if (error) throw error })
        ),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
      queryClient.invalidateQueries({ queryKey: profileQueryOptions(profileId).queryKey })
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profileId).queryKey })
      navigate({ to: '/account-settings' })
    },
  })

  const addLocationMutation = useMutation({
    mutationFn: async (body: typeof newLocation) => {
      const clean = Object.fromEntries(
        Object.entries(body).map(([k, v]) => [k, v || undefined])
      ) as typeof body
      const { error } = await api.profiles({ id: profileId }).locations.post(clean)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: profileLocationsQueryOptions(profileId).queryKey,
      })
      setShowAddLocation(false)
      setNewLocation({ country: '', region: '', city: '', street: '', houseNumber: '' })
    },
  })

  const deleteLocationMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await api.profiles({ id: profileId })
        .locations({ locationId })
        .delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: profileLocationsQueryOptions(profileId).queryKey,
      })
      setDeleteLocationId(null)
    },
  })

  const visibleImages = images.filter(img => !pendingDeletes.includes(img.imageId))
  const displayedUrls = [
    ...visibleImages.map(img => img.link),
    ...pendingUrls,
  ]

  function addImageUrl() {
    const trimmed = newImageUrl.trim()
    if (trimmed) {
      setPendingUrls(prev => [...prev, trimmed])
      setNewImageUrl('')
    }
  }

  function removeImage(index: number) {
    if (index < visibleImages.length) {
      setPendingDeletes(prev => [...prev, visibleImages[index]!.imageId])
    } else {
      setPendingUrls(prev => prev.filter((_, i) => i !== index - visibleImages.length))
    }
  }

  function formatDisplayName(loc: {
    country: string | null; region: string | null; city: string | null
    street: string | null; houseNumber: string | null
  }) {
    return [loc.street, loc.houseNumber, loc.city, loc.region, loc.country]
      .filter(Boolean).join(', ') || 'Unknown location'
  }

  function formatLocationDetail(loc: {
    country: string | null; region: string | null; city: string | null
  }) {
    return [
      loc.country && `Country: ${loc.country}`,
      loc.region  && `• Region: ${loc.region}`,
      loc.city    && `• City: ${loc.city}`,
    ].filter(Boolean).join(' ')
  }

  const onSubmit: SubmitHandler<ProfileFormValues> = (values) => saveMutation.mutate(values)

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <BackButton
        label="Back to Profiles"
        onClick={() => navigate({ to: '/account-settings' })}
      />

      <div className="mb-6">
        <h2 className="mb-2">Edit Profile</h2>
        <p className="text-muted-foreground">
          Update your profile information and manage your saved locations
        </p>
      </div>

      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your profile details visible to others</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Name *</FieldLabel>
                      <Input
                        placeholder="e.g., John Smith"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Email *</FieldLabel>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  control={form.control}
                  name="phoneNumber"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Phone Number</FieldLabel>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="fax"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Fax</FieldLabel>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4568"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
              <Controller
                control={form.control}
                name="bio"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Bio</FieldLabel>
                    <Textarea
                      placeholder="Tell others about yourself or your business..."
                      rows={3}
                      className="resize-none"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Photos of your work, profile pictures, etc.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter image URL"
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addImageUrl() }
                }}
              />
              <Button type="button" variant="outline" onClick={addImageUrl}>
                <Plus className="size-4" />
              </Button>
            </div>
            {displayedUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {displayedUrls.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative group">
                    <img
                      src={url}
                      alt={`Profile image ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 size-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Locations */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Saved Locations</CardTitle>
                <CardDescription>
                  Manage locations you frequently use for posts
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => setShowAddLocation(v => !v)}
              >
                <Plus className="size-4" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddLocation && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Country *</label>
                      <Input
                        placeholder="e.g., USA, Slovakia"
                        value={newLocation.country}
                        onChange={e => setNewLocation(v => ({ ...v, country: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Region</label>
                      <Input
                        placeholder="e.g., Texas, Bratislava Region"
                        value={newLocation.region}
                        onChange={e => setNewLocation(v => ({ ...v, region: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">City</label>
                      <Input
                        placeholder="e.g., Austin, Bratislava"
                        value={newLocation.city}
                        onChange={e => setNewLocation(v => ({ ...v, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Street</label>
                      <Input
                        placeholder="e.g., Main Street"
                        value={newLocation.street}
                        onChange={e => setNewLocation(v => ({ ...v, street: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 md:w-1/2">
                    <label className="text-sm font-medium">House Number</label>
                    <Input
                      placeholder="e.g., 123"
                      value={newLocation.houseNumber}
                      onChange={e => setNewLocation(v => ({ ...v, houseNumber: e.target.value }))}
                    />
                  </div>
                  {addLocationMutation.isError && (
                    <p className="text-sm text-destructive">
                      {(addLocationMutation.error as Error).message}
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddLocation(false)
                        setNewLocation({ country: '', region: '', city: '', street: '', houseNumber: '' })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => addLocationMutation.mutate(newLocation)}
                      disabled={!newLocation.country || addLocationMutation.isPending}
                    >
                      {addLocationMutation.isPending && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Add Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {locations.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                No saved locations yet. Add one to quickly select it when creating posts.
              </p>
            ) : (
              <div className="space-y-2">
                {locations.map(loc => (
                  <div
                    key={loc.locationId}
                    className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{formatDisplayName(loc)}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                        <span>{formatLocationDetail(loc)}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
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

        {/* Error + action buttons */}
        {saveMutation.isError && (
          <p className="text-sm text-destructive">
            {(saveMutation.error as Error).message}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/account-settings' })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={deleteLocationId !== null}
        title="Remove Location"
        description="Are you sure you want to remove this location from your profile?"
        confirmLabel="Remove"
        destructive
        isPending={deleteLocationMutation.isPending}
        onConfirm={() => { if (deleteLocationId) deleteLocationMutation.mutate(deleteLocationId) }}
        onClose={() => setDeleteLocationId(null)}
      />
    </main>
  )
}
