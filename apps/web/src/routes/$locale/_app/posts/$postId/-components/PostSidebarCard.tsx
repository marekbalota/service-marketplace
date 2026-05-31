import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, MapPin, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useActiveProfile } from '#/context/activeProfile'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { formatLocation } from '#/lib/format'
import { postDetailQueryOptions } from '#/lib/queries/posts'
import { SendMessageSection } from './SendMessageSection'
import { useLocale } from '#/lib/useLocale'

export function PostSidebarCard({ postId }: { postId: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { data: post } = useQuery(postDetailQueryOptions(postId, locale))
  const { activeProfile } = useActiveProfile()

  if (!post) return null
  const isOwner = activeProfile?.userProfileId === post.authorId
  const locationText = post.location ? formatLocation(post.location) : null

  return (
    <div className="space-y-4 lg:col-start-3 lg:row-start-1 lg:row-span-2">
      <Card>
        <CardHeader>
          <h2 className="text-base font-medium">{t('posts.detail.postDetails')}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            to="/$locale/profiles/$profileId"
            params={{ locale, profileId: post.authorId }}
            className="group -mx-1 flex items-center gap-3 rounded-lg px-1 py-1 no-underline transition-colors hover:bg-accent"
          >
            <ProfileAvatar name={post.authorName} className="size-10 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">{t('posts.detail.postedBy')}</p>
              <p className="font-medium group-hover:text-primary">{post.authorName}</p>
            </div>
          </Link>

          {locationText && (
            <>
              <Separator />
              <div className="flex items-center gap-3">
                <MapPin className="size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('posts.detail.location')}</p>
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
                  <p className="text-sm text-muted-foreground">{t('posts.detail.rateType')}</p>
                  <p className="font-medium">
                    {t(
                      `posts.rateType.${post.rateType.toLowerCase()}` as
                        | 'posts.rateType.hourly'
                        | 'posts.rateType.daily'
                        | 'posts.rateType.fixed',
                    )}
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
                  <p className="text-sm text-muted-foreground">{t('posts.detail.rating')}</p>
                  <p className="font-medium">
                    {post.averageRating!.toFixed(1)} (
                    {t('posts.detail.reviews', { count: post.reviewCount })})
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
  )
}
