import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { DollarSign, MapPin, Star, Pencil, Flag } from 'lucide-react'
import { api } from '#/api'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { BackButton } from '#/components/BackButton'
import { EmptyState } from '#/components/EmptyState'
import { FavouriteButton } from '#/components/FavouriteButton'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { formatLocation } from '#/lib/format'
import { PostTypeBadge } from '#/components/PostTypeBadge'
import { ReportForm } from '#/components/ReportForm'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { postDetailQueryOptions, hasReportedPostQueryOptions, hasReportedReviewQueryOptions } from './-queries/posts'
import { SendMessageSection } from './-components/SendMessageSection'
import { ReviewCard } from './-components/ReviewCard'
import { ReviewForm } from './-components/ReviewForm'

export const Route = createFileRoute('/_app/posts/$postId')({
  loader: async ({ context: { queryClient }, params: { postId } }) => {
    await queryClient.ensureQueryData(postDetailQueryOptions(postId))
  },
  pendingComponent: PostDetailSkeleton,
  component: PostDetailPage,
})

function PostDetailSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <Skeleton className="mb-4 h-9 w-24" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="space-y-3">
              <Skeleton className="h-7 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-28" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-5 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

const RATE_LABELS: Record<string, string> = {
  HOURLY: '/hr',
  DAILY: '/day',
  FIXED: 'fixed',
}

function PostDetailPage() {
  const { postId } = Route.useParams()
  const { data: post } = useSuspenseQuery(postDetailQueryOptions(postId))
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isOwner = activeProfile?.userProfileId === post.authorId
  const isAuthenticated = user != null
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [showReportForm, setShowReportForm] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null)

  const hasReviewed = post.reviews.some(
    (r: { reviewerId: string }) => r.reviewerId === activeProfile?.userProfileId
  )

  const { data: hasReported } = useQuery({
    ...hasReportedPostQueryOptions(postId, activeProfile?.userProfileId ?? ''),
    enabled: isAuthenticated && !isOwner && !!activeProfile?.userProfileId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await api.reviews({ id: reviewId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      setDeletingReviewId(null)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  const price = post.price ? parseFloat(post.price) : null
  const rateLabel = post.rateType ? RATE_LABELS[post.rateType] : null
  const locationText = post.location ? formatLocation(post.location) : null
  const showReviewButton = !isOwner && activeProfile && !hasReviewed

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <BackButton onClick={() => router.history.back()} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Post info card */}
          <Card className="gap-2">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-semibold">{post.postTitle}</h1>
                <div className="flex items-center gap-2">
                  {isAuthenticated && !isOwner && (
                    <FavouriteButton postId={postId} />
                  )}
                  {isAuthenticated && !isOwner && !!activeProfile && !hasReported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setShowReportForm(true)}
                    >
                      <Flag className="size-4" />
                    </Button>
                  )}
                  {isOwner && (
                    <Button variant="outline" size="sm" className="shrink-0 gap-2" disabled>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PostTypeBadge postType={post.postType} />
                <div className="flex flex-wrap gap-2">
                  {post.categories.map((category) => (
                    <Badge key={category.categoryId} variant="secondary">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {price !== null && (
                <div className="flex items-center gap-1 pt-2">
                  <DollarSign className="size-6 text-price" />
                  <span className="text-2xl font-semibold text-price">
                    {price}
                    {rateLabel && <span className="text-base"> {rateLabel}</span>}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <h2 className="mb-2 text-lg font-medium">Description</h2>
              <p className="text-muted-foreground">{post.description}</p>
            </CardContent>
          </Card>

          {/* Reviews card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Reviews ({post.reviewCount})</h2>
                {showReviewButton && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowReviewForm(true)}>
                    <Star className="size-4" />
                    Leave a Review
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasReviewed && (
                <p className="text-center text-sm text-muted-foreground">
                  You have already reviewed this post
                </p>
              )}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <h2 className="text-base font-medium">Post Details</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link
                to="/profiles/$profileId"
                params={{ profileId: post.authorId }}
                className="group -mx-1 flex items-center gap-3 rounded-lg px-1 py-1 no-underline transition-colors hover:bg-accent"
              >
                <ProfileAvatar name={post.authorName} className="size-10 shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Posted by</p>
                  <p className="font-medium group-hover:text-primary">{post.authorName}</p>
                </div>
              </Link>

              {locationText && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <MapPin className="size-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{locationText}</p>
                    </div>
                  </div>
                </>
              )}

              {post.rateType && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <DollarSign className="size-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Rate Type</p>
                      <p className="font-medium">
                        {post.rateType.charAt(0) + post.rateType.slice(1).toLowerCase()}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {post.reviewCount > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Star className="size-5 shrink-0 fill-star-filled text-star-filled" />
                    <div>
                      <p className="text-sm text-muted-foreground">Rating</p>
                      <p className="font-medium">
                        {post.averageRating!.toFixed(1)} ({post.reviewCount}{' '}
                        {post.reviewCount === 1 ? 'review' : 'reviews'})
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {!isOwner && activeProfile && (
            <SendMessageSection postId={postId} profileId={activeProfile.userProfileId} />
          )}
        </div>
      </div>

      {/* Leave a Review Dialog */}
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

      {/* Report Post Dialog */}
      <Dialog
        open={showReportForm}
        onOpenChange={(open) => { if (!open) setShowReportForm(false) }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
          </DialogHeader>
          {activeProfile && (
            <ReportForm
              targetType="POST"
              entityName="post"
              descriptionRequired
              onReport={async (data) => {
                const { error } = await api.posts({ id: postId }).reports.post(data)
                if (error) throw error
              }}
              onSuccess={() => {
                void queryClient.invalidateQueries({
                  queryKey: hasReportedPostQueryOptions(postId, activeProfile.userProfileId).queryKey,
                })
                setShowReportForm(false)
              }}
              onCancel={() => setShowReportForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Report Review Dialog */}
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
                if (error) throw error
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
    </main>
  )
}
