import { t, type UnwrapSchema } from 'elysia'

const profileItem = t.Object({
  userProfileId: t.String(),
  accountId:     t.String(),
  name:          t.String(),
  email:         t.String(),
  bio:           t.Nullable(t.String()),
  phoneNumber:   t.Nullable(t.String()),
  fax:           t.Nullable(t.String()),
  createdAt:     t.Date(),
  accountName:   t.String(),
})

export const ProfilesModel = {
  findByIdParams:   t.Object({ id: t.String() }),
  findByIdResponse: profileItem,
  updateParams:     t.Object({ id: t.String() }),
  updateBody: t.Object({
    name:        t.Optional(t.String({ minLength: 1 })),
    email:       t.Optional(t.String({ format: 'email' })),
    bio:         t.Optional(t.Union([t.String(), t.Null()])),
    phoneNumber: t.Optional(t.Union([t.String(), t.Null()])),
    fax:         t.Optional(t.Union([t.String(), t.Null()])),
  }),
  profilePostsParams: t.Object({ id: t.String() }),
} as const

export type ProfilesModel = {
  [k in keyof typeof ProfilesModel]: UnwrapSchema<typeof ProfilesModel[k]>
}
