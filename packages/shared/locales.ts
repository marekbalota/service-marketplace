export const SUPPORTED_LOCALES = ['en', 'sk', 'cs'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export type TranslatableLocale = Exclude<SupportedLocale, 'en'>
export const TRANSLATABLE_LOCALES = SUPPORTED_LOCALES.filter(
  (l): l is TranslatableLocale => l !== 'en'
)
