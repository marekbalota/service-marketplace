import { t, type UnwrapSchema } from 'elysia'

const reportStatus = t.Union([t.Literal('pending'), t.Literal('resolved'), t.Literal('dismissed')])

const reportTargetType = t.Union([t.Literal('POST'), t.Literal('MESSAGE'), t.Literal('REVIEW')])

const reportItem = t.Object({
  reportId: t.String(),
  targetType: reportTargetType,
  reportedItem: t.String(),
  reporterName: t.String(),
  reportedUserId: t.Nullable(t.String()),
  reportedUserName: t.Nullable(t.String()),
  reportedUserIsBanned: t.Nullable(t.Boolean()),
  categoryLabel: t.String(),
  description: t.Nullable(t.String()),
  createdAt: t.Date(),
  status: reportStatus,
})

export const AdminReportsModel = {
  reportsQuery: t.Object({
    targetType: t.Optional(reportTargetType),
    categoryId: t.Optional(t.String()),
    status: t.Optional(reportStatus),
    page: t.Optional(t.Numeric()),
  }),

  reportsResponse: t.Object({
    items: t.Array(reportItem),
    total: t.Number(),
    totalPending: t.Number(),
    totalResolved: t.Number(),
    totalDismissed: t.Number(),
    totalPages: t.Number(),
  }),

  reportParams: t.Object({ id: t.String() }),
} as const

export type AdminReportsModel = {
  [k in keyof typeof AdminReportsModel]: UnwrapSchema<(typeof AdminReportsModel)[k]>
}
