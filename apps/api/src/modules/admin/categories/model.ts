import { t, type UnwrapSchema } from 'elysia'
import { SUPPORTED_LOCALES } from '@marketplace/shared'

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
    sortBy: t.Optional(
      t.Union([
        t.Literal('name'),
        t.Literal('activePosts'),
        t.Literal('archivedPosts'),
        t.Literal('totalPosts'),
      ]),
    ),
    sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
    translationFilter: t.Optional(
      t.Union([
        t.Literal('complete'),
        t.Literal('incomplete'),
        t.TemplateLiteral([t.Union(SUPPORTED_LOCALES.map((l) => t.Literal(l)))]),
      ]),
    ),
  }),
  listResponse: t.Object({
    items: t.Array(categoryItemWithCounts),
    total: t.Number(),
    totalPages: t.Number(),
  }),
  createBody: t.Object({ translations }),
  createResponse: categoryItem,
  updateParams: t.Object({ id: t.String() }),
  updateBody: t.Object({ translations }),
  updateResponse: categoryItem,
  deleteParams: t.Object({ id: t.String() }),
} as const

export type AdminCategoriesModel = {
  [k in keyof typeof AdminCategoriesModel]: UnwrapSchema<(typeof AdminCategoriesModel)[k]>
}
