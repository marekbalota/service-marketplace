import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ReportForm } from '#/components/ReportForm'
import { api } from '#/api'
import { threadDetailQueryOptions, threadsQueryOptions, hasReportedMessageQueryOptions } from '../../-queries/threads'
import { ThreadHeader } from './ThreadHeader'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

export function ChatInterface({ threadId, profileId }: { threadId: string; profileId: string }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)

  const { data: thread } = useSuspenseQuery(threadDetailQueryOptions(threadId, profileId))

  const send = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await api.threads({ threadId }).messages.post({ profileId, content })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setDraft('')
      void queryClient.invalidateQueries({ queryKey: threadDetailQueryOptions(threadId, profileId).queryKey })
      void queryClient.invalidateQueries({ queryKey: threadsQueryOptions(profileId).queryKey })
    },
  })

  const handleSend = () => {
    const trimmed = draft.trim()
    if (!trimmed || send.isPending) return
    send.mutate(trimmed)
  }

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <ThreadHeader
        otherPartyName={thread.otherPartyName}
        postTitle={thread.postTitle}
        postId={thread.postId}
        postDeleted={thread.postDeleted}
        myRole={thread.myRole}
      />

      {thread.postDeleted && (
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground shrink-0">
          <Trash2 className="size-4 shrink-0" />
          <span>The post for this conversation has been deleted. This thread is read-only.</span>
        </div>
      )}

      <MessageList
        messages={thread.messages}
        otherPartyName={thread.otherPartyName}
        onReport={setReportingMessageId}
      />

      {thread.postDeleted ? (
        <div className="border-t bg-card p-3 shrink-0">
          <p className="py-1 text-center text-sm text-muted-foreground">
            Replies are disabled for archived threads.
          </p>
        </div>
      ) : (
        <MessageInput
          draft={draft}
          isPending={send.isPending}
          isError={send.isError}
          onChange={setDraft}
          onSend={handleSend}
        />
      )}

      <Dialog
        open={reportingMessageId !== null}
        onOpenChange={(open) => { if (!open) setReportingMessageId(null) }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Report Message</DialogTitle>
          </DialogHeader>
          {reportingMessageId && (
            <ReportForm
              targetType="MESSAGE"
              entityName="message"
              onReport={async (data) => {
                const { error } = await api.threads({ threadId }).messages({ messageId: reportingMessageId }).reports.post(data)
                if (error) throw error
              }}
              onSuccess={() => {
                void queryClient.invalidateQueries({ queryKey: hasReportedMessageQueryOptions(reportingMessageId!, profileId).queryKey })
                setReportingMessageId(null)
              }}
              onCancel={() => setReportingMessageId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
