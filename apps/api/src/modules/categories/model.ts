import { t, type UnwrapSchema } from 'elysia'

export const CategoriesModel = {
  findAllResponse: t.Array(
    t.Object({
      categoryId: t.String(),
      name: t.String(),
    }),
  ),
} as const

export type CategoriesModel = {
  [k in keyof typeof CategoriesModel]: UnwrapSchema<(typeof CategoriesModel)[k]>
}
