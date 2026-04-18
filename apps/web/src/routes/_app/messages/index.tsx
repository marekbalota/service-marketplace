import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import { useActiveProfile } from '#/contexts/ActiveProfileContext'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { Suspense } from 'react'
import { threadsQueryOptions, formatRelativeTime } from './route'

export const Route = createFileRoute('/_app/messages/')({
  component: MessagesPage,
})

function ThreadsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

type Thread = {
  threadId: string
  postId: string
  postTitle: string
  postType: 'OFFER' | 'REQUEST'
  otherPartyName: string
  lastMessage: { content: string; createdAt: Date | string; sentByMe: boolean } | null
  unreadCount: number
  myRole: 'initiator' | 'post_owner'
  label: 'provider' | 'client'
  postDeleted: boolean
}

function ThreadRow({ thread }: { thread: Thread }) {
  const isProvider = thread.label === 'provider'
  return (
    <Link
      to="/messages/$threadId"
      params={{ threadId: thread.threadId }}
      className="block no-underline"
    >
      <Card className={cn(
        'transition-colors hover:bg-accent/50',
        thread.unreadCount > 0 && 'border-primary/40',
        thread.postDeleted && 'opacity-60',
      )}>
        <CardContent className="flex items-start gap-4 p-4">
          {/* Avatar placeholder */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--lagoon)] to-[var(--lagoon-deep)]">
            <MessageSquare className="size-5 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-foreground">
                {thread.otherPartyName} — {thread.postTitle}
              </p>
              {thread.unreadCount > 0 && (
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {thread.unreadCount}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              {thread.postDeleted ? (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Post deleted
                </Badge>
              ) : (
                <Badge
                  variant={isProvider ? 'default' : 'outline'}
                  className={cn(
                    'text-xs',
                    isProvider
                      ? 'bg-offer-bg text-offer-fg hover:bg-offer-bg'
                      : 'border-request-border text-request-fg',
                  )}
                >
                  {thread.label}
                </Badge>
              )}
              {thread.lastMessage ? (
                <p className="truncate text-sm text-muted-foreground">
                  {thread.lastMessage.sentByMe ? 'You: ' : ''}
                  {thread.lastMessage.content}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No messages yet</p>
              )}
            </div>
          </div>

          {thread.lastMessage && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatRelativeTime(thread.lastMessage.createdAt)}
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function ThreadList({ profileId }: { profileId: string }) {
  const { data: threads } = useSuspenseQuery(threadsQueryOptions(profileId))

  if (threads.length === 0) {
    return (
      <div className="py-16 text-center">
        <MessageSquare className="mx-auto mb-4 size-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">No messages yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse posts and send a message to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <ThreadRow key={thread.threadId} thread={thread} />
      ))}
    </div>
  )
}

function MessagesPage() {
  const { activeProfile } = useActiveProfile()

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-semibold text-foreground">Messages</h1>
      {activeProfile ? (
        <Suspense fallback={<ThreadsSkeleton />}>
          <ThreadList profileId={activeProfile.userProfileId} />
        </Suspense>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No profile found.</p>
        </div>
      )}
    </main>
  )
}
