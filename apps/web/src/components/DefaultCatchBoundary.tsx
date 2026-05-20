import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const { t } = useTranslation()

  console.error('DefaultCatchBoundary Error:', error)

  return (
    <main className="mx-auto max-w-7xl px-4 py-50 text-center">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {t('error.label')}
      </p>
      <h1 className="mb-4 text-3xl font-semibold text-foreground">
        {t('error.somethingWentWrong')}
      </h1>
      <p className="mb-8 text-muted-foreground">{error.message || t('error.unexpected')}</p>
      <Button variant="outline" onClick={() => router.invalidate()}>
        {t('error.tryAgain')}
      </Button>
    </main>
  )
}
