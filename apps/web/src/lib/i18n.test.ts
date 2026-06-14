import { describe, it, expect } from 'vitest'
import { resolveInitialLanguage } from './i18n'

describe('resolveInitialLanguage', () => {
  it('reads the locale from the first path segment', () => {
    expect(resolveInitialLanguage('/sk/posts')).toBe('sk')
    expect(resolveInitialLanguage('/cs')).toBe('cs')
    expect(resolveInitialLanguage('/en/posts')).toBe('en')
  })

  // Regression: a hard refresh must render in the URL's locale, not English.
  // i18next is initialised with this value synchronously, before React renders,
  // so the first paint matches the URL — without it the async changeLanguage in
  // the /$locale beforeLoad lands after hydration and the UI stays on English.
  it('falls back to en for an unsupported or missing first segment', () => {
    expect(resolveInitialLanguage('/')).toBe('en')
    expect(resolveInitialLanguage('/fr/posts')).toBe('en')
    expect(resolveInitialLanguage('')).toBe('en')
    expect(resolveInitialLanguage(undefined)).toBe('en')
    expect(resolveInitialLanguage(null)).toBe('en')
  })
})
