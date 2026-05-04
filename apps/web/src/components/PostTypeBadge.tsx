import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

export function PostTypeBadge({ postType }: { postType: 'OFFER' | 'REQUEST' }) {
  const isOffer = postType === 'OFFER'
  return (
    <Badge
      variant={isOffer ? 'default' : 'outline'}
      className={cn(
        isOffer
          ? 'bg-offer-bg text-offer-fg hover:bg-offer-bg'
          : 'border-request-border text-request-fg'
      )}
    >
      {isOffer ? 'Offering' : 'Requesting'}
    </Badge>
  )
}
