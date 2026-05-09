import { queryClient, routerRef } from '#/router'
import { currentUserQueryOptions } from '#/lib/queries/users'
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
    sessionStorage.setItem('banInfo', JSON.stringify({
      reason: banInfo.reason,
      expiresAt: banInfo.expiresAt,
    }))
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
  if (typeof error !== 'object' || error === null) {
    return null
  }

  const err = error as { message?: unknown; body?: unknown; status?: unknown }

  // Eden Treaty API errors — body contains the parsed response
  if (err.body && typeof err.body === 'object') {
    const body = err.body as { code?: string; message?: string; reason?: string | null; expiresAt?: string | null }
    if (body.code === ErrorCodes.Banned) {
      return {
        message: body.message ?? 'Account banned',
        reason: body.reason ?? null,
        expiresAt: body.expiresAt ?? null,
      }
    }
  }

  if (typeof err.message === 'string') {
    // BetterAuth serializes APIError bodies as JSON in err.message
    try {
      const parsed = JSON.parse(err.message)
      if (parsed.code === ErrorCodes.Banned) {
        return {
          message: parsed.message ?? 'Account banned',
          reason: parsed.reason ?? null,
          expiresAt: parsed.expiresAt ?? null,
        }
      }
    } catch {
      // not JSON — not a structured ban error
    }
  }

  return null
}
