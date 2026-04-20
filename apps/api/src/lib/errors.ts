import { Elysia, t } from 'elysia'

export const errorResponse = t.Object({ message: t.String() })

export const ErrorMessages = {
  postNotFound:    'Post not found',
  profileNotFound: 'Profile not found',
  favouriteNotFound: 'Favourite not found',
  reviewNotFound:  'Review not found',
  alreadyReviewed: 'You have already reviewed this post',
  alreadyReported: 'You have already reported this post',
  reportNotFound: 'Report not found',
  messageNotFound: 'Message not found',
  alreadyReportedMessage: 'You have already reported this message',
  userNotFound: 'User not found',
  userRoleNotFound: 'User role not found',
  roleNotFound: 'Role not found',
  cannotDeleteDefaultRole: 'Cannot delete the default role',
  noDefaultRoleFound: 'No default role found',
} as const

export const AuthErrorMessages = {
  unauthorized: 'Unauthorized',
  forbidden:    'Forbidden',
  banned:       'Account banned',
  missingPermissions: 'Missing permissions',
  cannotManageRole: 'Cannot manage users with equal or higher role',
  cannotModifySameOrHigherRole: 'Cannot modify users with equal or higher role',
  cannotAssignSameOrHigherRole: 'Cannot assign roles with equal or higher priority',
  cannotAssignPermissions: 'Cannot assign permissions you do not have',
  cannotModifySameOrHigherPriorityRole: 'Cannot modify roles with equal or higher priority',
  cannotDeleteSameOrHigherPriorityRole: 'Cannot delete roles with equal or higher priority',
  invalidReorderOperation: 'Invalid reorder operation',
  cannotSetSameOrHigherAsDefault: 'Cannot set roles with equal or higher priority as default',
} as const

export class ForbiddenError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export const errorsPlugin = new Elysia({ name: 'errors' })
  .error({ ForbiddenError, NotFoundError, ConflictError })
  .onError(({ code, error, status }) => {
    if (code === 'ForbiddenError') return status(403, { message: error.message })
    if (code === 'NotFoundError')  return status(404, { message: error.message })
    if (code === 'ConflictError')  return status(409, { message: error.message })
  })
