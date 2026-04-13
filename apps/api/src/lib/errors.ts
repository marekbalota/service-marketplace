import { t } from 'elysia'

export const errorResponse = t.Object({ message: t.String() })

export const ErrorMessages = {
  postNotFound:    'Post not found',
  profileNotFound: 'Profile not found',
  userNotFound: 'User not found',
} as const

export const AuthErrorMessages = {
  unauthorized: 'Unauthorized',
  forbidden:    'Forbidden',
  banned:       'Account banned',
} as const
