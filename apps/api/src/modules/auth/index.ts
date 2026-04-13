import { Elysia } from "elysia";
import { auth, AuthService } from "./service";
import { AuthErrorMessages } from "../../lib/errors";
import { RBACService } from "../../lib/rbac/rbac-helper";

export const authRoutes = new Elysia({ name: "better-auth" })
    .mount(auth.handler)
    .macro({
        auth: {
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

                return {
                    user: session.user,
                    session: session.session,
                    permissions: userPermissions,
                };
            },
        },
    });
