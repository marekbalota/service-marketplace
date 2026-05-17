import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  User,
  Bell,
  Shield,
  LogOut,
  Users,
  Mail,
  Lock,
} from 'lucide-react'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
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
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/account-settings/')({
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(currentUserQueryOptions),
  pendingComponent: AccountSettingsHubSkeleton,
  component: AccountSettingsHubPage,
})

const SECTIONS = [
  { id: 'account-information', label: 'Account Information', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'two-factor-auth', label: 'Two-Factor Authentication', icon: Shield },
  { id: 'login-management', label: 'Login Management', icon: LogOut },
  { id: 'user-profiles', label: 'User Profiles', icon: Users },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const NOTIFICATION_ROWS = [
  {
    id: 'notif-email',
    label: 'Email Notifications',
    description: 'Receive emails about new messages and activity',
    icon: Bell,
  },
  {
    id: 'notif-messages',
    label: 'Message Notifications',
    description: 'Get notified when you receive a new message',
    icon: Mail,
  },
  {
    id: 'notif-reviews',
    label: 'Review Notifications',
    description: 'Get notified when someone reviews your post',
    icon: Bell,
  },
] as const


function AccountSettingsHubSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="mb-8 h-8 w-48" />
      <div className="flex gap-8">
        <div className="hidden lg:block w-56 shrink-0 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
        <div className="flex-1 space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

function AccountSettingsHubPage() {
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
          if (entry?.isIntersecting) setActiveSection(id as SectionId)
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account preferences and security settings
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sticky sidebar — hidden on mobile */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 flex flex-col gap-1">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
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
                {label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-8 min-w-0">
          {/* 1 — Account Information */}
          <Card id="account-information">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your email and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="size-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
                  </div>
                </div>
                {!user || !!user.impersonatedBy ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span tabIndex={0} className="inline-flex">
                          <Button variant="outline" size="sm" disabled>
                            Change
                          </Button>
                        </span>
                      }
                    />
                    <TooltipContent>Not available during impersonation</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowChangeEmail(true)}>
                    Change
                  </Button>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="size-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">••••••••</p>
                  </div>
                </div>
                {!user || !!user.impersonatedBy ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span tabIndex={0} className="inline-flex">
                          <Button variant="outline" size="sm" disabled>
                            Change
                          </Button>
                        </span>
                      }
                    />
                    <TooltipContent>Not available during impersonation</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowChangePassword(true)}>
                    Change
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2 — Notifications */}
          <Card id="notifications">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {NOTIFICATION_ROWS.map(({ id, label, description, icon: Icon }) => (
                <div key={id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Icon className="size-5 text-muted-foreground shrink-0" />
                    <div>
                      <Label htmlFor={id} className="text-sm font-medium">
                        {label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch id={id} disabled />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3 — Two-Factor Authentication */}
          <TwoFactorSection />

          {/* 4 — Login Management */}
          <Card id="login-management">
            <CardHeader>
              <CardTitle>Login Management</CardTitle>
              <CardDescription>Manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Signing out of all devices will end all active sessions except your current one.
              </p>
              <Button variant="destructive" disabled title="Coming soon" className="gap-2">
                <LogOut className="size-4" />
                Log Out All Devices
              </Button>
            </CardContent>
          </Card>

          {/* 5 — User Profiles */}
          <Card id="user-profiles">
            <CardHeader>
              <CardTitle>User Profiles</CardTitle>
              <CardDescription>Manage your service profiles for posting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Users className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {user?.profiles.length ?? 0} Active{' '}
                    {(user?.profiles.length ?? 0) === 1 ? 'Profile' : 'Profiles'}
                  </p>
                  <p className="text-xs text-muted-foreground">Profiles for posting services</p>
                </div>
              </div>
              <Link
                to="/account-settings/profiles"
                className={buttonVariants({ variant: 'outline', className: 'w-full' })}
              >
                Manage Profiles
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
