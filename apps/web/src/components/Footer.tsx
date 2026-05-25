import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="border-t bg-card py-6 text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 text-center">
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </div>
    </footer>
  )
}
