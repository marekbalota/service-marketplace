import { t, type UnwrapSchema } from 'elysia'

export const REPORT_REASONS = [
  'spam',
  'harmful-language',
  'inappropriate-content',
  'scam',
  'misleading',
  'other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export const ReportsModel = {
  createBody: t.Object({
    reason: t.Union(REPORT_REASONS.map((r) => t.Literal(r)) as [ReturnType<typeof t.Literal>, ...ReturnType<typeof t.Literal>[]]),
    description: t.String({ minLength: 1, maxLength: 1000 }),
  }),
  createParams: t.Object({ id: t.String() }),
  createResponse: t.Object({
    reportId: t.String(),
    reporterId: t.String(),
    postId: t.String(),
    reason: t.String(),
    description: t.String(),
    createdAt: t.Date(),
  }),
  checkParams: t.Object({ id: t.String() }),
  checkResponse: t.Object({ hasReported: t.Boolean() }),
} as const

export type ReportsModel = {
  [k in keyof typeof ReportsModel]: UnwrapSchema<(typeof ReportsModel)[k]>
}
