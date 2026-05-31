import { t, type UnwrapSchema } from 'elysia'

const translations = t.Record(t.String(), t.String())

const categoryItem = t.Object({
  categoryId: t.String(),
  translations,
})

const categoryItemWithCounts = t.Object({
  categoryId: t.String(),
  translations,
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
    translations,
  }),
  createResponse: categoryItem,
  updateParams: t.Object({ id: t.String() }),
  updateBody: t.Object({
    translations,
  }),
  updateResponse: categoryItem,
  deleteParams: t.Object({ id: t.String() }),
} as const

export type AdminCategoriesModel = {
  [k in keyof typeof AdminCategoriesModel]: UnwrapSchema<(typeof AdminCategoriesModel)[k]>
}
