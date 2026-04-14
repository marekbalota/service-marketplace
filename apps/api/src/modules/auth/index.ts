import { Elysia } from "elysia";
import { auth, AuthService } from "./service";
import { AuthErrorMessages } from "../../lib/errors";
import { RBACService } from "../../lib/rbac/rbac-helper";
import type { PermissionType } from "../../lib/rbac/permissions";

type PermissionCheck =
    | PermissionType
    | PermissionType[]
    | { permissions: PermissionType | PermissionType[]; mode: 'all' | 'any' };

function checkPermissions(
    userPermissions: string[],
    required: PermissionCheck
): boolean {
    let permissions: PermissionType[];
    let mode: 'all' | 'any';

    if (typeof required === 'object' && 'permissions' in required) {
        permissions = Array.isArray(required.permissions)
            ? required.permissions
            : [required.permissions];
        mode = required.mode;
    } else {
        permissions = Array.isArray(required)
            ? required
            : [required];
        mode = 'any';
    }

    if (permissions.length === 0) {
        return true;
    }

    return mode === 'all'
        ? permissions.every(p => userPermissions.includes(p))
        : permissions.some(p => userPermissions.includes(p));
}

export const authRoutes = new Elysia({ name: "better-auth" })
    .mount(auth.handler)
    .macro({
        authWithPermissions: (requiredPermissions: PermissionCheck | null) => ({
            async resolve({ status, request: { headers } }) {
                const session = await auth.api.getSession({ headers });
                if (!session) {
                    return status(401, { message: AuthErrorMessages.unauthorized });
                }

                const banStatus = await AuthService.checkBanStatus(session.user.id);
                if (banStatus) {
                    await AuthService.clearUserSessions(session.user.id);

                    return status(403, {
                        message: AuthErrorMessages.banned,
                        reason: banStatus.reason,
                        expiresAt: banStatus.expiresAt,
                    });
                }
                
                const userPermissions = await RBACService.getUserPermissions(session.user.id);

                if (requiredPermissions) {
                    const hasPermission = checkPermissions(userPermissions, requiredPermissions);

                    if (!hasPermission) {
                        return status(403, { message: AuthErrorMessages.missingPermissions });
                    }
                }

                return {
                    user: session.user,
                    session: session.session,
                    permissions: userPermissions,
                };
            },
        }),
    });
