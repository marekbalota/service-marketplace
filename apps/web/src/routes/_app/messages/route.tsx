import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { queryOptions } from '@tanstack/react-query'
import { authClient } from '#/auth'
import { api } from '#/api'

export function threadsQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['threads', profileId],
    queryFn: async () => {
      const { data, error } = await api.threads.get({ query: { profileId } })
      if (error) throw error
      return data ?? []
    },
  })
}

export const Route = createFileRoute('/_app/messages')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60)    return 'just now'
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
