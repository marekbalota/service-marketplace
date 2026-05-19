import { vi } from 'vitest'
import en from '../translations/en.json'

type TranslationObject = { [key: string]: string | TranslationObject }

function getNestedValue(obj: TranslationObject, path: string): string | undefined {
  const keys = path.split('.')
  let current: string | TranslationObject = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as TranslationObject)[key] ?? ''
  }
  return typeof current === 'string' ? current : undefined
}

function t(key: string, opts?: Record<string, unknown>): string {
  let value = getNestedValue(en as TranslationObject, key) ?? key
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
