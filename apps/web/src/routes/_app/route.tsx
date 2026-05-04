import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Footer } from '#/components/Footer'
import { Header } from '#/components/Header'
import { currentUserQueryOptions } from '#/lib/queries/users'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
  beforeLoad: async ({ context : { queryClient } }) => {
    const user = await queryClient.fetchQuery(currentUserQueryOptions)
    return { user }
  },
})

function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
