import { t, type UnwrapSchema } from 'elysia'

const categoryItem = t.Object({
  categoryId: t.String(),
  name: t.String(),
})

const categoryItemWithCounts = t.Object({
  categoryId: t.String(),
  name: t.String(),
  activePosts: t.Number(),
  archivedPosts: t.Number(),
})

export const AdminCategoriesModel = {
  listQuery: t.Object({
    search: t.Optional(t.String()),
    offset: t.Optional(t.Numeric()),
    size: t.Optional(t.Numeric()),
  }),
  listResponse: t.Object({
    items: t.Array(categoryItemWithCounts),
    total: t.Number(),
    totalPages: t.Number(),
  }),
  createBody: t.Object({
    name: t.String({ minLength: 1 }),
  }),
  createResponse: categoryItem,
  updateParams: t.Object({ id: t.String() }),
  updateBody: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
  }),
  updateResponse: categoryItem,
  deleteParams: t.Object({ id: t.String() }),
} as const

export type AdminCategoriesModel = {
  [k in keyof typeof AdminCategoriesModel]: UnwrapSchema<(typeof AdminCategoriesModel)[k]>
}
