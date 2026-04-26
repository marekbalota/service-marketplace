// apps/web/src/routes/_app/messages/route.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMatch } from '@tanstack/react-router'
import { Suspense } from 'react'
import { MessageSquare } from 'lucide-react'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { useActiveProfile } from '#/hooks/useActiveProfile'
import { threadsQueryOptions } from './-queries/threads'
import { ThreadItem } from './-components/ThreadItem'

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
  const { activeProfile } = useActiveProfile()
  const threadMatch = useMatch({ from: '/_app/messages/$threadId', shouldThrow: false })
  const activeThreadId = threadMatch?.params.threadId
  const isInThread = !!threadMatch

  return (
    <div className="flex h-[calc(100svh-4rem)] overflow-hidden">
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

      <div className={cn('flex flex-1 flex-col overflow-hidden', !isInThread && 'hidden md:flex')}>
        <Outlet />
      </div>
    </div>
  )
}

export const Route = createFileRoute('/_app/messages')({
  beforeLoad: ({ context: { user } }) => {
    if (!user) throw redirect({ to: '/login' })
  },
  component: MessagesLayout,
})
