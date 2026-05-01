import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { User, ChevronDown } from 'lucide-react'
import { Button, buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { ThemeToggle } from './ThemeToggle'
import { UserProfilePanel } from './UserProfilePanel'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'

export function Header() {
  const [open, setOpen] = useState(false)
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()

  return (
    <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="no-underline">
            <h1 className="text-2xl font-medium text-foreground transition-colors hover:text-primary">
              Service Marketplace
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user === null && (
              <>
                <Link to="/login" className={cn(buttonVariants({ variant: 'outline' }))}>
                  Log in
                </Link>
                <Link to="/register" className={cn(buttonVariants())}>
                  Register
                </Link>
              </>
            )}
            {user != null && (
              <>
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger
                    render={<Button variant="outline" className="gap-2" data-testid="profile-menu-trigger" />}
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
