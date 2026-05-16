import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'
import { Skeleton } from '#/components/ui/skeleton'
import { EmptyState } from '#/components/EmptyState'
import { cn } from '#/lib/utils'
import { useActiveProfile } from '#/context/activeProfile'
import { useCurrentUser } from '#/lib/queries/users'
import { ChatInterface } from './-components/ChatInterface'

function ThreadPageSkeleton() {
  return (
    <main className="flex flex-1 flex-col min-h-0">
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
    </main>
  )
}

function ThreadPage() {
  const { threadId } = Route.useParams()
  const { data: currentUser } = useCurrentUser()
  const { activeProfile } = useActiveProfile()

  if (currentUser?.impersonatedBy) {
    return <EmptyState message="Messages are not accessible during impersonation." />
  }

  if (!activeProfile) {
    return <EmptyState message="No active profile. Set up a profile to use messages." />
  }

  return (
    <Suspense fallback={<ThreadPageSkeleton />}>
      <ChatInterface threadId={threadId} profileId={activeProfile.userProfileId} />
    </Suspense>
  )
}

export const Route = createFileRoute('/_app/messages/$threadId')({
  beforeLoad: ({ context: { user }, location }) => {
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href }, replace: true })
  },
  component: ThreadPage,
})
