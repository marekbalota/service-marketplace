import { useState } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api } from '#/api'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { EmptyState } from '#/components/EmptyState'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { ReportForm } from '#/components/ReportForm'
import { postDetailQueryOptions } from '#/lib/queries/posts'
import { hasReportedReviewQueryOptions } from '../-queries/posts'
import { ReviewCard } from './ReviewCard'
import { ReviewForm } from './ReviewForm'

export function PostReviewsCard({ postId }: { postId: string }) {
  const { data: post } = useSuspenseQuery(postDetailQueryOptions(postId))
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const queryClient = useQueryClient()
  const isOwner = activeProfile?.userProfileId === post.authorId
  const isAuthenticated = user != null
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

  const hasReviewed = post.reviews.some(
    (r: { reviewerId: string }) => r.reviewerId === activeProfile?.userProfileId
  )
  const showReviewButton = !isOwner && activeProfile && !hasReviewed

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await api.reviews({ id: reviewId }).delete()
      if (error) throw wrapEdenError(error, 'Failed to delete review.')
    },
    onSuccess: () => {
      setDeletingReviewId(null)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  return (
    <>
      <Card className="lg:col-span-2 lg:row-start-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Reviews ({post.reviewCount})</h2>
            {showReviewButton && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowReviewForm(true)}>
                <Star className="size-4" />
                Leave a Review
              </Button>
            )}
            {hasReviewed && (
              <p className="text-center text-sm text-muted-foreground">
                You have already reviewed this post
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.reviews.length === 0 ? (
            <EmptyState message="No reviews yet." />
          ) : (
            <div className="space-y-4">
              {post.reviews.map((review: { reviewId: string; reviewerName: string; createdAt: Date; rating: number; reviewDescription: string | null; reviewerId: string }) => (
                <ReviewCard
                  key={review.reviewId}
                  review={review}
                  onDelete={(id) => setDeletingReviewId(id)}
                  isDeleting={deleteMutation.isPending}
                  onReport={(id) => setReportingReviewId(id)}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showReviewForm}
        onOpenChange={(open) => { if (!open) setShowReviewForm(false) }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          {activeProfile && (
            <ReviewForm
              postId={postId}
              onSuccess={() => setShowReviewForm(false)}
              onCancel={() => setShowReviewForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={reportingReviewId !== null}
        onOpenChange={(open) => { if (!open) setReportingReviewId(null) }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
          </DialogHeader>
          {reportingReviewId && (
            <ReportForm
              targetType="REVIEW"
              entityName="review"
              onReport={async (data) => {
                const { error } = await api.reviews({ id: reportingReviewId }).reports.post(data)
                if (error) throw wrapEdenError(error, 'Failed to submit report.')
              }}
              onSuccess={() => {
                void queryClient.invalidateQueries({
                  queryKey: hasReportedReviewQueryOptions(reportingReviewId!, activeProfile?.userProfileId ?? '').queryKey,
                })
                setReportingReviewId(null)
              }}
              onCancel={() => setReportingReviewId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingReviewId !== null}
        title="Delete review?"
        description="This will permanently remove your review. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => { if (deletingReviewId) deleteMutation.mutate(deletingReviewId) }}
        onClose={() => setDeletingReviewId(null)}
      />
    </>
  )
}
