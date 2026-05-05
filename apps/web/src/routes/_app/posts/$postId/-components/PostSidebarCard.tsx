import { Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { DollarSign, MapPin, Star } from 'lucide-react'
import { useActiveProfile } from '#/context/activeProfile'
import { ProfileAvatar } from '#/components/ProfileAvatar'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'
import { formatLocation } from '#/lib/format'
import { postDetailQueryOptions } from '../-queries/posts'
import { SendMessageSection } from './SendMessageSection'

export function PostSidebarCard({ postId }: { postId: string }) {
  const { data: post } = useSuspenseQuery(postDetailQueryOptions(postId))
  const { activeProfile } = useActiveProfile()
  const isOwner = activeProfile?.userProfileId === post.authorId
  const locationText = post.location ? formatLocation(post.location) : null

  return (
    <div className="space-y-4 lg:col-start-3 lg:row-start-1 lg:row-span-2">
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
  )
}
