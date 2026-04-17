import type React from 'react'

interface EmptyStateProps {
  message: string
  children?: React.ReactNode
}

export function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
