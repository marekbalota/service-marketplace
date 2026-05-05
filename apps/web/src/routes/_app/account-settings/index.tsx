import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  User, Bell, Key, Shield, LogOut, Users, Mail, Lock, Smartphone, MessageSquare, Plus,
} from 'lucide-react'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Button, buttonVariants } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Switch } from '#/components/ui/switch'
import { Skeleton } from '#/components/ui/skeleton'
import { ChangeEmailDialog } from './-components/ChangeEmailDialog'
import { ChangePasswordDialog } from './-components/ChangePasswordDialog'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/_app/account-settings/')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(currentUserQueryOptions),
  pendingComponent: AccountSettingsHubSkeleton,
  component: AccountSettingsHubPage,
})

const SECTIONS = [
  { id: 'account-information',  label: 'Account Information',       icon: User        },
  { id: 'notifications',        label: 'Notifications',             icon: Bell        },
  { id: 'connected-accounts',   label: 'Connected Accounts',        icon: Key    },
  { id: 'two-factor-auth',      label: 'Two-Factor Authentication', icon: Shield },
  { id: 'login-management',     label: 'Login Management',          icon: LogOut      },
  { id: 'user-profiles',        label: 'User Profiles',             icon: Users       },
] as const

type SectionId = typeof SECTIONS[number]['id']

const NOTIFICATION_ROWS = [
  {
    id:          'notif-email',
    label:       'Email Notifications',
    description: 'Receive emails about new messages and activity',
    icon:        Bell,
  },
  {
    id:          'notif-messages',
    label:       'Message Notifications',
    description: 'Get notified when you receive a new message',
    icon:        Mail,
  },
  {
    id:          'notif-reviews',
    label:       'Review Notifications',
    description: 'Get notified when someone reviews your post',
    icon:        Bell,
  },
] as const

const OAUTH_PROVIDERS = [
  { id: 'google',    label: 'Google',    className: 'bg-white text-gray-900 border-gray-300 hover:bg-white'          },
  { id: 'facebook',  label: 'Facebook',  className: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-600'       },
  { id: 'github',    label: 'GitHub',    className: 'bg-gray-900 text-white border-gray-900 hover:bg-gray-900'       },
  { id: 'microsoft', label: 'Microsoft', className: 'bg-blue-500 text-white border-blue-500 hover:bg-blue-500'       },
  { id: 'apple',     label: 'Apple',     className: 'bg-black text-white border-black hover:bg-black'                },
] as const

const TWO_FA_METHODS = [
  { id: 'email',         label: 'Email',             description: 'Receive a code via email',                      icon: Mail        },
  { id: 'authenticator', label: 'Authenticator App', description: 'Use an app like Google Authenticator or Authy', icon: Smartphone  },
  { id: 'sms',           label: 'SMS',               description: 'Receive a code via text message',               icon: MessageSquare },
] as const

function AccountSettingsHubSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
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
    observersRef.current.forEach(o => o.disconnect())
    observersRef.current = []

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry?.isIntersecting) setActiveSection(id as SectionId) },
        { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
      )
      observer.observe(el)
      observersRef.current.push(observer)
    })

    return () => { observersRef.current.forEach(o => o.disconnect()) }
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account preferences and security settings</p>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Coming soon"
                  onClick={() => setShowChangeEmail(true)}
                >
                  Change
                </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Coming soon"
                  onClick={() => setShowChangePassword(true)}
                >
                  Change
                </Button>
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
                      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Switch id={id} disabled />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3 — Connected Accounts */}
          <Card id="connected-accounts">
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>Link your OAuth providers for easy sign-in</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Available</p>
              <div className="grid grid-cols-2 gap-3">
                {OAUTH_PROVIDERS.map(({ id, label, className }) => (
                  <Button
                    key={id}
                    className={cn('h-12 justify-between border-2 opacity-60', className)}
                    disabled
                    title="Coming soon"
                  >
                    <span className="font-medium">{label}</span>
                    <Plus className="size-4" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4 — Two-Factor Authentication */}
          <Card id="two-factor-auth">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {TWO_FA_METHODS.map(({ id, label, description, icon: Icon }) => (
                <div key={id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Button size="sm" disabled title="Coming soon">Enable</Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 5 — Login Management */}
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

          {/* 6 — User Profiles */}
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
                    {user?.profiles.length ?? 0} Active {(user?.profiles.length ?? 0) === 1 ? 'Profile' : 'Profiles'}
                  </p>
                  <p className="text-xs text-muted-foreground">Profiles for posting services</p>
                </div>
              </div>
              <Link to="/account-settings/profiles" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
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
