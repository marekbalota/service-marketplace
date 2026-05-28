import { t, type UnwrapSchema } from 'elysia'

export const AdminStatsModel = {
  statsResponse: t.Object({
    totalUsers: t.Number(),
    activePosts: t.Number(),
    totalMessages: t.Number(),
    activeBans: t.Number(),
  }),
  recentUsersQuery: t.Object({
    limit: t.Optional(t.Number({ default: 4, minimum: 1, maximum: 20 })),
  }),
  recentUsersResponse: t.Object({
    items: t.Array(
      t.Object({
        userId: t.String(),
        name: t.String(),
        email: t.String(),
        createdAt: t.Date(),
      }),
    ),
  }),
} as const

export type AdminStatsModel = {
  [k in keyof typeof AdminStatsModel]: UnwrapSchema<(typeof AdminStatsModel)[k]>
}
