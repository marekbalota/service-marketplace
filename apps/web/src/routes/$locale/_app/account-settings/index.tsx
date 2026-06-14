import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { User, Bell, Shield, LogOut, Users, Mail, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { twoFactorStatusQueryOptions } from '#/lib/queries/two-factor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button, buttonVariants } from '#/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { Skeleton } from '#/components/ui/skeleton'
import { ChangeEmailDialog } from './-components/ChangeEmailDialog'
import { ChangePasswordDialog } from './-components/ChangePasswordDialog'
import { TwoFactorSection } from './-components/TwoFactorSection'
import { LoginManagementSection } from './-components/LoginManagementSection'
import { sessionsQueryOptions } from './-queries/sessions'
import { cn } from '#/lib/utils'
import { useLocale } from '#/lib/useLocale'
import { api } from '#/api'
import { wrapEdenError } from '#/lib/api-error'

export const Route = createFileRoute('/$locale/_app/account-settings/')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(currentUserQueryOptions),
      queryClient.ensureQueryData(twoFactorStatusQueryOptions),
      queryClient.ensureQueryData(sessionsQueryOptions),
    ]),
  pendingComponent: AccountSettingsHubSkeleton,
  component: AccountSettingsHubPage,
})

type SectionId = (typeof SECTIONS)[number]['id']

const SECTIONS = [
  {
    id: 'account-information' as const,
    icon: User,
    labelKey: 'accountSettings.sections.accountInformation' as const,
  },
  {
    id: 'notifications' as const,
    icon: Bell,
    labelKey: 'accountSettings.sections.notifications' as const,
  },
  {
    id: 'two-factor-auth' as const,
    icon: Shield,
    labelKey: 'accountSettings.sections.twoFactorAuth' as const,
  },
  {
    id: 'login-management' as const,
    icon: LogOut,
    labelKey: 'accountSettings.sections.loginManagement' as const,
  },
  {
    id: 'user-profiles' as const,
    icon: Users,
    labelKey: 'accountSettings.sections.userProfiles' as const,
  },
] as const

function AccountSettingsHubSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>
      <div className="flex gap-8">
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-8 min-w-0">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-5 shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20 shrink-0" />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-5 shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20 shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-5 shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-10 rounded-full shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-20 shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Login Management */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-44" />
            </CardContent>
          </Card>

          {/* User Profiles */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function AccountSettingsHubPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const { data: user } = useCurrentUser()
  const [activeSection, setActiveSection] = useState<SectionId>('account-information')
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const observersRef = useRef<IntersectionObserver[]>([])

  useEffect(() => {
    observersRef.current.forEach((o) => o.disconnect())
    observersRef.current = []

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveSection(id)
        },
        { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
      )
      observer.observe(el)
      observersRef.current.push(observer)
    })

    return () => {
      observersRef.current.forEach((o) => o.disconnect())
    }
  }, [])

  const notifMutation = useMutation({
    mutationFn: async (body: { notifyMessages?: boolean; notifyReviews?: boolean }) => {
      const { error } = await api.users.me.notifications.patch(body)
      if (error) throw wrapEdenError(error, 'Failed to update notification preferences.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'me'] }),
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">{t('accountSettings.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('accountSettings.subtitle')}</p>
      </div>

      <div className="flex gap-8">
        {/* Sticky sidebar — hidden on mobile */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map(({ id, icon: Icon, labelKey }) => (
              <Button
                key={id}
                type="button"
                variant="ghost"
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                className={cn(
                  'w-full justify-start gap-2 text-sm font-medium',
                  activeSection === id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {t(labelKey)}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-8 min-w-0">
          {/* 1 — Account Information */}
          <Card id="account-information">
            <CardHeader>
              <CardTitle>{t('accountSettings.accountInfo')}</CardTitle>
              <CardDescription>{t('accountSettings.accountInfoSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="size-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t('accountSettings.email')}</p>
                    <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
                  </div>
                </div>
                {!user || !!user.impersonatedBy ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span tabIndex={0} className="inline-flex">
                          <Button variant="outline" size="sm" disabled>
                            {t('accountSettings.changeEmail')}
                          </Button>
                        </span>
                      }
                    />
                    <TooltipContent>{t('accountSettings.impersonationRestricted')}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowChangeEmail(true)}>
                    {t('accountSettings.changeEmail')}
                  </Button>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="size-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t('accountSettings.password')}</p>
                    <p className="text-sm text-muted-foreground">••••••••</p>
                  </div>
                </div>
                {!user || !!user.impersonatedBy ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span tabIndex={0} className="inline-flex">
                          <Button variant="outline" size="sm" disabled>
                            {t('accountSettings.changePassword')}
                          </Button>
                        </span>
                      }
                    />
                    <TooltipContent>{t('accountSettings.impersonationRestricted')}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
                    {t('accountSettings.changePassword')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2 — Notifications */}
          <Card id="notifications">
            <CardHeader>
              <CardTitle>{t('accountSettings.notifications')}</CardTitle>
              <CardDescription>{t('accountSettings.notificationsSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="size-5 text-muted-foreground shrink-0" />
                  <div>
                    <Label htmlFor="notif-messages" className="text-sm font-medium">
                      {t('accountSettings.messageNotifications')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('accountSettings.messageNotificationsDesc')}
                    </p>
                  </div>
                </div>
                <Switch
                  id="notif-messages"
                  checked={user?.notifyMessages ?? true}
                  disabled={notifMutation.isPending}
                  onCheckedChange={(checked) => notifMutation.mutate({ notifyMessages: checked })}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-muted-foreground shrink-0" />
                  <div>
                    <Label htmlFor="notif-reviews" className="text-sm font-medium">
                      {t('accountSettings.reviewNotifications')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('accountSettings.reviewNotificationsDesc')}
                    </p>
                  </div>
                </div>
                <Switch
                  id="notif-reviews"
                  checked={user?.notifyReviews ?? true}
                  disabled={notifMutation.isPending}
                  onCheckedChange={(checked) => notifMutation.mutate({ notifyReviews: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 3 — Two-Factor Authentication */}
          <TwoFactorSection />

          {/* 4 — Login Management */}
          <LoginManagementSection />

          {/* 5 — User Profiles */}
          <Card id="user-profiles">
            <CardHeader>
              <CardTitle>{t('accountSettings.userProfiles')}</CardTitle>
              <CardDescription>{t('accountSettings.userProfilesSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {t('accountSettings.activeProfiles', { count: user?.profiles.length ?? 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('accountSettings.profilesDesc')}
                  </p>
                </div>
              </div>
              <Link
                to="/$locale/account-settings/profiles"
                params={{ locale }}
                className={buttonVariants({ variant: 'outline', className: 'w-full' })}
              >
                {t('accountSettings.manageProfiles')}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangeEmailDialog open={showChangeEmail} onOpenChange={setShowChangeEmail} />
      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />
    </main>
  )
}
