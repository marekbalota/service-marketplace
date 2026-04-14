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
  missingPermissions: 'Missing permissions',
  cannotManageRole: 'Cannot manage users with equal or higher role',
} as const

// Custom error classes for service layer
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
