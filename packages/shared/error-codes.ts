export const ErrorCodes = {
  ImpersonationReadOnly: 'IMPERSONATION_READ_ONLY',
  Banned: 'BANNED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
