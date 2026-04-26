import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export const rolesQueryOptions = queryOptions({
  queryKey: ['admin', 'roles'],
  queryFn: async () => {
    const { data, error } = await api.admin.roles.get()
    if (error) throw error
    return data ?? []
  },
})
