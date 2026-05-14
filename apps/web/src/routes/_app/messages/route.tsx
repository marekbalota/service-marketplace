// apps/web/src/routes/_app/messages/route.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMatch } from '@tanstack/react-router'
import { Suspense, useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { useActiveProfile } from '#/context/activeProfile'
import { useCurrentUser } from '#/lib/queries/users'
import { EmptyState } from '#/components/EmptyState'
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

function ThreadSidebar({
  profileId,
  activeThreadId,
}: {
  profileId: string
  activeThreadId?: string
}) {
  const { t } = useTranslation()
  const { data: threads } = useSuspenseQuery(threadsQueryOptions(profileId))

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <MessageSquare className="mb-4 size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('messages.noMessages')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('messages.noMessagesHint')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5 p-2">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.threadId}
          thread={thread}
          isActive={thread.threadId === activeThreadId}
        />
      ))}
    </div>
  )
}

function MessagesLayout() {
  const { t } = useTranslation()
  const { data: currentUser } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const threadMatch = useMatch({ from: '/_app/messages/$threadId', shouldThrow: false })
  const activeThreadId = threadMatch?.params.threadId
  const isInThread = !!threadMatch
  const navigate = Route.useNavigate()

  const prevProfileIdRef = useRef(activeProfile?.userProfileId)
  useEffect(() => {
    const prevId = prevProfileIdRef.current
    prevProfileIdRef.current = activeProfile?.userProfileId
    if (prevId !== undefined && prevId !== activeProfile?.userProfileId && isInThread) {
      void navigate({ to: '/messages' })
    }
  }, [activeProfile?.userProfileId, isInThread, navigate])

  if (currentUser?.impersonatedBy) {
    return (
      <div className="flex h-[calc(100svh-4rem)] items-center justify-center">
        <EmptyState message={t('messages.impersonationBlocked')} />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100svh-4rem)] overflow-hidden">
      <aside
        className={cn(
          'flex w-full flex-col border-r bg-card md:w-80 lg:w-96',
          isInThread ? 'hidden md:flex' : 'flex',
        )}
      >
        <div className="border-b px-4 py-3">
          <h1 className="text-lg font-semibold">{t('messages.title')}</h1>
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
  beforeLoad: ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: MessagesLayout,
})
