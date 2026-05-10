import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { formatRelativeTime } from '../-utils'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import type { Thread } from '../-queries/threads'

export function ThreadItem({ thread, isActive }: { thread: Thread; isActive?: boolean }) {
  return (
    <Link
      to="/messages/$threadId"
      params={{ threadId: thread.threadId }}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 no-underline transition-colors hover:bg-accent/60',
        isActive && 'bg-accent',
        thread.postDeleted && 'opacity-60',
      )}
    >
      <ProfileAvatar
        name={thread.otherPartyName}
        className="size-10 shrink-0"
        fallbackClassName="text-sm font-semibold"
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
              {formatRelativeTime(thread.lastMessage.createdAt)}
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
              Your post
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {thread.postDeleted ? (
            <Badge variant="outline" className="h-4 px-1 text-[10px] text-muted-foreground">
              Post deleted
            </Badge>
          ) : thread.lastMessage ? (
            <p className="truncate text-xs text-muted-foreground">
              {thread.lastMessage.sentByMe ? 'You: ' : ''}
              {thread.lastMessage.content}
            </p>
          ) : (
            <p className="text-xs italic text-muted-foreground">No messages yet</p>
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
