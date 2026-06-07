import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$locale/_app/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$locale/posts', params })
  },
})
