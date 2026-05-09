export class ApiError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

// Wraps a raw Eden Treaty error in an ApiError at the throw site.
// The cast on .value is intentional — Eden Treaty's error.value type inference
// is unreliable in practice (https://github.com/elysiajs/eden/issues/220).
export function wrapEdenError(error: { value: unknown }, fallback: string): ApiError {
  const v = error.value as { message?: string; code?: string } | null
  return new ApiError(v?.message ?? fallback, v?.code)
}
