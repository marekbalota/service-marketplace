import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@marketplace/shared'
import i18n from '#/lib/i18n'

export const Route = createFileRoute('/$locale')({
  beforeLoad: async ({ params }) => {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(params.locale)) {
      throw redirect({ to: '/$locale/posts', params: { locale: 'en' }, replace: true })
    }
    const locale = params.locale as SupportedLocale
    if (i18n.language !== locale) {
      await i18n.changeLanguage(locale)
    }
  },
  component: Outlet,
})
