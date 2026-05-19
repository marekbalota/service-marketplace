import { useTranslation } from 'react-i18next'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

export function PostTypeBadge({ postType }: { postType: 'OFFER' | 'REQUEST' }) {
  const { t } = useTranslation()
  const isOffer = postType === 'OFFER'
  return (
    <Badge
      variant={isOffer ? 'default' : 'outline'}
      className={cn(
        isOffer
          ? 'bg-offer-bg text-offer-fg hover:bg-offer-bg'
          : 'border-request-border text-request-fg',
      )}
    >
      {isOffer ? t('posts.badge.offer') : t('posts.badge.request')}
    </Badge>
  )
}
