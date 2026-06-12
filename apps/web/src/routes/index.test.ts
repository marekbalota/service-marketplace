import { describe, it, expect } from 'vitest'
import { resolveLocale } from './index'

describe('resolveLocale', () => {
  it('returns the language subtag for a supported locale', () => {
    expect(resolveLocale('sk-SK')).toBe('sk')
    expect(resolveLocale('cs-CZ')).toBe('cs')
    expect(resolveLocale('en-US')).toBe('en')
  })

  it('accepts a bare supported language tag without a region', () => {
    expect(resolveLocale('sk')).toBe('sk')
  })

  it('falls back to en for an unsupported language', () => {
    expect(resolveLocale('fr-FR')).toBe('en')
    expect(resolveLocale('de')).toBe('en')
  })

  // Regression: under SSR a global `navigator` exists but `navigator.language`
  // is undefined — the old guard let `.split` run on undefined and crashed the
  // root route, crashlooping the web pod.
  it('falls back to en when the language is missing (SSR)', () => {
    expect(resolveLocale(undefined)).toBe('en')
    expect(resolveLocale(null)).toBe('en')
    expect(resolveLocale('')).toBe('en')
  })
})
