import { createAuthClient } from 'better-auth/react'
import { impersonationClient } from './impersonation-client'
import { customTwoFactorClient } from './lib/two-factor-client'
import { routerRef } from './router'
import { env } from './env'

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
        void routerRef?.navigate({ to: '/verify-2fa', search })
      },
    }),
  ],
})
