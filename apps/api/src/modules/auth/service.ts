import { betterAuth } from "better-auth";
import { ErrorCodes } from "@marketplace/shared";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import * as schema from "../../db/schema";
import { users, roles, userProfiles, sessions } from "../../db/schema";
import type { AuthModel } from "./model";
import { AuthErrorMessages } from "../../lib/errors";
import { impersonationPlugin } from "./impersonation-plugin";
import { sendVerificationEmail, sendPasswordResetEmail } from "../../lib/email";

export const verificationTokenStore = new Map<string, string>();
export const resetTokenStore = new Map<string, string>();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: ["http://localhost:3000"],
  plugins: [impersonationPlugin()],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.oauthAccounts,
      verification: schema.verifications,
    },
  }),
  user: {
    additionalFields: {
      roleId: { type: "string", input: false },
      isBanned: { type: "boolean", input: false },
      banReason: { type: "string", input: false },
      banExpiration: { type: "date", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) => {
      if (process.env.NODE_ENV === "test") {
        resetTokenStore.set(user.email, token);
      }
      void sendPasswordResetEmail({ email: user.email, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      const verifyUrl = new URL(url);
      verifyUrl.searchParams.set("callbackURL", "http://localhost:3000/verify-email/callback");
      if (process.env.NODE_ENV === "test") {
        verificationTokenStore.set(user.email, token);
      }
      void sendVerificationEmail({ email: user.email, url: verifyUrl.toString() });
    },
  },
  rateLimit: {
    enabled: true,
    storage: "memory",
    customRules: {
      "/sign-in/email": {
        window: 300,
        max: 5,
      },
      "/request-password-reset": {
        window: 3600,
        max: 5,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const role = await db.query.roles.findFirst({
            where: eq(roles.isDefault, true),
          });

          if (role) {
            await db
              .update(users)
              .set({ roleId: role.roleId })
              .where(eq(users.id, user.id));
          }
          await db.insert(userProfiles).values({
            accountId: user.id,
            name: user.name,
            email: user.email,
          });
        },
      },
    },
  },
  ...(process.env.NODE_ENV !== "test" ? {
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email") {
          const user = await db.query.users.findFirst({
            where: eq(users.email, ctx.body.email),
          });

          if (user) {
            const banStatus = await AuthService.checkBanStatus(user.id);
            if (banStatus) {
              await AuthService.clearUserSessions(user.id);

              throw new APIError("FORBIDDEN", {
                code: ErrorCodes.Banned,
                message: AuthErrorMessages.banned,
                reason: banStatus.reason,
                expiresAt: banStatus.expiresAt,
              });
            }
          }
        }
      }),
    },
  } : {}),
});

export abstract class AuthService {
  static async checkBanStatus(userId: string): Promise<AuthModel['banCheckResult'] | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.isBanned) {
      return null;
    }

    const now = new Date();
    const isExpired = user.banExpiration && user.banExpiration < now;

    if (isExpired) {
      await db
        .update(users)
        .set({ isBanned: false, banReason: null, banExpiration: null })
        .where(eq(users.id, userId));

      return null;
    }

    return {
      isBanned: true,
      reason: user.banReason,
      expiresAt: user.banExpiration,
    };
  }

  static async clearUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
