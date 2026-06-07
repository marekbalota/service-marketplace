import { createFileRoute } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/$locale/_app/messages/')({
  component: MessagesIndexPage,
})

function MessagesIndexPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <MessageSquare className="mb-4 size-12 text-muted-foreground/30" />
      <p className="font-medium">{t('messages.selectConversation')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('messages.selectConversationHint')}</p>
    </div>
  )
}
