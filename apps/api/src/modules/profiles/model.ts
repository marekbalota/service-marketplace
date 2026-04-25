import { t, type UnwrapSchema } from 'elysia'

const profileItemPublic = t.Object({
  userProfileId: t.String(),
  name:          t.String(),
  email:         t.String(),
  bio:           t.Nullable(t.String()),
  phoneNumber:   t.Nullable(t.String()),
  fax:           t.Nullable(t.String()),
  createdAt:     t.Date(),
  updatedAt:     t.Nullable(t.Date()),
})

export const ProfilesModel = {
  findByIdParams:   t.Object({ id: t.String() }),
  findByIdResponse: profileItemPublic,
  updateParams:     t.Object({ id: t.String() }),
  updateBody: t.Object({
    name:        t.Optional(t.String({ minLength: 1 })),
    email:       t.Optional(t.String({ format: 'email' })),
    bio:         t.Optional(t.Union([t.String(), t.Null()])),
    phoneNumber: t.Optional(t.Union([t.String(), t.Null()])),
    fax:         t.Optional(t.Union([t.String(), t.Null()])),
  }),
  updateResponse:     profileItemPublic,
  profilePostsParams: t.Object({ id: t.String() }),
  createBody: t.Object({
    name:        t.String({ minLength: 1 }),
    email:       t.String({ format: 'email' }),
    bio:         t.Optional(t.Union([t.String(), t.Null()])),
    phoneNumber: t.Optional(t.Union([t.String(), t.Null()])),
    fax:         t.Optional(t.Union([t.String(), t.Null()])),
  }),
  createResponse: profileItemPublic,
  deleteParams:          t.Object({ id: t.String() }),
  reportedPostParams:    t.Object({ id: t.String(), postId: t.String() }),
  reportedReviewParams:  t.Object({ id: t.String(), reviewId: t.String() }),
  reportedMessageParams: t.Object({ id: t.String(), messageId: t.String() }),
} as const

export type ProfilesModel = {
  [k in keyof typeof ProfilesModel]: UnwrapSchema<typeof ProfilesModel[k]>
}
