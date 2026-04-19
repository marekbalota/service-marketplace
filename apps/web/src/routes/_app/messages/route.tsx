import { createFileRoute, redirect, Outlet, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { Suspense } from 'react'
import { MessageSquare } from 'lucide-react'
import { authClient } from '#/auth'
import { api } from '#/api'
import { useActiveUser } from '#/contexts/ActiveUserContext'
import { Badge } from '#/components/ui/badge'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'

export function threadsQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['threads', profileId],
    queryFn: async () => {
      const { data, error } = await api.threads.get({ query: { profileId } })
      if (error) throw error
      return data ?? []
    },
    staleTime: 0,
  })
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export type Thread = {
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

export function ThreadItem({ thread, isActive }: { thread: Thread; isActive?: boolean }) {
  return (
    <Link
      to="/messages/$threadId"
      params={{ threadId: thread.threadId }}
      className="block no-underline"
    >
      <div
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent/60',
          isActive && 'bg-accent',
          thread.postDeleted && 'opacity-60',
        )}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
          {getInitials(thread.otherPartyName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-1">
            <p className={cn('truncate text-sm font-medium', thread.unreadCount > 0 && 'font-semibold')}>
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
      </div>
    </Link>
  )
}

function ThreadListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ThreadSidebar({ profileId, activeThreadId }: { profileId: string; activeThreadId?: string }) {
  const { data: threads } = useSuspenseQuery(threadsQueryOptions(profileId))

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <MessageSquare className="mb-4 size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No messages yet.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Browse posts and send a message to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 p-2">
      {threads.map((thread) => (
        <ThreadItem key={thread.threadId} thread={thread} isActive={thread.threadId === activeThreadId} />
      ))}
    </div>
  )
}

function MessagesLayout() {
  const { activeProfile } = useActiveUser()
  const routerState = useRouterState()

  const threadMatch = routerState.matches.find((m) => m.routeId === '/_app/messages/$threadId')
  const activeThreadId = (threadMatch?.params as Record<string, string> | undefined)?.threadId
  const isInThread = !!threadMatch

  return (
    <div className="flex h-[calc(100svh-4rem)] overflow-hidden">
      {/* Thread list sidebar */}
      <aside
        className={cn(
          'flex w-full flex-col border-r bg-card md:w-80 lg:w-96',
          isInThread ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeProfile ? (
            <Suspense fallback={<ThreadListSkeleton />}>
              <ThreadSidebar
                profileId={activeProfile.userProfileId}
                activeThreadId={activeThreadId}
              />
            </Suspense>
          ) : (
            <ThreadListSkeleton />
          )}
        </div>
      </aside>

      {/* Right panel */}
      <div className={cn('flex flex-1 flex-col overflow-hidden', !isInThread && 'hidden md:flex')}>
        <Outlet />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_app/messages')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }
  },
  component: MessagesLayout,
})
