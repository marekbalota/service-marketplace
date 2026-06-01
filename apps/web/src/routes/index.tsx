import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const browserLang =
      typeof navigator !== 'undefined' ? (navigator.language.split('-')[0] ?? 'en') : 'en'
    const locale = ['en', 'sk', 'cs'].includes(browserLang) ? browserLang : 'en'
    throw redirect({ to: '/$locale/posts', params: { locale }, replace: true })
  },
})
