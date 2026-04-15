import { t } from 'elysia'

export const errorResponse = t.Object({ message: t.String() })

export const ErrorMessages = {
  postNotFound:            'Post not found',
  profileNotFound:         'Profile not found',
  cannotDeleteLastProfile: 'Cannot delete your only profile. Create a new profile first.',
} as const
