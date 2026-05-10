import { t, type UnwrapSchema } from 'elysia'

const createBodyShape = t.Object({
  categoryId: t.String({ format: 'uuid' }),
  description: t.Optional(t.String({ maxLength: 1000 })),
})

const createResponseShape = t.Object({
  reportId: t.String(),
  reporterId: t.String(),
  postId: t.Union([t.String(), t.Null()]),
  messageId: t.Union([t.String(), t.Null()]),
  reviewId: t.Union([t.String(), t.Null()]),
  categoryId: t.String(),
  description: t.Union([t.String(), t.Null()]),
  createdAt: t.Date(),
})

const categoryShape = t.Object({
  categoryId: t.String(),
  targetType: t.Union([t.Literal('POST'), t.Literal('MESSAGE'), t.Literal('REVIEW')]),
  value: t.String(),
  label: t.String(),
})

export const ReportsModel = {
  createBody: createBodyShape,
  createParams: t.Object({ id: t.String() }),
  createResponse: createResponseShape,
  messageReportParams: t.Object({ threadId: t.String(), messageId: t.String() }),
  categoriesQuery: t.Object({
    targetType: t.Union([t.Literal('POST'), t.Literal('MESSAGE'), t.Literal('REVIEW')]),
  }),
  categoriesResponse: t.Array(categoryShape),
} as const

export type ReportsModel = {
  [k in keyof typeof ReportsModel]: UnwrapSchema<(typeof ReportsModel)[k]>
}
