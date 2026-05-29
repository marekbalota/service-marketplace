import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export function hasReportedPostQueryOptions(postId: string, profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'reported', 'posts', postId],
    queryFn: async () => {
      const { status } = await api.profiles({ id: profileId }).reported.posts({ postId }).get()
      return status === 204
    },
  })
}

export function hasReportedReviewQueryOptions(reviewId: string, profileId: string) {
  return queryOptions({
    queryKey: ['profiles', profileId, 'reported', 'reviews', reviewId],
    queryFn: async () => {
      const { status } = await api.profiles({ id: profileId }).reported.reviews({ reviewId }).get()
      return status === 204
    },
  })
}
