import { SUPPORTED_LOCALES } from '@marketplace/shared'

export function resolveLocale(header: string | null | undefined): string {
  try {
    const raw = header?.split(',')[0]?.trim()
    if (!raw) return 'en'
    const lang = new Intl.Locale(raw).language
    return (SUPPORTED_LOCALES as readonly string[]).includes(lang) ? lang : 'en'
  } catch {
    return 'en'
  }
}
