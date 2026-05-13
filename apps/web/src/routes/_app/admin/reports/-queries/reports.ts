import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { api } from '#/api'

export type ReportsParams = {
  targetType: 'POST' | 'MESSAGE' | 'REVIEW' | 'all'
  categoryId: string
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'all'
  page: number
}

export const adminReportsQueryOptions = (params: ReportsParams) =>
  queryOptions({
    queryKey: ['admin', 'reports', params],
    queryFn: async () => {
      const { data, error } = await api.admin.reports.get({
        query: {
          targetType: params.targetType !== 'all' ? params.targetType : undefined,
          categoryId: params.categoryId !== 'all' ? params.categoryId : undefined,
          status: params.status !== 'all' ? params.status : undefined,
          page: params.page,
        },
      })
      if (error) throw error
      return data
    },
    placeholderData: keepPreviousData,
  })
