import { describe, it, expect } from 'bun:test'
import { resolveLocale } from './resolveLocale'

describe('resolveLocale', () => {
  it('returns sk for sk', () => expect(resolveLocale('sk')).toBe('sk'))
  it('strips region from sk-SK', () => expect(resolveLocale('sk-SK')).toBe('sk'))
  it('strips region from en-US', () => expect(resolveLocale('en-US')).toBe('en'))
  it('returns en for unsupported locale de', () => expect(resolveLocale('de')).toBe('en'))
  it('returns en for null', () => expect(resolveLocale(null)).toBe('en'))
  it('returns en for undefined', () => expect(resolveLocale(undefined)).toBe('en'))
  it('returns en for empty string', () => expect(resolveLocale('')).toBe('en'))
  it('returns en for malformed string', () => expect(resolveLocale('not-a!!!')).toBe('en'))
  it('handles multi-value Accept-Language, picks first', () =>
    expect(resolveLocale('sk-SK,sk;q=0.9,en;q=0.8')).toBe('sk'))
})
