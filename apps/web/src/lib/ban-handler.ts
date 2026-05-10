import { queryClient, routerRef } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'
import { parseAuthErrorBody } from '#/lib/api-error'
import { ErrorCodes } from '@marketplace/shared'

const STORAGE_KEY = 'activeProfileId'

interface BanError {
  message: string
  reason: string | null
  expiresAt: string | null
}

export function handleBanError(error: unknown): boolean {
  const banInfo = extractBanInfo(error)
  if (banInfo) {
    sessionStorage.setItem(
      'banInfo',
      JSON.stringify({
        reason: banInfo.reason,
        expiresAt: banInfo.expiresAt,
      }),
    )
    queryClient.removeQueries({ queryKey: currentUserQueryOptions.queryKey })
    localStorage.removeItem(STORAGE_KEY)
    if (routerRef) {
      void routerRef.invalidate()
      void routerRef.navigate({ to: '/banned' })
    } else {
      window.location.href = '/banned'
    }
    return true
  }
  return false
}

function extractBanInfo(error: unknown): BanError | null {
  const body = parseAuthErrorBody(error)
  if (body?.code !== ErrorCodes.Banned) return null
  return {
    message: (body.message as string) ?? 'Account banned',
    reason: (body.reason as string) ?? null,
    expiresAt: (body.expiresAt as string) ?? null,
  }
}
