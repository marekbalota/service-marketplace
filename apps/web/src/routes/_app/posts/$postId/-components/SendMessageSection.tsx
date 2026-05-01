import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api'
import { Button, buttonVariants } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { existingThreadQueryOptions } from '../-queries/threads'

export function SendMessageSection({ postId, profileId }: { postId: string; profileId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const { data: threads, isLoading } = useQuery(existingThreadQueryOptions(postId, profileId))
  const existingThread = threads?.[0] ?? null

  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.threads.post({ profileId, postId, content: draft })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void router.navigate({ to: '/messages/$threadId', params: { threadId: (data as { threadId: string }).threadId } })
    },
  })

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  if (existingThread) {
    return (
      <Link
        to="/messages/$threadId"
        params={{ threadId: existingThread.threadId }}
        className={cn(buttonVariants(), 'w-full gap-2')}
      >
        <MessageSquare className="size-4" />
        Go to Chat
      </Link>
    )
  }

  return (
    <div className="space-y-2">
      {!open && (
        <Button className="w-full gap-2" onClick={() => setOpen(true)}>
          <MessageSquare className="size-4" />
          Send Message
        </Button>
      )}
      {open && (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <Textarea
            placeholder="Write your message..."
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            rows={3}
            className="resize-none bg-card"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!draft.trim() || send.isPending}
              onClick={() => send.mutate()}
            >
              {send.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
          {send.isError && (
            <p className="text-sm text-destructive">Failed to send message. Please try again.</p>
          )}
        </div>
      )}
    </div>
  )
}
