import { Elysia, t } from 'elysia'

const errorResponse = t.Object({ message: t.String() })

export const ErrorMessages = {
  postNotFound:            'Post not found',
  profileNotFound:         'Profile not found',
  cannotDeleteLastProfile: 'Cannot delete your only profile. Create a new profile first.',
  imageNotFound:           'Image not found',
  favouriteNotFound:       'Favourite not found',
  reviewNotFound:          'Review not found',
  alreadyReviewed:         'You have already reviewed this post',
  userNotFound:            'User not found',
  userRoleNotFound:        'User role not found',
  roleNotFound:            'Role not found',
  cannotDeleteDefaultRole: 'Cannot delete the default role',
  noDefaultRoleFound:      'No default role found',
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

export const unauthorizedResponse = {
  401: errorResponse,
};

export const forbiddenResponse = {
  403: errorResponse,
};

export const notFoundResponse = {
  404: errorResponse,
};

export const conflictResponse = {
  409: errorResponse,
};

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

export class InternalServerError extends Error {
  status = 500;
  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
  }
}

export const errorsPlugin = new Elysia({ name: 'errors' })
  .error({ ForbiddenError, NotFoundError, ConflictError, InternalServerError })
  .onError(({ code, error, status }) => {
    if (code === 'ForbiddenError') return status(403, { message: error.message })
    if (code === 'NotFoundError')  return status(404, { message: error.message })
    if (code === 'ConflictError')  return status(409, { message: error.message })
    if (code === 'InternalServerError') return status(500, { message: error.message })
  })
