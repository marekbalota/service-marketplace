import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { adminRecentUsersQueryOptions } from '#/lib/queries/admin'
import { formatRelativeTime } from '#/lib/format'

const AVATAR_GRADIENTS = [
  'bg-gradient-to-br from-blue-500 to-cyan-600 text-white',
  'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
  'bg-gradient-to-br from-purple-500 to-violet-600 text-white',
  'bg-gradient-to-br from-orange-500 to-red-500 text-white',
  'bg-gradient-to-br from-pink-500 to-rose-600 text-white',
  'bg-gradient-to-br from-indigo-500 to-blue-600 text-white',
]

function avatarGradient(name: string): string {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]!
}

export function NewUsersCard({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { data, isPending } = useQuery(adminRecentUsersQueryOptions)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('admin.newUsers.title')}</CardTitle>
        <CardDescription>{t('admin.newUsers.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex items-center gap-3 py-3 ${i < 3 ? 'border-b' : ''}`}>
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {data?.items.map((user, idx) => (
              <div
                key={user.userId}
                className={`flex items-center gap-3 py-3 ${idx < data.items.length - 1 ? 'border-b' : ''}`}
              >
                <ProfileAvatar
                  name={user.name}
                  className="size-9 shrink-0"
                  fallbackClassName={avatarGradient(user.name)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(user.createdAt, t)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
