import { useState } from 'react'
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
  links,
  linkInput,
  onLinkInputChange,
  onAdd,
  onRemove,
}: {
  links: string[]
  linkInput: string
  onLinkInputChange: (v: string) => void
  onAdd: () => void
  onRemove: (link: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Images</label>
      <div className="flex gap-2">
        <Input
          placeholder="Enter image URL"
          value={linkInput}
          onChange={(e) => onLinkInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" onClick={onAdd}>
          <Plus className="size-4" />
        </Button>
      </div>
      {links.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {links.map((link) => (
            <div key={link} className="group relative">
              <img
                src={link}
                alt="Preview"
                className="h-24 w-full rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(link)}
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
  const [pendingLinks, setPendingLinks] = useState<string[]>([])
  const [linkInput, setLinkInput] = useState('')
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
      for (const link of pendingLinks) {
        await api.profiles({ id: data!.userProfileId }).images.post({ link })
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profilesQueryOptions.queryKey })
      setPendingLinks([])
      setLinkInput('')
      setOpen(false)
    },
  })

  const defaultValues: ProfileFormValues = { name: '', email: '', bio: '', phoneNumber: '', fax: '' }

  function addLink() {
    const trimmed = linkInput.trim()
    if (trimmed && !pendingLinks.includes(trimmed)) {
      setPendingLinks((prev) => [...prev, trimmed])
    }
    setLinkInput('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPendingLinks([]); setLinkInput('') } }}>
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
            links={pendingLinks}
            linkInput={linkInput}
            onLinkInputChange={setLinkInput}
            onAdd={addLink}
            onRemove={(link) => setPendingLinks((prev) => prev.filter((l) => l !== link))}
          />
        </ProfileForm>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditProfileDialog({ profile }: { profile: UserProfile }) {
  const [open, setOpen] = useState(false)
  const [linkInput, setLinkInput] = useState('')
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
    mutationFn: async (link: string) => {
      const { error } = await api.profiles({ id: profile.userProfileId }).images.post({ link })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imagesQueryOptions(profile.userProfileId).queryKey })
      setLinkInput('')
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

  function addLink() {
    const trimmed = linkInput.trim()
    if (trimmed) addImageMutation.mutate(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setLinkInput('') }}>
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
            links={images.map((img) => img.link)}
            linkInput={linkInput}
            onLinkInputChange={setLinkInput}
            onAdd={addLink}
            onRemove={(link) => {
              const img = images.find((i) => i.link === link)
              if (img) deleteImageMutation.mutate(img.imageId)
            }}
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
  const { data: images = [] } = useQuery(imagesQueryOptions(profile.userProfileId))

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
              {profile.bio && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{profile.bio}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {profile.phoneNumber && <span>📞 {profile.phoneNumber}</span>}
                {profile.fax && <span>📠 {profile.fax}</span>}
              </div>
              {images.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {images.slice(0, 3).map((img) => (
                    <img
                      key={img.imageId}
                      src={img.link}
                      alt={img.name}
                      className="size-16 shrink-0 rounded border object-cover"
                    />
                  ))}
                  {images.length > 3 && (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded border bg-muted text-sm text-muted-foreground">
                      +{images.length - 3}
                    </div>
                  )}
                </div>
              )}
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
