import { Elysia, t } from 'elysia'

const errorResponse = t.Object({
  message: t.String(),
  code: t.Optional(t.String()),
  locale: t.Optional(t.String()),
})

export const ErrorMessages = {
  postNotFound: 'Post not found',
  messageNotFound: 'Message not found',
  profileNotFound: 'Profile not found',
  cannotDeleteLastProfile: 'Cannot delete your only profile. Create a new profile first.',
  imageNotFound: 'Image not found',
  reviewImageNotFound: 'Review image not found',
  favouriteNotFound: 'Favourite not found',
  alreadyFavourited: 'Post is already favourited',
  reviewNotFound: 'Review not found',
  alreadyReviewed: 'You have already reviewed this post',
  alreadyReported: 'You have already reported this',
  reportNotFound: 'Report not found',
  userNotFound: 'User not found',
  userRoleNotFound: 'User role not found',
  roleNotFound: 'Role not found',
  cannotDeleteDefaultRole: 'Cannot delete the default role',
  noDefaultRoleFound: 'No default role found',
  sessionNotFound: 'Session not found',
  categoryNotFound: 'Category not found',
  categoryNameConflict: 'A category with this name already exists',
  missingEnglishTranslation: 'English translation is required',
  unsupportedLocale: 'One or more locales are not supported',
} as const

export const ImpersonationErrorMessages = {
  impersonationFailed: 'Failed to create impersonation session',
  notCurrentlyImpersonating: 'Not currently impersonating',
  alreadyImpersonating: 'Cannot start a new impersonation session while already impersonating',
  adminSessionMissing: 'Admin session cookie missing',
  adminSessionMismatch: 'Admin session mismatch',
  adminSessionExpired: 'Admin session has expired',
} as const

export const AuthErrorMessages = {
  unauthorized: 'Unauthorized',
  forbidden: 'Forbidden',
  banned: 'Account banned',
  missingPermissions: 'Missing permissions',
  impersonationReadOnly: 'Cannot make changes during impersonation',
  cannotManageRole: 'Cannot manage users with equal or higher role',
  cannotModifySameOrHigherRole: 'Cannot modify users with equal or higher role',
  cannotAssignSameOrHigherRole: 'Cannot assign roles with equal or higher priority',
  cannotAssignPermissions: 'Cannot assign permissions you do not have',
  cannotModifySameOrHigherPriorityRole: 'Cannot modify roles with equal or higher priority',
  cannotDeleteSameOrHigherPriorityRole: 'Cannot delete roles with equal or higher priority',
  invalidReorderOperation: 'Invalid reorder operation',
  cannotSetSameOrHigherAsDefault: 'Cannot set roles with equal or higher priority as default',
} as const

export const unauthorizedResponse = {
  401: errorResponse,
}

export const forbiddenResponse = {
  403: errorResponse,
}

export const notFoundResponse = {
  404: errorResponse,
}

export const conflictResponse = {
  409: errorResponse,
}

export const unprocessableResponse = {
  422: errorResponse,
}

export class ForbiddenError extends Error {
  status = 403
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  status = 404
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  status = 409
  locale?: string
  constructor(message: string, locale?: string) {
    super(message)
    this.name = 'ConflictError'
    this.locale = locale
  }
}

export class UnprocessableEntityError extends Error {
  status = 422
  constructor(message: string) {
    super(message)
    this.name = 'UnprocessableEntityError'
  }
}

export function getPgCode(e: unknown): string | undefined {
  if (e && typeof e === 'object') {
    if ('code' in e) return (e as { code: string }).code
    if ('cause' in e && e.cause && typeof e.cause === 'object' && 'code' in e.cause) {
      return (e.cause as { code: string }).code
    }
  }
  return undefined
}

export function getPgDetail(e: unknown): string | undefined {
  if (e && typeof e === 'object') {
    if ('detail' in e) return (e as { detail: string }).detail
    if ('cause' in e && e.cause && typeof e.cause === 'object' && 'detail' in e.cause) {
      return (e.cause as { detail: string }).detail
    }
  }
  return undefined
}

export class InternalServerError extends Error {
  status = 500
  constructor(message: string) {
    super(message)
    this.name = 'InternalServerError'
  }
}

export const errorsPlugin = new Elysia({ name: 'errors' })
  .error({
    ForbiddenError,
    NotFoundError,
    ConflictError,
    UnprocessableEntityError,
    InternalServerError,
  })
  .onError(({ code, error, status }) => {
    if (code === 'ForbiddenError') return status(403, { message: error.message })
    if (code === 'NotFoundError') return status(404, { message: error.message })
    if (code === 'ConflictError')
      return status(409, { message: error.message, locale: error.locale })
    if (code === 'UnprocessableEntityError') return status(422, { message: error.message })
    if (code === 'InternalServerError') return status(500, { message: error.message })
  })
