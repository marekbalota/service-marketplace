import { useState } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { Link, useRouter } from '@tanstack/react-router'
import { useLocale } from '#/lib/useLocale'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '#/api'
import { Button, buttonVariants } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Skeleton } from '#/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '#/components/ui/dialog'
import { cn } from '#/lib/utils'
import { existingThreadQueryOptions } from '../-queries/threads'
import { useCurrentUser } from '#/lib/queries/users'

export function SendMessageSection({ postId, profileId }: { postId: string; profileId: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { data: currentUser } = useCurrentUser()
  const isImpersonating = !!currentUser?.impersonatedBy

  const { data: threads, isLoading } = useQuery({
    ...existingThreadQueryOptions(postId, profileId),
    enabled: !!currentUser && !isImpersonating,
  })
  const existingThread = threads?.[0] ?? null

  const send = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.threads.post({ profileId, postId, content: draft })
      if (error) throw wrapEdenError(error, 'Failed to send message.')
      return data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void router.navigate({
        to: '/$locale/messages/$threadId',
        params: { locale, threadId: (data as { threadId: string }).threadId },
      })
    },
  })

  function handleClose() {
    setOpen(false)
    setDraft('')
  }

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  if (isImpersonating) {
    return (
      <div>
        <Tooltip>
          <TooltipTrigger render={<span className="w-full" />}>
            <Button className="w-full gap-2" disabled>
              <MessageSquare className="size-4" />
              {t('posts.detail.sendMessage')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('posts.detail.impersonationMessage')}</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  if (existingThread) {
    return (
      <Link
        to="/$locale/messages/$threadId"
        params={{ locale, threadId: existingThread.threadId }}
        className={cn(buttonVariants(), 'w-full gap-2')}
      >
        <MessageSquare className="size-4" />
        {t('posts.detail.goToChat')}
      </Link>
    )
  }

  return (
    <>
      <Button className="w-full gap-2" onClick={() => setOpen(true)}>
        <MessageSquare className="size-4" />
        {t('posts.detail.sendMessage')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose()
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('posts.detail.sendMessage')}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={t('posts.detail.messagePlaceholder')}
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            rows={4}
            className="resize-none"
          />
          {send.isError && (
            <p className="text-sm text-destructive">{t('posts.detail.failedMessage')}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={send.isPending}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!draft.trim() || send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? t('posts.detail.sending') : t('posts.detail.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
