import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { formatRelativeTime } from '#/lib/format'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import type { Thread } from '../-queries/threads'
import { useLocale } from '#/lib/useLocale'

export function ThreadItem({ thread, isActive }: { thread: Thread; isActive?: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  return (
    <Link
      to="/$locale/messages/$threadId"
      params={{ locale, threadId: thread.threadId }}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 no-underline transition-colors hover:bg-accent/60',
        isActive && 'bg-accent',
        thread.postDeleted && 'opacity-60',
      )}
    >
      <ProfileAvatar
        name={thread.otherPartyName}
        imageUrl={thread.otherPartyImageUrl ?? undefined}
        className="size-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-1">
          <p
            className={cn(
              'truncate text-sm font-medium',
              thread.unreadCount > 0 && 'font-semibold',
            )}
          >
            {thread.otherPartyName}
          </p>
          {thread.lastMessage && (
            <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
              {formatRelativeTime(thread.lastMessage.createdAt, t)}
            </span>
          )}
        </div>
        <div className="mb-1 flex items-center gap-1.5">
          <p className="truncate text-xs text-muted-foreground">{thread.postTitle}</p>
          {thread.myRole === 'post_owner' && (
            <Badge
              variant="outline"
              className="h-4 shrink-0 border-muted-foreground/40 px-1 text-[10px] text-muted-foreground"
            >
              {t('messages.yourPost')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {thread.postDeleted ? (
            <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground">
              {t('messages.postDeleted')}
            </Badge>
          ) : thread.lastMessage ? (
            <p className="truncate text-xs text-muted-foreground">
              {thread.lastMessage.sentByMe ? t('messages.you') : ''}
              {thread.lastMessage.content}
            </p>
          ) : (
            <p className="text-xs italic text-muted-foreground">{t('messages.noMessagesThread')}</p>
          )}
          {thread.unreadCount > 0 && (
            <span className="ml-auto inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
