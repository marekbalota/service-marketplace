import { t, type UnwrapSchema } from 'elysia'

export const ReviewsModel = {
  createBody: t.Object({
    postId: t.String(),
    rating: t.Number({ minimum: 1, maximum: 5 }),
    reviewDescription: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
    profileId: t.String(),
  }),
  createResponse: t.Object({
    reviewId: t.String(),
    rating: t.Number(),
    reviewDescription: t.Nullable(t.String()),
    reviewerId: t.String(),
    postId: t.String(),
    createdAt: t.Date(),
  }),
  deleteParams: t.Object({ id: t.String() }),
} as const

export type ReviewsModel = {
  [k in keyof typeof ReviewsModel]: UnwrapSchema<(typeof ReviewsModel)[k]>
}
