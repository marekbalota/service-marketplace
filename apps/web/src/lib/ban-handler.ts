import { routerRef } from '#/router'

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
    if (routerRef) {
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
    const body = err.body as { message?: string; reason?: string | null; expiresAt?: string | null }
    if (body.message?.toLowerCase().includes('banned') ||
        body.message?.toLowerCase().includes('ban')) {
      return {
        message: body.message ?? 'Account banned',
        reason: body.reason ?? null,
        expiresAt: body.expiresAt ?? null,
      }
    }
  }

  if (typeof err.message === 'string') {
    // BetterAuth may serialize custom APIError bodies as JSON in err.message
    try {
      const parsed = JSON.parse(err.message)
      if (parsed.code === 'BANNED') {
        return {
          message: 'Account banned',
          reason: parsed.reason ?? null,
          expiresAt: parsed.expiresAt ?? null,
        }
      }
    } catch {
      // Plain string message fallback
      if (err.message.toLowerCase().includes('banned')) {
        return {
          message: err.message,
          reason: null,
          expiresAt: null,
        }
      }
    }
  }

  // authClient.signIn.email onError callback shape: { status, message }
  if (err.status === 403 && typeof err.message === 'string' &&
      err.message.toLowerCase().includes('banned')) {
    return {
      message: err.message,
      reason: null,
      expiresAt: null,
    }
  }

  return null
}
