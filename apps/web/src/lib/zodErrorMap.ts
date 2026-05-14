import type { $ZodRawIssue } from 'zod/v4/core'
import i18next from 'i18next'

// Zod v4: single `issue` argument, return null/undefined to keep Zod's default.
// Import i18next directly (not ./i18n) to avoid a circular dependency.
export function zodErrorMap(issue: $ZodRawIssue): { message: string } | null {
  switch (issue.code) {
    case 'invalid_type':
      // Field was required but received undefined/null
      return { message: i18next.t('validation.required') }

    case 'too_small':
      // origin: 'string' | 'number' | 'array' | ...
      if (issue.origin === 'string') {
        if (Number(issue.minimum) <= 1) return { message: i18next.t('validation.required') }
        return { message: i18next.t('validation.minLength', { min: Number(issue.minimum) }) }
      }
      if (issue.origin === 'number' || issue.origin === 'int') {
        return { message: i18next.t('validation.numberMin', { min: Number(issue.minimum) }) }
      }
      break

    case 'too_big':
      if (issue.origin === 'string') {
        return { message: i18next.t('validation.maxLength', { max: Number(issue.maximum) }) }
      }
      if (issue.origin === 'number' || issue.origin === 'int') {
        return { message: i18next.t('validation.numberMax', { max: Number(issue.maximum) }) }
      }
      break

    case 'invalid_format':
      if (issue.format === 'email') return { message: i18next.t('validation.email') }
      if (issue.format === 'uuid') return { message: i18next.t('validation.selectOption') }
      break
  }

  return null
}
