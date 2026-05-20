import { useState } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { ReviewCard, type ReviewType } from './ReviewCard'
import { ReviewForm } from './ReviewForm'

export function PostReviewsCard({ postId }: { postId: string }) {
  const { t } = useTranslation()
  const { data: post } = useQuery(postDetailQueryOptions(postId))
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const queryClient = useQueryClient()

  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

  const isOwner = activeProfile?.userProfileId === post?.authorId
  const isAuthenticated = user != null

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

  if (!post) return null

  const hasReviewed = post.reviews.some(
    (r: { reviewerId: string }) => r.reviewerId === activeProfile?.userProfileId,
  )
  const showReviewButton = !isOwner && activeProfile && !hasReviewed

  return (
    <>
      <Card className="lg:col-span-2 lg:row-start-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {t('posts.detail.reviews', { count: post.reviewCount })}
            </h2>
            {showReviewButton && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowReviewForm(true)}
              >
                <Star className="size-4" />
                {t('posts.detail.leaveReview')}
              </Button>
            )}
            {hasReviewed && (
              <p className="text-center text-sm text-muted-foreground">
                {t('posts.detail.alreadyReviewed')}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.reviews.length === 0 ? (
            <EmptyState message={t('posts.detail.noReviews')} />
          ) : (
            <div className="space-y-4">
              {post.reviews.map((review: ReviewType) => (
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
        onOpenChange={(open) => {
          if (!open) setShowReviewForm(false)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('posts.detail.leaveReview')}</DialogTitle>
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
        onOpenChange={(open) => {
          if (!open) setReportingReviewId(null)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('posts.detail.reportReview')}</DialogTitle>
          </DialogHeader>
          {reportingReviewId && (
            <ReportForm
              targetType="REVIEW"
              onReport={async (data) => {
                const { error } = await api.reviews({ id: reportingReviewId }).reports.post(data)
                if (error) throw wrapEdenError(error, 'Failed to submit report.')
              }}
              onSuccess={() => {
                void queryClient.invalidateQueries({
                  queryKey: hasReportedReviewQueryOptions(
                    reportingReviewId!,
                    activeProfile?.userProfileId ?? '',
                  ).queryKey,
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
        title={t('posts.detail.deleteReviewTitle')}
        description={t('posts.detail.deleteReviewMessage')}
        confirmLabel={t('common.delete')}
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingReviewId) deleteMutation.mutate(deletingReviewId)
        }}
        onClose={() => setDeletingReviewId(null)}
      />
    </>
  )
}
