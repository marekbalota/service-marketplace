import type { BetterAuthClientPlugin } from 'better-auth'
import type { BetterFetch } from 'better-auth/client'
import type { TwoFactorMethod } from '@marketplace/shared'

interface CustomTwoFactorOptions {
  onTwoFactorRedirect: (params: { twoFactorMethods?: TwoFactorMethod[] }) => void
}

export function customTwoFactorClient(options: CustomTwoFactorOptions) {
  return {
    id: 'custom-two-factor',
    fetchPlugins: [
      {
        id: 'custom-two-factor',
        name: 'custom-two-factor',
        hooks: {
          async onSuccess(context) {
            if (context.data?.twoFactorRedirect) {
              await options.onTwoFactorRedirect({
                twoFactorMethods: context.data.twoFactorMethods,
              })
            }
          },
        },
      },
    ],
    getActions: ($fetch: BetterFetch) => ({
      twoFactor: {
        sendEmailOtp: () => $fetch('/two-factor/send-email-otp', { method: 'POST' }),
        verifyEmailOtp: (data: { code: string; trustDevice?: boolean }) =>
          $fetch('/two-factor/verify-email-otp', { method: 'POST', body: data }),
        setupEmail: (data: { password: string }) =>
          $fetch('/two-factor/setup-email', { method: 'POST', body: data }),
        enableEmail: (data: { code: string }) =>
          $fetch<{ backupCodes: string[] }>('/two-factor/enable-email', {
            method: 'POST',
            body: data,
          }),
        disableEmail: (data: { password: string }) =>
          $fetch('/two-factor/disable-email', { method: 'POST', body: data }),
        setupTotp: (data: { password: string }) =>
          $fetch<{ uri: string }>('/two-factor/setup-totp', { method: 'POST', body: data }),
        enableTotp: (data: { code: string }) =>
          $fetch<{ backupCodes: string[] }>('/two-factor/enable-totp', {
            method: 'POST',
            body: data,
          }),
        verifyTotp: (data: { code: string; trustDevice?: boolean }) =>
          $fetch('/two-factor/verify-totp', { method: 'POST', body: data }),
        disableTotp: (data: { password: string }) =>
          $fetch('/two-factor/disable-totp', { method: 'POST', body: data }),
        verifyBackupCode: (data: { code: string }) =>
          $fetch('/two-factor/verify-backup-code', { method: 'POST', body: data }),
        getBackupCodes: (data: { password: string }) =>
          $fetch<{ codes: Array<{ code: string; usedAt: string | null }> }>(
            '/two-factor/get-backup-codes',
            { method: 'POST', body: data },
          ),
        regenerateBackupCodes: (data: { password: string }) =>
          $fetch<{ codes: string[] }>('/two-factor/regenerate-backup-codes', {
            method: 'POST',
            body: data,
          }),
        status: () =>
          $fetch<{ twoFactorEnabled: boolean; enabledMethods: TwoFactorMethod[] }>(
            '/two-factor/status',
            { method: 'GET', cache: 'no-store' },
          ),
      },
    }),
  } satisfies BetterAuthClientPlugin
}
