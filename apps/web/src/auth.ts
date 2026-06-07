import { createAuthClient } from 'better-auth/react'
import { impersonationClient } from './impersonation-client'
import { customTwoFactorClient } from './lib/two-factor-client'
import { routerRef } from './router'
import { env } from './env'
import i18n from './lib/i18n'

let pendingTwoFactorSearch: { email?: string; redirect?: string } = {}

export function setPendingTwoFactorContext(email: string, redirect?: string) {
  pendingTwoFactorSearch = { email, redirect }
}

export const authClient = createAuthClient({
  baseURL: env.apiUrl,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    impersonationClient(),
    customTwoFactorClient({
      onTwoFactorRedirect({ twoFactorMethods }) {
        const search = { ...pendingTwoFactorSearch, twoFactorMethods }
        pendingTwoFactorSearch = {}
        const locale = i18n.language as 'en' | 'sk' | 'cs'
        void routerRef?.navigate({ to: '/$locale/verify-2fa', params: { locale }, search })
      },
    }),
  ],
})
