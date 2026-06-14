import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

const VALID_LOCALES = ['en', 'sk', 'cs']

export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({
    token: z.string().optional(),
    error: z.string().optional(),
  }),
  beforeLoad: ({ search }) => {
    const browserLang =
      typeof navigator !== 'undefined' ? (navigator.language.split('-')[0] ?? 'en') : 'en'
    const locale = VALID_LOCALES.includes(browserLang) ? browserLang : 'en'
    throw redirect({ to: '/$locale/reset-password', params: { locale }, search, replace: true })
  },
})
