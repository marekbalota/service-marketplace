import { useParams } from '@tanstack/react-router'
import type { SupportedLocale } from '@marketplace/shared'

export function useLocale(): SupportedLocale {
  return useParams({ from: '/$locale', select: (p) => p.locale }) as SupportedLocale
}
