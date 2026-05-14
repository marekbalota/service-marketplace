import { useTranslation } from 'react-i18next'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { LoginForm } from './-components/LoginForm'
import { currentUserQueryOptions } from '#/lib/queries/users'

export const Route = createFileRoute('/_auth/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: (search.redirect?.startsWith('/') ? search.redirect : '/') as '/' })
    }
  },
})

function LoginPage() {
  const { t } = useTranslation()
  const { redirect } = Route.useSearch()
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.login.title')}</CardTitle>
        <CardDescription>{t('auth.login.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirect={redirect} />
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.login.noAccount')}{' '}
            <Link to="/register" className="font-medium hover:text-foreground">
              {t('auth.login.createOne')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
