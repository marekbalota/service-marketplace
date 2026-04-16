import { t } from 'elysia'

export const errorResponse = t.Object({ message: t.String() })

export const ErrorMessages = {
  postNotFound:      'Post not found',
  profileNotFound:   'Profile not found',
  favouriteNotFound: 'Favourite not found',
} as const
