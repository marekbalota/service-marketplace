import { useState } from 'react'
import { wrapEdenError } from '#/lib/api-error'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Flag, Pencil } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { api } from '#/api'
import { useCurrentUser } from '#/lib/queries/users'
import { useActiveProfile } from '#/context/activeProfile'
import { FavouriteButton } from '#/components/FavouriteButton'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { PostTypeBadge } from '#/components/PostTypeBadge'
import { ReportForm } from '#/components/ReportForm'
import { cn } from '#/lib/utils'
import { postDetailQueryOptions } from '#/lib/queries/posts'
import { hasReportedPostQueryOptions } from '../-queries/posts'

export function PostInfoCard({ postId }: { postId: string }) {
  const { t } = useTranslation()
  const { data: post } = useQuery(postDetailQueryOptions(postId))
  const { data: user } = useCurrentUser()
  const { activeProfile } = useActiveProfile()
  const queryClient = useQueryClient()

  const [showReportForm, setShowReportForm] = useState(false)

  const isOwner = activeProfile?.userProfileId === post?.authorId
  const isAuthenticated = user != null

  const { data: hasReported } = useQuery({
    ...hasReportedPostQueryOptions(postId, activeProfile?.userProfileId ?? ''),
    enabled: !!post && isAuthenticated && !isOwner && !!activeProfile?.userProfileId,
  })

  if (!post) return null

  const RATE_LABELS: Record<string, string> = {
    HOURLY: t('posts.rateType.perHour'),
    DAILY: t('posts.rateType.perDay'),
    FIXED: t('posts.rateType.fixed'),
  }

  const price = post.price ? parseFloat(post.price) : null
  const rateLabel = post.rateType ? RATE_LABELS[post.rateType] : null

  return (
    <>
      <Card className="gap-2 lg:col-span-2">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-semibold">{post.postTitle}</h1>
            <div className="flex items-center gap-2">
              {isAuthenticated && !isOwner && <FavouriteButton postId={postId} />}
              {isAuthenticated && !isOwner && !!activeProfile && !hasReported && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={t('posts.detail.reportPost')}
                  onClick={() => setShowReportForm(true)}
                >
                  <Flag className="size-4" />
                </Button>
              )}
              {isOwner && (
                <Link
                  to="/edit-post/$postId"
                  params={{ postId }}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'shrink-0 gap-2',
                  )}
                >
                  <Pencil className="size-4" />
                  {t('common.edit')}
                </Link>
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
          <h2 className="mb-2 text-lg font-medium">{t('posts.detail.description')}</h2>
          <p className="text-muted-foreground">{post.description}</p>
        </CardContent>
      </Card>

      <Dialog
        open={showReportForm}
        onOpenChange={(open) => {
          if (!open) setShowReportForm(false)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('posts.detail.reportPost')}</DialogTitle>
          </DialogHeader>
          {activeProfile && (
            <ReportForm
              targetType="POST"
              descriptionRequired
              onReport={async (data) => {
                const { error } = await api.posts({ id: postId }).reports.post(data)
                if (error) throw wrapEdenError(error, 'Failed to submit report.')
              }}
              onSuccess={() => {
                void queryClient.invalidateQueries({
                  queryKey: hasReportedPostQueryOptions(postId, activeProfile.userProfileId)
                    .queryKey,
                })
                setShowReportForm(false)
              }}
              onCancel={() => setShowReportForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
