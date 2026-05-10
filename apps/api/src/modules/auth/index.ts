import { Elysia } from 'elysia'
import { auth } from './service'
import { AuthErrorMessages } from '../../lib/errors'
import { RBACService } from '../../lib/rbac/rbac-helper'
import type { Permission } from '@marketplace/shared'
import { ErrorCodes } from '@marketplace/shared'
type PermissionType = Permission

type PermissionCheck =
  | PermissionType
  | PermissionType[]
  | { permissions: PermissionType | PermissionType[]; mode: 'all' | 'any' }

function checkPermissions(userPermissions: string[], required: PermissionCheck): boolean {
  let permissions: PermissionType[]
  let mode: 'all' | 'any'

  if (typeof required === 'object' && 'permissions' in required) {
    permissions = Array.isArray(required.permissions)
      ? required.permissions
      : [required.permissions]
    mode = required.mode
  } else {
    permissions = Array.isArray(required) ? required : [required]
    mode = 'any'
  }

  if (permissions.length === 0) {
    return true
  }

  return mode === 'all'
    ? permissions.every((p) => userPermissions.includes(p))
    : permissions.some((p) => userPermissions.includes(p))
}

// Three auth macro modes — pick the right one for each route:
//   auth                 — requires login; blocks POST/PATCH/DELETE during impersonation.
//                          Use for standard read-write endpoints.
//   authWithPermissions  — same as auth plus RBAC permission checks.
//                          Use for endpoints that require specific permissions.
//   blockDuringImpersonation — requires login; blocks ALL methods during impersonation.
//                          Use when reads must also be restricted (e.g. messages).
const WRITE_METHODS = ['POST', 'PATCH', 'DELETE']

export const authRoutes = new Elysia({ name: 'better-auth' }).mount(auth.handler).macro({
  auth: {
    async resolve({ status, request: { headers, method } }) {
      const session = await auth.api.getSession({ headers })
      if (!session) {
        return status(401, { message: AuthErrorMessages.unauthorized })
      }

      if (session.session.impersonatedBy && WRITE_METHODS.includes(method.toUpperCase())) {
        return status(403, {
          code: ErrorCodes.ImpersonationReadOnly,
          message: AuthErrorMessages.impersonationReadOnly,
        })
      }

      return {
        user: session.user,
        session: session.session,
      }
    },
  },
  authWithPermissions: (requiredPermissions: PermissionCheck | null) => ({
    async resolve({ status, request: { headers, method } }) {
      const session = await auth.api.getSession({ headers })
      if (!session) {
        return status(401, { message: AuthErrorMessages.unauthorized })
      }

      if (session.session.impersonatedBy && WRITE_METHODS.includes(method.toUpperCase())) {
        return status(403, {
          code: ErrorCodes.ImpersonationReadOnly,
          message: AuthErrorMessages.impersonationReadOnly,
        })
      }

      const userPermissions = await RBACService.getUserPermissions(session.user.id)

      if (requiredPermissions) {
        const hasPermission = checkPermissions(userPermissions, requiredPermissions)

        if (!hasPermission) {
          return status(403, { message: AuthErrorMessages.missingPermissions })
        }
      }

      return {
        user: session.user,
        session: session.session,
        permissions: userPermissions,
      }
    },
  }),
  blockDuringImpersonation: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({ headers })
      if (!session) {
        return status(401, { message: AuthErrorMessages.unauthorized })
      }
      if (session.session.impersonatedBy) {
        return status(403, {
          code: ErrorCodes.ImpersonationReadOnly,
          message: AuthErrorMessages.impersonationReadOnly,
        })
      }
      return {
        user: session.user,
        session: session.session,
      }
    },
  },
})
