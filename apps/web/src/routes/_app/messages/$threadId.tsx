import { createFileRoute, redirect, Link, useRouter } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ExternalLink, Send, Trash2 } from 'lucide-react'
import { authClient } from '#/auth'
import { api } from '#/api'
import { useActiveProfile } from '#/contexts/ActiveProfileContext'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Textarea } from '#/components/ui/textarea'
import { cn } from '#/lib/utils'

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
    <main className="flex h-[calc(100svh-4rem)] flex-col">
      <div className="border-b bg-card px-4 py-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-1 h-4 w-24" />
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

export function MessageBubble({ message, otherPartyName }: { message: Message; otherPartyName: string }) {
  const d = typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt
  const timeLabel = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={cn('flex flex-col gap-1', message.sentByMe ? 'items-end' : 'items-start')}>
      {!message.sentByMe && (
        <span className="px-1 text-xs text-muted-foreground">{otherPartyName}</span>
      )}
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
      <span className="px-1 text-xs text-muted-foreground">{timeLabel}</span>
    </div>
  )
}

function ChatInterface({ threadId, profileId }: { threadId: string; profileId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: thread } = useSuspenseQuery(threadDetailQueryOptions(threadId, profileId))

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.messages.length])

  const isOffer = thread.label === 'offer'

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

  return (
    <main className="flex h-[calc(100svh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => router.navigate({ to: '/messages' })}
          aria-label="Back to messages"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">
            {thread.otherPartyName} — {thread.postTitle}
          </p>
          {thread.postDeleted ? (
            <Badge variant="outline" className="mt-0.5 text-xs text-muted-foreground">
              Post deleted
            </Badge>
          ) : (
            <Badge
              variant={isOffer ? 'default' : 'outline'}
              className={cn(
                'mt-0.5 text-xs',
                isOffer
                  ? 'bg-offer-bg text-offer-fg hover:bg-offer-bg'
                  : 'border-request-border text-request-fg',
              )}
            >
              {thread.label}
            </Badge>
          )}
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
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
          <Trash2 className="size-4 shrink-0" />
          <span>The post for this conversation has been deleted. This thread is read-only.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {thread.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </p>
        )}
        {thread.messages.map((msg) => (
          <MessageBubble key={msg.messageId} message={msg} otherPartyName={thread.otherPartyName} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-card p-3">
        {thread.postDeleted ? (
          <p className="py-1 text-center text-sm text-muted-foreground">
            Replies are disabled for archived threads.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
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
    </main>
  )
}

function ThreadPage() {
  const { threadId } = Route.useParams()
  const { activeProfile } = useActiveProfile()

  if (!activeProfile) {
    return <ThreadPageSkeleton />
  }

  return (
    <ChatInterface
      threadId={threadId}
      profileId={activeProfile.userProfileId}
    />
  )
}
