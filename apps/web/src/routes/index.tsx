import { createFileRoute, redirect } from '@tanstack/react-router'
import { SUPPORTED_LOCALES } from '@marketplace/shared'

/**
 * Resolve the initial locale from a browser language tag (e.g. "sk-SK").
 *
 * Falls back to 'en' when the language is missing or unsupported. The missing
 * case matters under SSR: the server runtime (Bun/Node) exposes a global
 * `navigator` object, so a `typeof navigator !== 'undefined'` guard passes, but
 * `navigator.language` is `undefined` there — reading `.split` on it throws and
 * crashes the root route. Accepting an optional language keeps this safe.
 */
export function resolveLocale(language?: string | null): string {
  const lang = language?.split('-')[0] ?? 'en'
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang) ? lang : 'en'
}

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const language = typeof navigator !== 'undefined' ? navigator.language : undefined
    const locale = resolveLocale(language)
    throw redirect({ to: '/$locale/posts', params: { locale }, replace: true })
  },
})
