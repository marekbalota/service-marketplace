import { t, type UnwrapSchema } from 'elysia'

const translationItem = t.Object({
  locale: t.String(),
  name: t.String(),
})

const categoryItem = t.Object({
  categoryId: t.String(),
  translations: t.Array(translationItem),
})

const categoryItemWithCounts = t.Object({
  categoryId: t.String(),
  translations: t.Array(translationItem),
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
    translations: t.Array(translationItem, { minItems: 1 }),
  }),
  createResponse: categoryItem,
  updateParams: t.Object({ id: t.String() }),
  updateBody: t.Object({
    translations: t.Array(translationItem),
  }),
  updateResponse: categoryItem,
  deleteParams: t.Object({ id: t.String() }),
} as const

export type AdminCategoriesModel = {
  [k in keyof typeof AdminCategoriesModel]: UnwrapSchema<(typeof AdminCategoriesModel)[k]>
}
