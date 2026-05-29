import { MapPin, User, DollarSign, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useLocale } from '#/lib/useLocale'
import { useTranslation } from 'react-i18next'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { useCurrentUser } from '#/lib/queries/users'
import { FavouriteButton } from '#/components/FavouriteButton'
import { PostTypeBadge } from '#/components/PostTypeBadge'
import type { api as ApiType } from '#/api'

export type Post = NonNullable<
  Awaited<ReturnType<typeof ApiType.posts.get>>['data']
>['items'][number]

const RATE_LABELS: Record<string, string> = {
  HOURLY: '/hr',
  DAILY: '/day',
  FIXED: 'fixed',
}

type PostCardProps = {
  post: Post
  onDelete?: () => void
  deleteDisabled?: boolean
  isFavourite?: boolean
  onFavouriteToggle?: () => void
  favouriteDisabled?: boolean
  showFavouriteButton?: boolean
}

export function PostCard({
  post,
  onDelete,
  deleteDisabled,
  isFavourite,
  onFavouriteToggle,
  favouriteDisabled,
  showFavouriteButton = true,
}: PostCardProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data: user } = useCurrentUser()
  const isAuthenticated = user != null
  const price = post.price ? parseFloat(post.price) : null
  const rateLabel = post.rateType ? RATE_LABELS[post.rateType] : null

  return (
    <Link to="/$locale/posts/$postId" params={{ locale, postId: post.postId }} className="block h-full">
      <Card className="flex h-full cursor-pointer flex-col gap-3 transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="relative pr-10">
            <h3 className="line-clamp-1">{post.postTitle}</h3>
            <div className="absolute right-0 top-0 flex items-center gap-2">
              {onDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('posts.deletePost')}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={deleteDisabled}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  <Trash2 className="size-5" />
                </Button>
              ) : showFavouriteButton && isAuthenticated ? (
                <FavouriteButton
                  postId={post.postId}
                  initialIsFavourite={isFavourite}
                  onToggle={onFavouriteToggle}
                  disabled={favouriteDisabled}
                />
              ) : null}
            </div>
          </div>
          {/* Badge row spans full card width — capped at 2 lines */}
          <div className="mt-2 flex max-h-14 flex-wrap items-center gap-2 overflow-hidden">
            <PostTypeBadge postType={post.postType} />
            {post.categories.map((c) => (
              <Badge key={c.name} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-1">
          <p className="line-clamp-4 text-muted-foreground">{post.description}</p>
          {/* mt-auto pushes footer to bottom, filling any blank space from equal-height rows */}
          <div className="mt-auto flex items-center justify-between pt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <User className="size-4" />
                <span>{post.authorName}</span>
              </div>
              {post.location?.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  <span>{post.location.city}</span>
                </div>
              )}
            </div>
            {price !== null && (
              <div className="flex items-center gap-1">
                <DollarSign className="size-4 text-price" />
                <span className="font-semibold text-price">
                  {price}
                  {rateLabel && <span className="font-normal"> {rateLabel}</span>}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
