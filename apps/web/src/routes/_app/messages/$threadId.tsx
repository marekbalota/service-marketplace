import { createFileRoute, redirect, Link, useRouter } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, Suspense } from 'react'
import { ArrowLeft, ExternalLink, Flag, Send, Trash2 } from 'lucide-react'
import { authClient } from '#/auth'
import { api } from '#/api'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'
import { ReportForm } from '#/components/ReportForm'
import { useActiveUser } from '#/contexts/ActiveUserContext'
import { getInitials } from './route'

export function threadDetailQueryOptions(threadId: string, profileId: string) {
  return queryOptions({
    queryKey: ['threads', 'detail', threadId, profileId],
    queryFn: async () => {
      const { data, error } = await api.threads({ threadId }).get({ query: { profileId } })
      if (error) throw error
      return data!
    },
  })
}

export const Route = createFileRoute('/_app/messages/$threadId')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }
  },
  component: ThreadPage,
})

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

type Message = {
  messageId: string
  content: string
  createdAt: Date | string
  sentByMe: boolean
  readAt: Date | string | null
}


export function MessageBubble({
  message,
  otherPartyName,
  onReport,
}: {
  message: Message
  otherPartyName: string
  onReport?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const d = typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt
  const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className={cn('flex flex-col gap-1', message.sentByMe ? 'items-end' : 'items-start')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!message.sentByMe && (
        <span className="px-1 text-xs text-muted-foreground">{otherPartyName}</span>
      )}
      <div className={cn('flex items-center gap-1', message.sentByMe ? 'flex-row-reverse' : 'flex-row')}>
        <div
          className={cn(
            'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
            message.sentByMe
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm bg-muted text-foreground',
          )}
        >
          {message.content}
        </div>
        {!message.sentByMe && onReport && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-7 shrink-0 text-muted-foreground transition-opacity',
              hovered ? 'opacity-100' : 'opacity-0',
            )}
            onClick={onReport}
            aria-label="Report message"
            tabIndex={-1}
          >
            <Flag className="size-3.5" />
          </Button>
        )}
      </div>
      <span className="px-1 text-xs text-muted-foreground">{timeLabel}</span>
    </div>
  )
}

function ChatInterface({ threadId, profileId }: { threadId: string; profileId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: thread } = useSuspenseQuery(threadDetailQueryOptions(threadId, profileId))

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [thread.messages.length])

  const send = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await api.threads({ threadId }).messages.post({ profileId, content })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setDraft('')
      void queryClient.invalidateQueries({ queryKey: ['threads', 'detail', threadId, profileId] })
      void queryClient.invalidateQueries({ queryKey: ['threads', profileId] })
    },
  })

  const handleSend = () => {
    const trimmed = draft.trim()
    if (!trimmed || send.isPending) return
    send.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isPostOwner = thread.myRole === 'post_owner'

  return (
    <main className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={() => router.navigate({ to: '/messages' })}
          aria-label="Back to messages"
        >
          <ArrowLeft className="size-4" />
        </Button>

        {/* Avatar */}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
          {getInitials(thread.otherPartyName)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{thread.otherPartyName}</p>
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs text-muted-foreground">{thread.postTitle}</p>
            {isPostOwner && !thread.postDeleted && (
              <Badge
                variant="outline"
                className="h-4 shrink-0 border-muted-foreground/40 px-1 text-[10px] text-muted-foreground"
              >
                Your post
              </Badge>
            )}
            {thread.postDeleted && (
              <Badge variant="outline" className="mt-0.5 text-xs text-muted-foreground">
                Post deleted
              </Badge>
            )}
          </div>
        </div>

        {!thread.postDeleted && (
          <Link
            to="/posts/$postId"
            params={{ postId: thread.postId }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium',
              'text-foreground hover:bg-accent transition-colors no-underline',
            )}
          >
            <ExternalLink className="size-3.5" />
            View post
          </Link>
        )}
      </div>

      {/* Archived banner */}
      {thread.postDeleted && (
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground shrink-0">
          <Trash2 className="size-4 shrink-0" />
          <span>The post for this conversation has been deleted. This thread is read-only.</span>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4 min-h-0">
        {thread.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </p>
        )}
        {thread.messages.map((msg) => (
          <MessageBubble
            key={msg.messageId}
            message={msg}
            otherPartyName={thread.otherPartyName}
            onReport={!msg.sentByMe && !isPostOwner ? () => setReportingMessageId(msg.messageId) : undefined}
          />
        ))}
      </div>

      {/* Input */}
      <div className="border-t bg-card p-3 shrink-0">
        {thread.postDeleted ? (
          <p className="py-1 text-center text-sm text-muted-foreground">
            Replies are disabled for archived threads.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                placeholder="Write a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="max-h-36 min-h-10 resize-none"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!draft.trim() || send.isPending}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            </div>
            {send.isError && (
              <p className="mt-1 text-xs text-destructive">Failed to send. Please try again.</p>
            )}
          </>
        )}
      </div>

      <Dialog
        open={reportingMessageId !== null}
        onOpenChange={(open) => { if (!open) setReportingMessageId(null) }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
          </DialogHeader>
          <ReportForm
            postId={thread.postId}
            onSuccess={() => setReportingMessageId(null)}
            onCancel={() => setReportingMessageId(null)}
          />
        </DialogContent>
      </Dialog>
    </main>
  )
}

function ThreadPage() {
  const { threadId } = Route.useParams()
  const { activeProfile } = useActiveUser()

  if (!activeProfile) {
    return <ThreadPageSkeleton />
  }

  return (
    <Suspense fallback={<ThreadPageSkeleton />}>
      <ChatInterface threadId={threadId} profileId={activeProfile.userProfileId} />
    </Suspense>
  )
}
