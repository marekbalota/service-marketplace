import { createFileRoute } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'

export const Route = createFileRoute('/_app/messages/')({
  component: MessagesIndexPage,
})

function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <MessageSquare className="mb-4 size-12 text-muted-foreground/30" />
      <p className="font-medium">Select a conversation</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose from your existing conversations on the left.
      </p>
    </div>
  )
}
