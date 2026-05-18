import { useTranslation } from 'react-i18next'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { RegisterForm } from './-components/RegisterForm'
import { currentUserQueryOptions } from '#/lib/queries/users'

export const Route = createFileRoute('/_auth/register')({
  component: RegisterPage,
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    if (user) {
      throw redirect({ to: '/' })
    }
  },
})

function RegisterPage() {
  const { t } = useTranslation()
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t('auth.register.title')}</CardTitle>
        <CardDescription>{t('auth.register.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.register.hasAccount')}{' '}
            <Link to="/login" className="font-medium hover:text-foreground">
              {t('auth.register.signIn')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
