import { useState } from 'react'
import { Star, Trash2, Flag } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/utils'

export type ReviewType = {
  reviewId: string
  reviewerName: string
  createdAt: Date
  rating: number
  reviewDescription: string | null
  reviewerId: string
}

export function ReviewCard({
  review,
  myProfileId,
  onDelete,
  isDeleting,
  onReport,
  isAuthenticated,
}: {
  review: ReviewType
  myProfileId: string | null
  onDelete: (id: string) => void
  isDeleting: boolean
  onReport: (id: string) => void
  isAuthenticated: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const isMyReview = review.reviewerId === myProfileId
  const canReport = isAuthenticated && !isMyReview

  return (
    <Card onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <CardContent>
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="font-medium">{review.reviewerName}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn('size-4', star <= review.rating ? 'fill-star-filled text-star-filled' : 'text-star-empty')}
                />
              ))}
            </div>
            {canReport && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'size-7 shrink-0 text-muted-foreground transition-opacity',
                  hovered ? 'opacity-100' : 'opacity-0',
                )}
                onClick={() => onReport(review.reviewId)}
                aria-label="Report review"
                tabIndex={-1}
              >
                <Flag className="size-3.5" />
              </Button>
            )}
            {isMyReview && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                onClick={() => onDelete(review.reviewId)}
                disabled={isDeleting}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
        {review.reviewDescription && (
          <p className="text-muted-foreground">{review.reviewDescription}</p>
        )}
      </CardContent>
    </Card>
  )
}
