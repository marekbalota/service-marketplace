import { t, type UnwrapSchema } from 'elysia'

// Shared enums
const postType = t.Union([t.Literal("OFFER"), t.Literal("REQUEST")])
const rateType = t.Union([t.Literal("HOURLY"), t.Literal("DAILY"), t.Literal("FIXED")])
const sortOptions = t.Union([
  t.Literal("newest"),
  t.Literal("price-low"),
  t.Literal("price-high"),
  t.Literal("name"),
  t.Literal("reviews-most"),
  t.Literal("reviews-least"),
])

// Shared location schemas
const fullLocation = t.Object({
  locationId:  t.String(),
  country:     t.Nullable(t.String()),
  region:      t.Nullable(t.String()),
  city:        t.Nullable(t.String()),
  street:      t.Nullable(t.String()),
  houseNumber: t.Nullable(t.String()),
})

const partialLocation = t.Object({
  country:     t.Optional(t.String()),
  region:      t.Optional(t.String()),
  city:        t.Optional(t.String()),
  street:      t.Optional(t.String()),
  houseNumber: t.Optional(t.String()),
})

// Shared response schemas
const categoryItem = t.Object({ categoryId: t.String(), name: t.String() })
const reviewItem = t.Object({
  reviewId:          t.String(),
  rating:            t.Number(),
  reviewDescription: t.Nullable(t.String()),
  reviewerId:        t.String(),
  reviewerName:      t.String(),
  createdAt:         t.Date(),
})

const postWithLocation = t.Object({
  postId:      t.String(),
  postTitle:   t.String(),
  description: t.String(),
  postType,
  price:       t.Nullable(t.String()),
  rateType:    t.Nullable(rateType),
  createdAt:   t.Date(),
  authorId:    t.String(),
  authorName:  t.String(),
  categories:  t.Array(categoryItem),
  location:    t.Nullable(t.Object({
    locationId: t.String(),
    city:       t.Nullable(t.String()),
    country:    t.Nullable(t.String()),
  })),
})

const paginatedResponse = t.Object({
  items:      t.Array(postWithLocation),
  total:      t.Number(),
  totalPages: t.Number(),
})

export const PostsModel = {
  findAllQuery: t.Object({
    search:     t.Optional(t.String()),
    type:       t.Optional(postType),
    categoryId: t.Optional(t.String()),
    sort:       t.Optional(sortOptions),
    ratingMin:  t.Optional(t.Numeric()),
    ratingMax:  t.Optional(t.Numeric()),
    offset:     t.Optional(t.Numeric()),
    size:       t.Optional(t.Numeric()),
    profileId:  t.Optional(t.String()),
  }),
  findAllResponse: paginatedResponse,
  findByIdParams: t.Object({ id: t.String() }),
  findByIdResponse: t.Object({
    postId:        t.String(),
    postTitle:     t.String(),
    description:   t.String(),
    postType,
    price:         t.Nullable(t.String()),
    rateType:      t.Nullable(rateType),
    createdAt:     t.Date(),
    authorId:      t.String(),
    authorName:    t.String(),
    categories:    t.Array(categoryItem),
    location:      t.Nullable(fullLocation),
    reviews:       t.Array(reviewItem),
    averageRating: t.Nullable(t.Number()),
    reviewCount:   t.Number(),
  }),
  createBody: t.Object({
    authorId:    t.String(),
    postTitle:   t.String({ minLength: 3 }),
    description: t.String({ minLength: 10 }),
    postType,
    price:       t.Optional(t.Union([t.String(), t.Null()])),
    rateType:    t.Optional(t.Union([rateType, t.Null()])),
    categoryIds: t.Optional(t.Array(t.String())),
    locationId:  t.Optional(t.String()),
    location:    t.Optional(partialLocation),
  }),
  createResponse: t.Object({
    postId:      t.String(),
    authorId:    t.String(),
    postTitle:   t.String(),
    description: t.String(),
    postType,
    price:       t.Nullable(t.String()),
    rateType:    t.Nullable(rateType),
    createdAt:   t.Date(),
  }),
  updateParams: t.Object({ id: t.String() }),
  updateBody: t.Object({
    postTitle:   t.Optional(t.String({ minLength: 3 })),
    description: t.Optional(t.String({ minLength: 10 })),
    postType:    t.Optional(postType),
    price:       t.Optional(t.Union([t.String(), t.Null()])),
    rateType:    t.Optional(t.Union([rateType, t.Null()])),
    categoryIds: t.Optional(t.Array(t.String())),
  }),
  updateResponse: t.Object({
    postId:      t.String(),
    postTitle:   t.String(),
    description: t.String(),
    postType,
    price:       t.Nullable(t.String()),
    rateType:    t.Nullable(rateType),
    categoryIds: t.Array(t.String()),
  }),
  deleteParams: t.Object({ id: t.String() }),
  findByProfileQuery: t.Object({
    offset: t.Optional(t.Numeric()),
    size:   t.Optional(t.Numeric()),
  }),
  findByProfileResponse: paginatedResponse,
} as const

export type PostsModel = {
  [k in keyof typeof PostsModel]: UnwrapSchema<typeof PostsModel[k]>
}
