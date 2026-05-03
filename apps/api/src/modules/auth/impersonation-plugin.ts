import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, getSessionFromCtx, APIError } from "better-auth/api";
import { deleteSessionCookie, setSessionCookie, expireCookie } from "better-auth/cookies";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { RBACService } from "../../lib/rbac/rbac-helper";
import { AuthErrorMessages, ErrorMessages, ImpersonationErrorMessages } from "../../lib/errors";
import { Permissions } from "@marketplace/shared";
import * as z from "zod";

export function impersonationPlugin() {
  return {
    id: "impersonation",
    schema: {
      session: {
        fields: {
          impersonatedBy: { type: "string", required: false, returned: true },
        },
      },
    },
    endpoints: {
      impersonateUser: createAuthEndpoint(
        "/admin/impersonate-user",
        { method: "POST", body: z.object({ userId: z.string() }), requireHeaders: true },
        async (ctx) => {
          const callerSession = await getSessionFromCtx(ctx);
          if (!callerSession) {
            throw APIError.fromStatus("UNAUTHORIZED", { message: AuthErrorMessages.unauthorized });
          }

          const callerPermissions = await RBACService.getUserPermissions(callerSession.user.id);
          if (!callerPermissions.includes(Permissions.AdminUsersImpersonate)) {
            throw APIError.fromStatus("FORBIDDEN", { message: AuthErrorMessages.missingPermissions });
          }

          if (callerSession.session.impersonatedBy) {
            throw APIError.fromStatus("FORBIDDEN", { message: ImpersonationErrorMessages.alreadyImpersonating });
          }

          const targetUser = await db.query.users.findFirst({
            where: eq(users.id, ctx.body.userId),
          });
          if (!targetUser) {
            throw APIError.fromStatus("NOT_FOUND", { message: ErrorMessages.userNotFound });
          }

          if (callerSession.user.roleId && targetUser.roleId) {
            const canManage = await RBACService.canManageRole(callerSession.user.roleId, targetUser.roleId);
            if (!canManage) {
              throw APIError.fromStatus("FORBIDDEN", { message: AuthErrorMessages.cannotManageRole });
            }
          }

          const newSession = await ctx.context.internalAdapter.createSession(
            targetUser.id,
            true,
            {
              impersonatedBy: callerSession.user.id,
              expiresAt: new Date(Date.now() + 3600 * 1000),
            },
            true,
          );

          if (!newSession) {
            throw APIError.fromStatus("INTERNAL_SERVER_ERROR", { message: ImpersonationErrorMessages.impersonationFailed });
          }

          const dontRememberToken = (await ctx.getSignedCookie(
            ctx.context.authCookies.dontRememberToken.name,
            ctx.context.secret,
          )) ?? "";

          const adminCookieProp = ctx.context.createAuthCookie("admin_session");
          await ctx.setSignedCookie(
            adminCookieProp.name,
            `${callerSession.session.token}|${dontRememberToken}`,
            ctx.context.secret,
            ctx.context.authCookies.sessionToken.attributes,
          );

          deleteSessionCookie(ctx);
          await setSessionCookie(ctx, { session: newSession, user: targetUser }, true);

          return ctx.json({ session: newSession, user: targetUser });
        },
      ),
      stopImpersonating: createAuthEndpoint(
        "/admin/stop-impersonating",
        { method: "POST", requireHeaders: true },
        async (ctx) => {
          const currentSession = await getSessionFromCtx(ctx);
          if (!currentSession) {
            throw APIError.fromStatus("UNAUTHORIZED", { message: AuthErrorMessages.unauthorized });
          }

          if (!currentSession.session.impersonatedBy) {
            throw APIError.fromStatus("BAD_REQUEST", { message: ImpersonationErrorMessages.notCurrentlyImpersonating });
          }

          const adminSessionCookie = ctx.context.createAuthCookie("admin_session");
          const adminSessionData = await ctx.getSignedCookie(adminSessionCookie.name, ctx.context.secret);
          if (!adminSessionData) {
            throw APIError.fromStatus("INTERNAL_SERVER_ERROR", { message: ImpersonationErrorMessages.adminSessionMissing });
          }

          const [adminToken, dontRememberToken] = adminSessionData.split("|");

          const adminSession = await ctx.context.internalAdapter.findSession(adminToken!);
          if (!adminSession || adminSession.session.userId !== currentSession.session.impersonatedBy) {
            throw APIError.fromStatus("INTERNAL_SERVER_ERROR", { message: ImpersonationErrorMessages.adminSessionMismatch });
          }

          if (adminSession.session.expiresAt < new Date()) {
            throw APIError.fromStatus("BAD_REQUEST", { message: ImpersonationErrorMessages.adminSessionExpired });
          }

          await ctx.context.internalAdapter.deleteSession(currentSession.session.token);

          await setSessionCookie(ctx, adminSession, !!dontRememberToken);
          expireCookie(ctx, adminSessionCookie);

          return ctx.json({ session: adminSession.session, user: adminSession.user });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
