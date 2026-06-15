import { Flag } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { useActiveProfile } from '#/context/activeProfile'
import { hasReportedMessageQueryOptions } from '../../-queries/threads'

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
  const { t } = useTranslation()
  const { activeProfile } = useActiveProfile()
  const profileId = activeProfile?.userProfileId

  const d = typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt
  const timeLabel = d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const { data: hasReported = false } = useQuery({
    ...hasReportedMessageQueryOptions(message.messageId, profileId ?? ''),
    enabled: !message.sentByMe && !!profileId,
  })

  return (
    <div
      className={cn('group flex flex-col gap-1', message.sentByMe ? 'items-end' : 'items-start')}
    >
      {!message.sentByMe && (
        <span className="px-1 text-xs text-muted-foreground">{otherPartyName}</span>
      )}
      <div
        className={cn(
          'flex w-full items-center gap-1',
          message.sentByMe ? 'flex-row-reverse' : 'flex-row',
        )}
      >
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
        {!message.sentByMe && onReport && !hasReported && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            onClick={onReport}
            aria-label={t('messages.reportMessage')}
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
