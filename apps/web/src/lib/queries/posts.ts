// apps/web/src/lib/queries/posts.ts
import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export const categoriesQueryOptions = queryOptions({
  queryKey: ['categories'],
  queryFn: async () => {
    const { data, error } = await api.categories.get()
    if (error) throw error
    return data
  },
})
