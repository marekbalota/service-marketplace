import { t } from 'elysia'

export const errorResponse = t.Object({ message: t.String() })

export const ErrorMessages = {
  postNotFound:    'Post not found',
  profileNotFound: 'Profile not found',
  reviewNotFound:  'Review not found',
  alreadyReviewed: 'You have already reviewed this post',
} as const
