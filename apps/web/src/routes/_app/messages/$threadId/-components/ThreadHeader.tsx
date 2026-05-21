import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Link, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { ProfileAvatar } from '#/components/ProfileAvatar'

type ThreadHeaderProps = {
  otherPartyName: string
  postTitle: string
  postId: string
  postDeleted: boolean
  myRole: 'initiator' | 'post_owner'
}

export function ThreadHeader({
  otherPartyName,
  postTitle,
  postId,
  postDeleted,
  myRole,
}: ThreadHeaderProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const isPostOwner = myRole === 'post_owner'

  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        onClick={() => router.navigate({ to: '/messages' })}
        aria-label={t('messages.backToMessages')}
      >
        <ArrowLeft className="size-4" />
      </Button>

      <ProfileAvatar name={otherPartyName} className="size-9 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{otherPartyName}</p>
        <div className="flex items-center gap-1.5">
          <p className="truncate text-xs text-muted-foreground">{postTitle}</p>
          {isPostOwner && !postDeleted && (
            <Badge
              variant="outline"
              className="h-4 shrink-0 border-muted-foreground/40 px-1 text-[10px] text-muted-foreground"
            >
              {t('messages.yourPost')}
            </Badge>
          )}
          {postDeleted && (
            <Badge variant="outline" className="mt-0.5 text-xs text-muted-foreground">
              {t('messages.postDeleted')}
            </Badge>
          )}
        </div>
      </div>

      {!postDeleted && (
        <Link
          to="/posts/$postId"
          params={{ postId }}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 no-underline')}
        >
          <ExternalLink className="size-3.5" />
          {t('messages.viewPost')}
        </Link>
      )}
    </div>
  )
}
