import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormValues } from './profileSchema'
import { ProfileFields } from './ProfileFields'

function Wrapper() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', bio: '', phoneNumber: '', fax: '' },
  })
  return <ProfileFields control={form.control} />
}

describe('ProfileFields', () => {
  it('renders all five field labels', () => {
    render(<Wrapper />)
    expect(screen.getByText('Name *')).toBeInTheDocument()
    expect(screen.getByText('Email *')).toBeInTheDocument()
    expect(screen.getByText('Phone Number')).toBeInTheDocument()
    expect(screen.getByText('Fax')).toBeInTheDocument()
    expect(screen.getByText('Bio')).toBeInTheDocument()
  })
})
