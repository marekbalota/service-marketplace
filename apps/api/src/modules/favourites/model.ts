import { t, type UnwrapSchema } from 'elysia'

const favouriteItem = t.Object({
  postId: t.String(),
  postTitle: t.String(),
  description: t.String(),
  postType: t.Union([t.Literal('OFFER'), t.Literal('REQUEST')]),
  price: t.Nullable(t.String()),
  rateType: t.Nullable(t.Union([t.Literal('HOURLY'), t.Literal('DAILY'), t.Literal('FIXED')])),
  createdAt: t.Date(),
  authorId: t.String(),
  authorName: t.String(),
  categories: t.Array(t.Object({ categoryId: t.String(), name: t.String() })),
  location: t.Nullable(
    t.Object({
      locationId: t.String(),
      city: t.Nullable(t.String()),
      country: t.Nullable(t.String()),
    }),
  ),
})

export const FavouritesModel = {
  postIdParams: t.Object({ postId: t.String() }),
  profileIdQuery: t.Object({ profileId: t.String() }),
  findAllResponse: t.Object({
    items: t.Array(favouriteItem),
    total: t.Number(),
  }),
  addResponse: t.Object({
    userProfileId: t.String(),
    postId: t.String(),
    createdAt: t.Date(),
  }),
} as const

export type FavouritesModel = {
  [k in keyof typeof FavouritesModel]: UnwrapSchema<(typeof FavouritesModel)[k]>
}
