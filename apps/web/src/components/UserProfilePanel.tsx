import { Link, useRouter, useNavigate } from '@tanstack/react-router'
import {
  Settings,
  FileText,
  MessageSquare,
  Shield,
  Search,
  LogOut,
} from 'lucide-react'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { Separator } from '#/components/ui/separator'
import { SheetClose } from '#/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { currentUserQueryOptions, useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { authClient } from '#/auth'
import { Button } from '#/components/ui/button'
import { Label } from './ui/label'
import { queryClient } from '#/router'

function ProfileOption({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <ProfileAvatar name={name} className="size-8 shrink-0" />
      <div className="flex flex-col items-start">
        <span className="font-medium">{name}</span>
      </div>
    </div>
  )
}

export function UserProfilePanel({ onClose }: { onClose: () => void }) {
  const { data: user } = useCurrentUser()
  const { activeProfile, setActiveProfileId } = useActiveProfile()
  const router = useRouter()
  const navigate = useNavigate()
  const allProfiles = user?.profiles ?? []
  const isAdmin = (user?.role?.permissions ?? []).some((p: string) => p.startsWith('admin:'))

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
                  {activeProfile && <ProfileOption name={activeProfile.name} />}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allProfiles.map((profile) => (
                  <SelectItem key={profile.userProfileId} value={profile.userProfileId} className="py-3 pl-3 pr-10">
                    <ProfileOption name={profile.name} />
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
                <Search className="size-5 text-blue-600 dark:text-blue-300" />
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
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-500/20">
                <FileText className="size-5 text-green-600 dark:text-green-300" />
              </div>
              <span>My Postings</span>
            </SheetClose>

            <SheetClose
              nativeButton={false}
              render={
                <Link
                  to="/messages"
                  onClick={onClose}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent"
                />
              }
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/20">
                <MessageSquare className="size-5 text-purple-600 dark:text-purple-300" />
              </div>
              <span>Messages</span>
            </SheetClose>

            {isAdmin && (
              <SheetClose
                nativeButton={false}
                render={
                  <Link
                    to="/admin"
                    onClick={onClose}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent"
                  />
                }
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
                  <Shield className="size-5 text-orange-600 dark:text-orange-300" />
                </div>
                <span>Admin</span>
              </SheetClose>
            )}
          </nav>
        </div>

        <Separator />

        {/* Account Actions */}
        <div className="space-y-1">
          <SheetClose
            nativeButton={false}
            render={
              <Link
                to="/account-settings"
                onClick={onClose}
                className="flex h-auto w-full items-center justify-start gap-3 rounded-lg px-2 py-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent"
              />
            }
          >
            <Settings className="size-5 text-muted-foreground" />
            <span>Account Settings</span>
          </SheetClose>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-lg px-2 py-3 text-destructive hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-destructive"
            onClick={async () => {
              await authClient.signOut()
              queryClient.setQueryData(currentUserQueryOptions.queryKey, null)
              queryClient.clear()
              await navigate({ to: '/' })
              router.invalidate()
              onClose()
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
