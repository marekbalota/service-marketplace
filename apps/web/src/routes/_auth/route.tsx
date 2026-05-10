import { createFileRoute, Outlet } from '@tanstack/react-router'

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Outlet />
    </div>
  )
}

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})
