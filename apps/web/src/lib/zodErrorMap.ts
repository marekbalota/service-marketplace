import type { $ZodRawIssue } from 'zod/v4/core'
import i18n from './i18n'

// Zod v4 error map: single `issue` argument, return null/undefined to keep Zod's default.
export function zodErrorMap(issue: $ZodRawIssue): { message: string } | null {
  switch (issue.code) {
    case 'invalid_type':
      return { message: i18n.t('validation.required') }

    case 'too_small':
      if (issue.type === 'string') {
        if (Number(issue.minimum) <= 1) return { message: i18n.t('validation.required') }
        return { message: i18n.t('validation.minLength', { min: Number(issue.minimum) }) }
      }
      if (issue.type === 'number') {
        return { message: i18n.t('validation.numberMin', { min: Number(issue.minimum) }) }
      }
      break

    case 'too_big':
      if (issue.type === 'string') {
        return { message: i18n.t('validation.maxLength', { max: Number(issue.maximum) }) }
      }
      if (issue.type === 'number') {
        return { message: i18n.t('validation.numberMax', { max: Number(issue.maximum) }) }
      }
      break

    case 'invalid_format':
      if (issue.format === 'email') return { message: i18n.t('validation.email') }
      if (issue.format === 'uuid') return { message: i18n.t('validation.selectOption') }
      break
  }

  return null
}
