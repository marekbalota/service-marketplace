import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { z } from 'zod'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@marketplace/shared'
import en from '../translations/en.json'
import sk from '../translations/sk.json'
import cs from '../translations/cs.json'
import { zodErrorMap } from './zodErrorMap'

/**
 * Resolve the initial language from the URL's first path segment (`/sk/posts`).
 *
 * i18next is initialised with this value synchronously, before React renders,
 * so the first paint already matches the URL's locale. Relying solely on the
 * async `changeLanguage` in the `/$locale` route's `beforeLoad` is not enough:
 * on a hard refresh that change lands during/after hydration, and
 * `useSyncExternalStore` (which react-i18next uses internally) does not pick up
 * store mutations that happen in the hydration window — so the UI stays stuck
 * on the fallback language until an unrelated re-render recomputes translations.
 */
export function resolveInitialLanguage(pathname?: string | null): SupportedLocale {
  const segment = pathname?.split('/')[1] ?? ''
  return (SUPPORTED_LOCALES as readonly string[]).includes(segment)
    ? (segment as SupportedLocale)
    : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sk: { translation: sk },
    cs: { translation: cs },
  },
  lng: resolveInitialLanguage(typeof window !== 'undefined' ? window.location.pathname : undefined),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

z.config({ customError: zodErrorMap })

export default i18n
