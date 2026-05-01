import { useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'

type Message = {
  messageId: string
  content: string
  createdAt: Date | string
  sentByMe: boolean
  readAt: Date | string | null
}

export function MessageList({
  messages,
  otherPartyName,
  onReport,
}: {
  messages: Message[]
  otherPartyName: string
  onReport: (messageId: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages.length])

  return (
    <div ref={containerRef} className="flex-1 space-y-4 overflow-y-auto p-4 min-h-0">
      {messages.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No messages yet. Say hello!
        </p>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.messageId}
          message={msg}
          otherPartyName={otherPartyName}
          onReport={!msg.sentByMe ? () => onReport(msg.messageId) : undefined}
        />
      ))}
    </div>
  )
}
