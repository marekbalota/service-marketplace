import { t, type UnwrapSchema } from 'elysia'

export const AdminAnalyticsModel = {
  analyticsQuery: t.Object({
    from: t.Optional(t.String()),
    to: t.String(),
    granularity: t.Union([
      t.Literal('hour'),
      t.Literal('day'),
      t.Literal('week'),
      t.Literal('month'),
      t.Literal('year'),
    ]),
  }),
  analyticsResponse: t.Object({
    items: t.Array(t.Object({ bucket: t.Date(), count: t.Number() })),
    total: t.Number(),
  }),
} as const

export type AdminAnalyticsModel = {
  [k in keyof typeof AdminAnalyticsModel]: UnwrapSchema<(typeof AdminAnalyticsModel)[k]>
}
