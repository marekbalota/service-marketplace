import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'
import { impersonationClient } from './impersonation-client'
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
    twoFactorClient({
      onTwoFactorRedirect() {
        const search = pendingTwoFactorSearch
        pendingTwoFactorSearch = {}
        void routerRef?.navigate({ to: '/verify-2fa', search })
      },
    }),
  ],
})
