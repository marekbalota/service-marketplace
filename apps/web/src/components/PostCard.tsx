import { MapPin, User, DollarSign, Star } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { useState } from 'react'
import type { Post } from '#/types'

const RATE_LABELS: Record<string, string> = {
  HOURLY: '/hr',
  DAILY: '/day',
  FIXED: 'fixed',
}

export function PostCard({ post }: { post: Post }) {
  const [favorited, setFavorited] = useState(false)
  const isOffer = post.postType === 'OFFER'
  const primaryCategory = post.categories[0]?.name ?? null
  const price = post.price ? parseFloat(post.price) : null
  const rateLabel = post.rateType ? RATE_LABELS[post.rateType] : null

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="mb-2">{post.postTitle}</h3>
            <div className="flex items-center gap-2">
              {primaryCategory && (
                <Badge variant="secondary">{primaryCategory}</Badge>
              )}
              <Badge
                variant={isOffer ? 'default' : 'outline'}
                className={
                  isOffer
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'border-blue-500 text-blue-700'
                }
              >
                {isOffer ? 'Offering' : 'Requesting'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setFavorited((f) => !f)
              }}
            >
              <Star
                className={`size-5 ${favorited ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            </Button>
            {price !== null && (
              <div className="flex items-center gap-1">
                <DollarSign className="size-5 text-green-600" />
                <span className="font-semibold text-green-600">
                  {price}
                  {rateLabel && <span className="text-sm"> {rateLabel}</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground">{post.description}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="size-4" />
            <span>{post.authorName}</span>
          </div>
          {post.categories.length > 1 && (
            <div className="flex items-center gap-1">
              <MapPin className="size-4" />
              <span>{post.categories.slice(1).map((c) => c.name).join(', ')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
