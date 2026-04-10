import { t, type UnwrapSchema } from 'elysia'

const postRow = t.Object({
  postId:      t.String(),
  authorId:    t.String(),
  postTitle:   t.String(),
  description: t.String(),
  postType:    t.Union([t.Literal("OFFER"), t.Literal("REQUEST")]),
  price:       t.Nullable(t.String()),
  rateType:    t.Nullable(t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED")])),
  createdAt:   t.Date(),
})

const postItem = t.Object({
  postId:      t.String(),
  postTitle:   t.String(),
  description: t.String(),
  postType:    t.Union([t.Literal("OFFER"), t.Literal("REQUEST")]),
  price:       t.Nullable(t.String()),
  rateType:    t.Nullable(t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED")])),
  createdAt:   t.Date(),
  authorId:    t.String(),
  authorName:  t.String(),
  categories:  t.Array(t.Object({ categoryId: t.String(), name: t.String() })),
  location:    t.Nullable(t.Object({
    locationId: t.String(),
    city:       t.Nullable(t.String()),
    country:    t.Nullable(t.String()),
  })),
})

export const PostsModel = {
  findAllQuery: t.Object({
    search:     t.Optional(t.String()),
    type:       t.Optional(t.Union([t.Literal("OFFER"), t.Literal("REQUEST")])),
    categoryId: t.Optional(t.String()),
    sort:       t.Optional(t.Union([t.Literal("newest"), t.Literal("price-low"), t.Literal("price-high"), t.Literal("name")])),
    offset:     t.Optional(t.Numeric()),
    size:       t.Optional(t.Numeric()),
  }),
  findAllResponse: t.Object({
    items:      t.Array(postItem),
    total:      t.Number(),
    totalPages: t.Number(),
  }),
  findByIdParams: t.Object({ id: t.String() }),
  findByIdResponse: t.Object({
    postId:        t.String(),
    postTitle:     t.String(),
    description:   t.String(),
    postType:      t.Union([t.Literal("OFFER"), t.Literal("REQUEST")]),
    price:         t.Nullable(t.String()),
    rateType:      t.Nullable(t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED")])),
    createdAt:     t.Date(),
    authorId:      t.String(),
    authorName:    t.String(),
    categories:    t.Array(t.Object({ categoryId: t.String(), name: t.String() })),
    location: t.Nullable(t.Object({
      locationId:  t.String(),
      country:     t.Nullable(t.String()),
      region:      t.Nullable(t.String()),
      city:        t.Nullable(t.String()),
      street:      t.Nullable(t.String()),
      houseNumber: t.Nullable(t.String()),
    })),
    reviews:       t.Array(t.Object({
      reviewId:          t.String(),
      rating:            t.Number(),
      reviewDescription: t.Nullable(t.String()),
      reviewerName:      t.String(),
      createdAt:         t.Date(),
    })),
    averageRating: t.Nullable(t.Number()),
    reviewCount:   t.Number(),
  }),
  createBody: t.Object({
    authorId:    t.String(),
    postTitle:   t.String({ minLength: 3 }),
    description: t.String({ minLength: 10 }),
    postType:    t.Union([t.Literal("OFFER"), t.Literal("REQUEST")]),
    price:       t.Optional(t.Union([t.String(), t.Null()])),
    rateType:    t.Optional(t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED"), t.Null()])),
    categoryIds: t.Optional(t.Array(t.String())),
  }),
  updateParams: t.Object({ id: t.String() }),
  updateBody: t.Object({
    postTitle:   t.Optional(t.String({ minLength: 3 })),
    description: t.Optional(t.String({ minLength: 10 })),
    postType:    t.Optional(t.Union([t.Literal("OFFER"), t.Literal("REQUEST")])),
    price:       t.Optional(t.Union([t.String(), t.Null()])),
    rateType:    t.Optional(t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED"), t.Null()])),
    categoryIds: t.Optional(t.Array(t.String())),
  }),
  createResponse: postRow,
  updateResponse: postRow,
  deleteParams:            t.Object({ id: t.String() }),
  findByProfileResponse:   t.Array(postItem),
} as const

export type PostsModel = {
  [k in keyof typeof PostsModel]: UnwrapSchema<typeof PostsModel[k]>
}
