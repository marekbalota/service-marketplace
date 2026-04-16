import { useState, useRef } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Suspense } from 'react'
import { Plus, Edit, Trash2, CheckCircle2, User, X } from 'lucide-react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authClient } from '#/auth'
import { api } from '#/api'
import { profilesQueryOptions, useActiveProfile } from '#/contexts/ActiveProfileContext'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/account-settings')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(profilesQueryOptions)
  },
  pendingComponent: AccountSettingsSkeleton,
  component: AccountSettingsPage,
})

// ── Query options ─────────────────────────────────────────────────────────────

export function imagesQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'images'],
    queryFn: async () => {
      const { data, error } = await api.profiles({ id: profileId }).images.get()
      if (error) throw error
      return data ?? []
    },
  })
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  email:       z.string().email('Invalid email address'),
  bio:         z.string().optional(),
  phoneNumber: z.string().optional(),
  fax:         z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

// ── Profile type (from Eden Treaty) ──────────────────────────────────────────

type UserProfile = NonNullable<
  Awaited<ReturnType<typeof api.profiles.me.get>>['data']
>[number]

// ── Skeleton ──────────────────────────────────────────────────────────────────

function AccountSettingsSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="flex gap-4">
              <Skeleton className="size-14 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

// ── Image input section ───────────────────────────────────────────────────────

function ImageInputSection({
  previews,
  onFilePicked,
  onRemove,
  isUploading,
}: {
  previews: string[]
  onFilePicked: (file: File) => void
  onRemove: (index: number) => void
  isUploading?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onFilePicked(file)
      e.target.value = '' // allow re-selecting the same file
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Images</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <Plus className="size-4" />
        {isUploading ? 'Uploading…' : 'Add Image'}
      </Button>
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((preview, i) => (
            <div key={preview} className="group relative">
              <img
                src={preview}
                alt="Preview"
                className="h-24 w-full rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Profile form ──────────────────────────────────────────────────────────────

function ProfileForm({
  defaultValues,
  onSubmit,
  submitLabel,
  isPending,
  children,
}: {
  defaultValues: ProfileFormValues
  onSubmit: SubmitHandler<ProfileFormValues>
  submitLabel: string
  isPending: boolean
  children?: React.ReactNode
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onChange',
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., John Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fax</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 (555) 123-4568" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell others about yourself or your business..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {children}

        <div className="flex gap-3 pt-2">
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ── Create dialog ─────────────────────────────────────────────────────────────

function CreateProfileDialog() {
  const [open, setOpen] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Array<{ file: File; preview: string }>>([])
  const queryClient = useQueryClient()

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
      setOpen(false)
    },
  })

  function cleanup() {
    for (const { preview } of pendingFiles) {
      URL.revokeObjectURL(preview)
    }
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) cleanup() }}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        Add Profile
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Profile</DialogTitle>
          <DialogDescription>Add a new user profile to your account</DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditProfileDialog({ profile }: { profile: UserProfile }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: images = [] } = useQuery({
    ...imagesQueryOptions(profile.userProfileId),
    enabled: open,
  })

  const patchMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { error } = await api.profiles({ id: profile.userProfileId }).patch({
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
      setOpen(false)
    },
  })

  const addImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const { error } = await api.profiles({ id: profile.userProfileId }).images.post({ file })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profile.userProfileId).queryKey })
    },
  })

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const { error } = await api.images({ id: imageId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profile.userProfileId).queryKey })
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-24 gap-2" />}>
        <Edit className="size-4" />
        Edit
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>
        {patchMutation.isError && (
          <p className="text-sm text-destructive">{(patchMutation.error as Error).message}</p>
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
      </DialogContent>
    </Dialog>
  )
}

// ── Delete button ─────────────────────────────────────────────────────────────

function DeleteProfileButton({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.profiles({ id: profile.userProfileId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profilesQueryOptions.queryKey })
    },
    onError: (err) => {
      const msg = (err as { value?: { message?: string } }).value?.message ?? (err as Error).message
      setErrorMsg(msg)
    },
  })

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        className="w-24 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={mutation.isPending}
        onClick={() => {
          setErrorMsg(null)
          mutation.mutate()
        }}
      >
        <Trash2 className="size-4" />
        Delete
      </Button>
      {errorMsg && (
        <p className="max-w-48 text-right text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  )
}

// ── Profile card ──────────────────────────────────────────────────────────────

function ProfileCard({ profile, isActive }: { profile: UserProfile; isActive: boolean }) {
  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-1 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--lagoon)] to-[var(--lagoon-deep)] shadow-md">
              <User className="size-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{profile.name}</h3>
                {isActive && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                      'bg-active-bg text-active-fg border-active-border',
                    )}
                  >
                    <CheckCircle2 className="size-3" />
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {profile.phoneNumber && <p>📞 {profile.phoneNumber}</p>}
                {profile.fax && <p>📠 {profile.fax}</p>}
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <p>Created {new Date(profile.createdAt).toLocaleDateString()}</p>
                {profile.updatedAt && (
                  <p>Updated {new Date(profile.updatedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <EditProfileDialog profile={profile} />
            <DeleteProfileButton profile={profile} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Profiles list ─────────────────────────────────────────────────────────────

function ProfilesList() {
  const { data: profiles } = useSuspenseQuery(profilesQueryOptions)
  const { activeProfile } = useActiveProfile()

  return (
    <div className="space-y-4">
      {profiles?.map((profile) => (
        <ProfileCard
          key={profile.userProfileId}
          profile={profile}
          isActive={profile.userProfileId === activeProfile?.userProfileId}
        />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AccountSettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Account Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your user profiles and account settings</p>
        </div>
        <CreateProfileDialog />
      </div>

      <Suspense fallback={<AccountSettingsSkeleton />}>
        <ProfilesList />
      </Suspense>
    </main>
  )
}
