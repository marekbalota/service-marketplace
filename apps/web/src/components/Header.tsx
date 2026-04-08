import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { User, ChevronDown } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import ThemeToggle from './ThemeToggle'
import { UserProfilePanel } from './UserProfilePanel'
import { useActiveProfile } from '#/contexts/ActiveProfileContext'

export default function Header() {
  const [open, setOpen] = useState(false)
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
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" className="gap-2" />
                }
              >
                <User className="size-4" />
                <span className="hidden sm:inline">
                  {activeProfile?.name ?? 'Profile'}
                </span>
                <ChevronDown className="size-4" />
              </SheetTrigger>
              <SheetContent side="right" showCloseButton>
                <SheetHeader>
                  <SheetTitle>User Profile</SheetTitle>
                </SheetHeader>
                <UserProfilePanel onClose={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
