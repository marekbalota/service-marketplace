import { useParams } from '@tanstack/react-router'
import type { Locale } from '#/routes/$locale/route'

export function useLocale(): Locale {
  return useParams({ from: '/$locale', select: (p) => p.locale }) as Locale
}
