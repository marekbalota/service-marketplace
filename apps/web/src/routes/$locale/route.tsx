import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import i18n from '#/lib/i18n'

const VALID_LOCALES = ['en', 'sk', 'cs'] as const
export type Locale = (typeof VALID_LOCALES)[number]

export const Route = createFileRoute('/$locale')({
  beforeLoad: async ({ params }) => {
    if (!(VALID_LOCALES as readonly string[]).includes(params.locale)) {
      throw redirect({ to: '/$locale/posts', params: { locale: 'en' }, replace: true })
    }
    const locale = params.locale as Locale
    if (i18n.language !== locale) {
      await i18n.changeLanguage(locale)
    }
  },
  component: Outlet,
})
