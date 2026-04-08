import { Elysia, t } from "elysia";
import { db } from "../db";
import { userProfiles, accounts, roles } from "../db/schema";
import { and, eq, isNull } from "drizzle-orm";

const profileSelect = {
  userProfileId: userProfiles.userProfileId,
  accountId: userProfiles.accountId,
  name: userProfiles.name,
  email: userProfiles.email,
  bio: userProfiles.bio,
  phoneNumber: userProfiles.phoneNumber,
  fax: userProfiles.fax,
  createdAt: userProfiles.createdAt,
  accountName: accounts.name,
  roleName: roles.name,
};

const activeWhere = and(isNull(userProfiles.deletedAt), isNull(accounts.deletedAt));

export const userProfilesRoutes = new Elysia({ prefix: "/user-profiles" })
  .get("/", async () => {
    return db
      .select(profileSelect)
      .from(userProfiles)
      .innerJoin(accounts, eq(userProfiles.accountId, accounts.accountId))
      .innerJoin(roles, eq(accounts.roleId, roles.roleId))
      .where(activeWhere);
  })
  .get(
    "/:id",
    async ({ params, set }) => {
      const [row] = await db
        .select(profileSelect)
        .from(userProfiles)
        .innerJoin(accounts, eq(userProfiles.accountId, accounts.accountId))
        .innerJoin(roles, eq(accounts.roleId, roles.roleId))
        .where(and(eq(userProfiles.userProfileId, params.id), activeWhere))
        .limit(1);

      if (!row) {
        set.status = 404;
        return { message: "Profile not found" };
      }
      return row;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      const [existing] = await db
        .select({ userProfileId: userProfiles.userProfileId })
        .from(userProfiles)
        .where(
          and(eq(userProfiles.userProfileId, params.id), isNull(userProfiles.deletedAt)),
        )
        .limit(1);

      if (!existing) {
        set.status = 404;
        return { message: "Profile not found" };
      }

      const [updated] = await db
        .update(userProfiles)
        .set(body)
        .where(eq(userProfiles.userProfileId, params.id))
        .returning();

      return updated;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        email: t.Optional(t.String({ format: "email" })),
        bio: t.Optional(t.Union([t.String(), t.Null()])),
        phoneNumber: t.Optional(t.Union([t.String(), t.Null()])),
        fax: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    },
  );
