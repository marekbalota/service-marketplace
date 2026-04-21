import { t, type UnwrapSchema } from 'elysia'

export const POST_REPORT_REASONS = [
  'spam',
  'harmful-language',
  'inappropriate-content',
  'scam',
  'misleading',
  'other',
] as const

export const MESSAGE_REPORT_REASONS = [
  'spam',
  'harassment',
  'harmful-language',
  'inappropriate',
  'scam',
  'other',
] as const

export const REVIEW_REPORT_REASONS = [
  'spam',
  'misleading',
  'inappropriate',
  'fake-review',
  'other',
] as const

function reasonUnion<T extends readonly string[]>(reasons: T) {
  return t.Union(reasons.map((r) => t.Literal(r)) as [ReturnType<typeof t.Literal>, ...ReturnType<typeof t.Literal>[]])
}

const createResponseShape = t.Object({
  reportId: t.String(),
  reporterId: t.String(),
  postId: t.Union([t.String(), t.Null()]),
  messageId: t.Union([t.String(), t.Null()]),
  reviewId: t.Union([t.String(), t.Null()]),
  reason: t.String(),
  description: t.Union([t.String(), t.Null()]),
  createdAt: t.Date(),
})

export const ReportsModel = {
  postCreateBody: t.Object({
    reason: reasonUnion(POST_REPORT_REASONS),
    description: t.Optional(t.String({ maxLength: 1000 })),
  }),
  messageCreateBody: t.Object({
    reason: reasonUnion(MESSAGE_REPORT_REASONS),
    description: t.Optional(t.String({ maxLength: 1000 })),
  }),
  reviewCreateBody: t.Object({
    reason: reasonUnion(REVIEW_REPORT_REASONS),
    description: t.Optional(t.String({ maxLength: 1000 })),
  }),
  createParams: t.Object({ id: t.String() }),
  messageReportParams: t.Object({ threadId: t.String(), messageId: t.String() }),
  createResponse: createResponseShape,
  checkParams: t.Object({ id: t.String() }),
  checkResponse: t.Object({ hasReported: t.Boolean() }),
} as const

export type ReportsModel = {
  [k in keyof typeof ReportsModel]: UnwrapSchema<(typeof ReportsModel)[k]>
}
