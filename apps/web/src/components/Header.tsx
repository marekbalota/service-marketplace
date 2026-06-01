import { useState } from 'react'
import { useLocale } from '#/lib/useLocale'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { User, ChevronDown, Menu } from 'lucide-react'
import { Button, buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { UserProfilePanel } from './UserProfilePanel'
import { ImpersonationBanner } from './ImpersonationBanner'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'

export function Header() {
  const { t } = useTranslation()
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()

  return (
    <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
      {user?.impersonatedBy && <ImpersonationBanner />}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/$locale/posts" params={{ locale }} className="no-underline">
            <h1 className="text-2xl font-medium text-foreground transition-colors hover:text-primary">
              Service Marketplace
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user === null && (
              <>
                {/* Mobile: hamburger opens a sheet with the auth links */}
                <Sheet>
                  <SheetTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden"
                        aria-label={t('nav.navigation')}
                      />
                    }
                  >
                    <Menu className="size-5" />
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64 sm:max-w-64">
                    <div className="flex flex-col gap-3 p-4 pt-14">
                      <Link
                        to="/$locale/login"
                        params={{ locale }}
                        className={cn(
                          buttonVariants({ variant: 'outline' }),
                          'w-full justify-center',
                        )}
                      >
                        {t('nav.login')}
                      </Link>
                      <Link
                        to="/$locale/register"
                        params={{ locale }}
                        className={cn(buttonVariants(), 'w-full justify-center')}
                      >
                        {t('nav.register')}
                      </Link>
                    </div>
                  </SheetContent>
                </Sheet>
                {/* Desktop: inline buttons */}
                <Link
                  to="/$locale/login"
                  params={{ locale }}
                  className={cn(buttonVariants({ variant: 'outline' }), 'hidden sm:inline-flex')}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/$locale/register"
                  params={{ locale }}
                  className={cn(buttonVariants(), 'hidden sm:inline-flex')}
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
            {user != null && (
              <>
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger
                    render={
                      <Button
                        variant="outline"
                        className="gap-2"
                        data-testid="profile-menu-trigger"
                      />
                    }
                  >
                    <User className="size-4" />
                    {activeProfile && (
                      <span className="hidden sm:inline">{activeProfile.name}</span>
                    )}
                    <ChevronDown className="size-4" />
                  </SheetTrigger>
                  <SheetContent side="right" showCloseButton className="sm:max-w-sm">
                    <SheetHeader className="flex-row items-center gap-4 border-b px-6 pb-6 pt-10 space-y-0">
                      <div className="min-w-0">
                        <SheetTitle className="truncate text-lg font-semibold text-foreground">
                          {user.name ?? activeProfile?.name ?? '—'}
                        </SheetTitle>
                        <p className="truncate text-sm text-muted-foreground capitalize">
                          {user.role?.name ?? ''}
                        </p>
                      </div>
                    </SheetHeader>
                    <UserProfilePanel onClose={() => setOpen(false)} />
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
