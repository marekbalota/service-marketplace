import { createFileRoute, Outlet } from '@tanstack/react-router'

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Outlet />
    </div>
  )
}

export const Route = createFileRoute('/$locale/_auth')({
  component: AuthLayout,
})
