import { queryOptions } from '@tanstack/react-query'
import { api } from '#/api'

export type Thread = {
  threadId: string
  postId: string
  postTitle: string
  otherPartyName: string
  lastMessage: { content: string; createdAt: Date | string; sentByMe: boolean } | null
  unreadCount: number
  myRole: 'initiator' | 'post_owner'
  postDeleted: boolean
}

export function threadsQueryOptions(profileId: string) {
  return queryOptions({
    queryKey: ['threads', profileId],
    queryFn: async () => {
      const { data, error } = await api.threads.get({ query: { profileId } })
      if (error) throw error
      return data ?? []
    },
    staleTime: 0, // always refetch — messages list must reflect sends and reads immediately
  })
}

export function threadDetailQueryOptions(threadId: string, profileId: string) {
  return queryOptions({
    queryKey: ['threads', 'detail', threadId, profileId],
    queryFn: async () => {
      const { data, error } = await api.threads({ threadId }).get({ query: { profileId } })
      if (error) throw error
      return data!
    },
  })
}

export function hasReportedMessageQueryOptions(messageId: string, profileId: string) {
  return queryOptions({
    queryKey: ['reports', 'check', 'messages', messageId, profileId],
    queryFn: async () => {
      const { status } = await api.profiles({ id: profileId }).reported.messages({ messageId }).get()
      return status === 204
    },
  })
}
