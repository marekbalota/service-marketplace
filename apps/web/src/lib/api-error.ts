export function parseAuthErrorBody(error: unknown): Record<string, unknown> | null {
  if (typeof error !== 'object' || error === null) return null
  const err = error as { body?: unknown; message?: unknown }
  // Legacy / mock format: body nested under .body
  if (typeof err.body === 'object' && err.body !== null) return err.body as Record<string, unknown>
  // @better-fetch spreads the parsed JSON body directly onto the error object,
  // so the error object itself is the body.
  if (typeof err.message === 'string') {
    try {
      return JSON.parse(err.message)
    } catch {
      // fall through
    }
  }
  return err as Record<string, unknown>
}

export function parseAuthErrorCode(error: unknown): string | undefined {
  const body = parseAuthErrorBody(error)
  return typeof body?.code === 'string' ? body.code : undefined
}

export class ApiError extends Error {
  readonly code: string | undefined
  readonly status: number | undefined
  readonly locale: string | undefined

  constructor(message: string, code?: string, status?: number, locale?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.locale = locale
  }
}

// Wraps a raw Eden Treaty error in an ApiError at the throw site.
// The cast on .value is intentional — Eden Treaty's error.value type inference
// is unreliable in practice (https://github.com/elysiajs/eden/issues/220).
export function wrapEdenError(
  error: { value: unknown; status?: number },
  fallback: string,
): ApiError {
  const v = error.value as { message?: string; code?: string; locale?: string } | null
  return new ApiError(v?.message ?? fallback, v?.code, error.status, v?.locale)
}
