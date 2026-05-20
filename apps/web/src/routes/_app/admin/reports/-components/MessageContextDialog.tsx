import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '#/api'
import { cn } from '#/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'

type Props = {
  reportId: string
  open: boolean
  onClose: () => void
}

export function MessageContextDialog({ reportId, open, onClose }: Props) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'reports', reportId, 'message-context'],
    queryFn: async () => {
      const { data, error } = await api.admin.reports({ id: reportId })['message-context'].get()
      if (error) throw error
      return data
    },
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin.reports.messageContext')}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">
            {t('admin.reports.messageContextError')}
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {data?.messages.map((msg) => (
              <div
                key={msg.messageId}
                className={cn(
                  'p-3 rounded-lg text-sm',
                  msg.isReported
                    ? 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20'
                    : 'bg-muted',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium truncate">{msg.senderName}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground break-words">{msg.content}</p>
                {msg.isReported && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">
                    {t('admin.reports.reportedMessage')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
