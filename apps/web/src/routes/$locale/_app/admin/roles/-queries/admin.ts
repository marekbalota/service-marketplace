import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export const permissionsQueryOptions = queryOptions({
  queryKey: ['admin', 'permissions'],
  queryFn: async () => {
    const response = await api.admin.roles.permissions.get()
    return response.data ?? []
  },
})
