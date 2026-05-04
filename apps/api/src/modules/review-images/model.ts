import { t, type UnwrapSchema } from 'elysia'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const reviewImageItem = t.Object({
  reviewImageId: t.String(),
  reviewId:      t.String(),
  name:          t.String(),
  link:          t.String(),
  createdAt:     t.Date(),
})

export const ReviewImagesModel = {
  createBody: t.Object({
    file:     t.File({ maxSize: '5m', type: ALLOWED_TYPES }),
    reviewId: t.String(),
  }),
  createResponse: reviewImageItem,
  deleteParams:   t.Object({ id: t.String() }),
} as const

export type ReviewImagesModel = {
  [k in keyof typeof ReviewImagesModel]: UnwrapSchema<typeof ReviewImagesModel[k]>
}
