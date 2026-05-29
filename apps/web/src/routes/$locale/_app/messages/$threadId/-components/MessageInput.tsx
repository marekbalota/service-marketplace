import { useRef } from 'react'
import { Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'

export function MessageInput({
  draft,
  isPending,
  isError,
  onChange,
  onSend,
}: {
  draft: string
  isPending: boolean
  isError: boolean
  onChange: (value: string) => void
  onSend: () => void
}) {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="border-t bg-card p-3 shrink-0">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          placeholder={t('messages.writePlaceholder')}
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="max-h-36 min-h-10 resize-none"
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={onSend}
          disabled={!draft.trim() || isPending}
          aria-label={t('messages.send')}
        >
          <Send className="size-5" />
        </Button>
      </div>
      {isError && <p className="mt-1 text-xs text-destructive">{t('messages.sendFailed')}</p>}
    </div>
  )
}
