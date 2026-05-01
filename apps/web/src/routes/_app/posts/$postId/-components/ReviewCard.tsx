import { Star, Trash2, Flag } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { cn } from '#/lib/utils'
import { useActiveProfile } from '#/context/activeProfile'
import { hasReportedReviewQueryOptions } from '../-queries/posts'

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
  onDelete,
  isDeleting,
  onReport,
  isAuthenticated,
}: {
  review: ReviewType
  onDelete: (id: string) => void
  isDeleting: boolean
  onReport: (id: string) => void
  isAuthenticated: boolean
}) {
  const { activeProfile } = useActiveProfile()
  const profileId = activeProfile?.userProfileId

  const isMyReview = review.reviewerId === profileId
  const canReport = isAuthenticated && !isMyReview

  const { data: hasReported = false } = useQuery({
    ...hasReportedReviewQueryOptions(review.reviewId, profileId ?? ''),
    enabled: canReport && !!profileId,
  })

  return (
    <Card className="group">
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
            {canReport && !hasReported && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'size-7 shrink-0 text-muted-foreground transition-opacity',
                  'opacity-0 group-hover:opacity-100',
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
