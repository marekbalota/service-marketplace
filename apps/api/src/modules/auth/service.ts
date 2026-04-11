import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import * as schema from "../../db/schema";
import { users, userProfiles } from "../../db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: ["http://localhost:3000"],
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
  emailAndPassword: {
    enabled: true,
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
            where: (r, { eq }) => eq(r.name, "user"),
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
});
