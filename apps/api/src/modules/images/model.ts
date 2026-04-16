import { t, type UnwrapSchema } from 'elysia'

const imageItem = t.Object({
  imageId:       t.String(),
  userProfileId: t.String(),
  name:          t.String(),
  link:          t.String(),
  createdAt:     t.Date(),
})

export const ImagesModel = {
  profileImagesParams:   t.Object({ id: t.String() }),
  profileImagesResponse: t.Array(imageItem),
  createBody:            t.Object({ link: t.String({ minLength: 1 }) }),
  createResponse:        imageItem,
  deleteParams:          t.Object({ id: t.String() }),
} as const

export type ImagesModel = {
  [k in keyof typeof ImagesModel]: UnwrapSchema<typeof ImagesModel[k]>
}
