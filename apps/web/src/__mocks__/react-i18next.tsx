import { vi } from 'vitest'
import en from '../translations/en.json'

type TranslationObject = { [key: string]: string | TranslationObject }

function getNestedValue(obj: TranslationObject, path: string): string | undefined {
  const keys = path.split('.')
  let current: string | TranslationObject = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined
    const next: string | TranslationObject | undefined = (current as TranslationObject)[key]
    if (next === undefined) return undefined
    current = next
  }
  return typeof current === 'string' ? current : undefined
}

function t(key: string, opts?: Record<string, unknown>): string {
  let resolvedKey = key

  if (opts && typeof opts.count === 'number') {
    const count = opts.count
    // Plural suffix priority: _zero → _one → _other (fallback like i18next does for English)
    const suffixes =
      count === 0 ? ['_zero', '_other'] : count === 1 ? ['_one', '_other'] : ['_other']
    for (const suffix of suffixes) {
      const plural = getNestedValue(en as TranslationObject, `${key}${suffix}`)
      if (plural !== undefined) {
        resolvedKey = `${key}${suffix}`
        break
      }
    }
  }

  let value = getNestedValue(en as TranslationObject, resolvedKey) ?? key
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      value = value.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
    }
  }
  return value
}

export const useTranslation = vi.fn(() => ({
  t,
  i18n: {
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    language: 'en',
  },
}))

export const Trans = ({ children }: { children: React.ReactNode }) => children as React.ReactElement

export const initReactI18next = { type: '3rdParty' as const, init: vi.fn() }
