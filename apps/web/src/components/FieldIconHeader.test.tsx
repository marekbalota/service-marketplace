import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FileText } from 'lucide-react'
import { FieldIconHeader } from './FieldIconHeader'

describe('FieldIconHeader', () => {
  it('renders the label text', () => {
    render(
      <FieldIconHeader
        icon={FileText}
        iconBgClassName="bg-blue-100"
        iconClassName="text-blue-600"
        label="Title *"
      />
    )
    expect(screen.getByText('Title *')).toBeInTheDocument()
  })

  it('forwards htmlFor to the label', () => {
    render(
      <FieldIconHeader
        icon={FileText}
        iconBgClassName="bg-blue-100"
        iconClassName="text-blue-600"
        label="Title *"
        htmlFor="postTitle"
      />
    )
    expect(screen.getByText('Title *').closest('label')).toHaveAttribute('for', 'postTitle')
  })
})
