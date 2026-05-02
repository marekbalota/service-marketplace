import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { api } from '#/api'

export const usersQueryOptions = (params: {
  search: string
  role: string
  status: string
  page: number
}) => queryOptions({
  queryKey: ['admin', 'users', params],
  queryFn: async () => {
    const { data, error } = await api.admin.users.get({
      query: {
        search: params.search || undefined,
        role: params.role !== 'all' ? params.role : undefined,
        isBanned:
          params.status === 'banned' ? true :
          params.status === 'active' ? false :
          undefined,
        offset: (params.page - 1) * 10,
        size: 10,
      },
    })
    if (error) throw error
    return data
  },
  placeholderData: keepPreviousData,
})

export const assignableRolesQueryOptions = queryOptions({
  queryKey: ['admin', 'roles', 'assignable'],
  queryFn: async () => {
    const { data, error } = await api.admin.roles.assignable.get()
    if (error) throw error
    return data ?? []
  },
})
