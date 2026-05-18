export const ErrorCodes = {
  ImpersonationReadOnly: 'IMPERSONATION_READ_ONLY',
  Banned: 'BANNED',
  CaptchaVerificationFailed: 'CAPTCHA_VERIFICATION_FAILED',
  MissingCaptchaResponse: 'MISSING_CAPTCHA_RESPONSE',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]
