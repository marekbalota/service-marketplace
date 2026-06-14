import { createFileRoute, redirect } from '@tanstack/react-router'
import { SUPPORTED_LOCALES } from '@marketplace/shared'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const browserLang =
      typeof navigator !== 'undefined' ? (navigator.language.split('-')[0] ?? 'en') : 'en'
    const locale = (SUPPORTED_LOCALES as readonly string[]).includes(browserLang) ? browserLang : 'en'
    throw redirect({ to: '/$locale/posts', params: { locale }, replace: true })
  },
})
