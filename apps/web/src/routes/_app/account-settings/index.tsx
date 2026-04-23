import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Suspense, useState } from 'react'
import { Plus, Edit, Trash2, CheckCircle2, User, Eye, Phone, Printer } from 'lucide-react'
import { api } from '#/api'
import { profilesQueryOptions, useActiveProfile } from '#/lib/profileQueries'
import { currentUserQueryOptions } from '#/contexts/ActiveUserContext'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/account-settings/')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(profilesQueryOptions)
  },
  pendingComponent: AccountSettingsSkeleton,
  component: AccountSettingsPage,
})

type UserProfile = NonNullable<
  Awaited<ReturnType<typeof api.profiles.me.get>>['data']
>[number]

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
      queryClient.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey })
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
        onClick={() => { setErrorMsg(null); mutation.mutate() }}
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
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                    'bg-active-bg text-active-fg border-active-border',
                  )}>
                    <CheckCircle2 className="size-3" />
                    Active
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {profile.phoneNumber && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" />
                    {profile.phoneNumber}
                  </p>
                )}
                {profile.fax && (
                  <p className="flex items-center gap-1.5">
                    <Printer className="size-3.5 shrink-0" />
                    {profile.fax}
                  </p>
                )}
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
            <Link
              to="/profiles/$profileId"
              params={{ profileId: profile.userProfileId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-24 gap-2')}
            >
              <Eye className="size-4" />
              View
            </Link>
            <Link
              to="/account-settings/$profileId/edit"
              params={{ profileId: profile.userProfileId }}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-24 gap-2')}
            >
              <Edit className="size-4" />
              Edit
            </Link>
            <DeleteProfileButton profile={profile} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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

export function AccountSettingsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Account Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your user profiles and account settings</p>
        </div>
        <Link
          to="/account-settings/create"
          className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}
        >
          <Plus className="size-4" />
          Add Profile
        </Link>
      </div>

      <Suspense fallback={<AccountSettingsSkeleton />}>
        <ProfilesList />
      </Suspense>
    </main>
  )
}
