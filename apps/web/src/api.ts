import { treaty } from '@elysiajs/eden'
import type { App } from 'api'
import { env } from './env'
import i18next from 'i18next'

export const api = treaty<App>(env.apiUrl, {
  fetch: {
    credentials: 'include',
  },
  headers: () => ({
    'Accept-Language': i18next.language ?? 'en',
  }),
})
