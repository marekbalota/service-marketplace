import { t, type UnwrapSchema } from 'elysia'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const imageItem = t.Object({
  imageId: t.String(),
  userProfileId: t.String(),
  name: t.String(),
  link: t.String(),
  createdAt: t.Date(),
})

export const ImagesModel = {
  profileImagesParams: t.Object({ id: t.String() }),
  profileImagesResponse: t.Array(imageItem),
  createBody: t.Object({
    file: t.File({
      maxSize: '5m',
      type: ALLOWED_TYPES,
    }),
    profileId: t.String(),
  }),
  createUrlBody: t.Object({
    url: t.String({ pattern: '^https?://' }),
    profileId: t.String(),
  }),
  createResponse: imageItem,
  deleteParams: t.Object({ id: t.String() }),
} as const

export type ImagesModel = {
  [k in keyof typeof ImagesModel]: UnwrapSchema<(typeof ImagesModel)[k]>
}
