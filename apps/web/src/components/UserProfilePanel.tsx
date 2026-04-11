import { Link, useRouter } from '@tanstack/react-router'
import {
  Settings,
  FileText,
  MessageSquare,
  Shield,
  Search,
  LogOut,
  User,
} from 'lucide-react'
import { Separator } from '#/components/ui/separator'
import { SheetClose } from '#/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useActiveProfile } from '#/contexts/ActiveProfileContext'
import { authClient } from '#/auth'
import { Button } from '#/components/ui/button'
import { Label } from './ui/label'

function ProfileOption({ name, role }: { name: string; role?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--lagoon)] to-[var(--lagoon-deep)]">
        <User className="size-4 text-white" />
      </div>
      <div className="flex flex-col items-start">
        <span className="font-medium">{name}</span>
        {role && <span className="text-xs text-muted-foreground capitalize">{role}</span>}
      </div>
    </div>
  )
}

export function UserProfilePanel({ onClose }: { onClose: () => void }) {
  const { activeProfile, allProfiles, setActiveProfileId } = useActiveProfile()
  const router = useRouter()

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-4">
        {/* Profile Switcher */}
        {allProfiles.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Switch Profile
            </Label>

            <Select
              value={activeProfile?.userProfileId ?? ''}
              onValueChange={(id) => { if (id) setActiveProfileId(id) }}
            >
              <SelectTrigger className="!h-auto w-full px-3 py-3 [&_[data-slot=select-value]]:line-clamp-none">
                <SelectValue>
                  {activeProfile && <ProfileOption name={activeProfile.name} role={activeProfile.roleName} />}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allProfiles.map((profile) => (
                  <SelectItem key={profile.userProfileId} value={profile.userProfileId} className="py-3 pl-3 pr-10">
                    <ProfileOption name={profile.name} role={profile.roleName} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation */}
        <div className="space-y-1">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
          <nav className="flex flex-col gap-0.5">
            <SheetClose
              nativeButton={false}
              render={
                <Link
                  to="/posts"
                  onClick={onClose}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent"
                />
              }
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Search className="size-5 text-blue-600" />
              </div>
              <span>Browse Postings</span>
            </SheetClose>

            <SheetClose
              nativeButton={false}
              render={
                <Link
                  to="/my-postings"
                  onClick={onClose}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent"
                />
              }
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                <FileText className="size-5 text-green-600" />
              </div>
              <span>My Postings</span>
            </SheetClose>

            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-3 text-foreground hover:text-foreground"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <MessageSquare className="size-5 text-purple-600" />
              </div>
              <span>Messages</span>
            </Button>

            <Button
              variant="ghost"
              className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-3 text-foreground hover:text-foreground"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                <Shield className="size-5 text-orange-600" />
              </div>
              <span>Admin</span>
            </Button>
          </nav>
        </div>

        <Separator />

        {/* Account Actions */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-3 text-foreground hover:text-foreground"
          >
            <Settings className="size-5 text-muted-foreground" />
            <span>Account Settings</span>
          </Button>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-3 text-destructive hover:bg-red-50 hover:text-destructive"
            onClick={async () => {
              await authClient.signOut()
              onClose()
              void router.navigate({ to: '/' })
            }}
          >
            <LogOut className="size-5" />
            <span>Log out</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
