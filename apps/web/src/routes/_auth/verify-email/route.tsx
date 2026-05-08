import { createFileRoute, Outlet } from '@tanstack/react-router'

function VerifyEmailLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/_auth/verify-email')({
  component: VerifyEmailLayout,
})
