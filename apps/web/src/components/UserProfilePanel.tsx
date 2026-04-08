import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Settings,
  FileText,
  MessageSquare,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react'
import { Separator } from '#/components/ui/separator'
import { SheetClose } from '#/components/ui/sheet'
import { useActiveProfile } from '#/contexts/ActiveProfileContext'

export function UserProfilePanel({ onClose }: { onClose: () => void }) {
  const { activeProfile, allProfiles, setActiveProfileId } = useActiveProfile()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const handleProfileSwitch = (id: string) => {
    setActiveProfileId(id)
    setSwitcherOpen(false)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Account Management */}
      <div className="px-2 py-3">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent">
          <Settings className="size-5 shrink-0 text-muted-foreground" />
          <span className="font-medium">Account Management</span>
        </button>
      </div>

      <Separator />

      {/* Active Profile */}
      <div className="px-2 py-3">
        <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Active Profile
        </p>

        <button
          className="flex w-full items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-accent"
          onClick={() => setSwitcherOpen((prev) => !prev)}
          aria-expanded={switcherOpen}
        >
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-medium">
              {activeProfile?.name ?? '—'}
            </p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {activeProfile?.roleName ?? ''}
            </p>
          </div>
          {switcherOpen ? (
            <ChevronUp className="ml-2 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {switcherOpen && allProfiles.length > 0 && (
          <div className="mt-1 overflow-hidden rounded-md border bg-popover shadow-md">
            {allProfiles.map((profile) => {
              const isActive = profile.userProfileId === activeProfile?.userProfileId
              return (
                <button
                  key={profile.userProfileId}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent ${isActive ? 'bg-accent/50' : ''}`}
                  onClick={() => handleProfileSwitch(profile.userProfileId)}
                >
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium">{profile.name}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {profile.accountName} · {profile.roleName}
                    </p>
                  </div>
                  {isActive && (
                    <Check className="size-4 shrink-0 text-primary" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Menu */}
      <div className="px-2 py-3">
        <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Menu
        </p>
        <nav className="flex flex-col gap-0.5">
          <SheetClose
            render={
              <Link
                to="/"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm !text-foreground no-underline transition-colors hover:bg-accent"
              />
            }
          >
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <span>Browse Postings</span>
          </SheetClose>

          <SheetClose
            render={
              <Link
                to="/my-postings"
                onClick={onClose}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm !text-foreground no-underline transition-colors hover:bg-accent"
              />
            }
          >
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <span>My Postings</span>
          </SheetClose>

          <button className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent">
            <MessageSquare className="size-5 shrink-0 text-muted-foreground" />
            <span>Messages</span>
          </button>

          <button className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent">
            <Shield className="size-5 shrink-0 text-muted-foreground" />
            <span>Admin</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
