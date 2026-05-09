import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, type ProfileFormValues } from './profileSchema'
import { ProfileFields } from './ProfileFields'

function Wrapper({ defaultValues }: { defaultValues?: Partial<ProfileFormValues> }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', bio: '', phoneNumber: '', fax: '', ...defaultValues },
    mode: 'onTouched',
  })
  return (
    <form onSubmit={form.handleSubmit(() => {})}>
      <ProfileFields control={form.control} />
      <button type="submit">Submit</button>
    </form>
  )
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

  it('renders the bio as a textarea', () => {
    render(<Wrapper />)
    expect(screen.getByPlaceholderText(/tell others about yourself/i).tagName).toBe('TEXTAREA')
  })

  it('shows "Name is required" error on submit when name is empty', async () => {
    render(<Wrapper />)
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('shows "Invalid email address" error on submit when email is invalid', async () => {
    render(<Wrapper defaultValues={{ name: 'Alice', email: 'not-an-email' }} />)
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('sets aria-invalid on the email input when email validation fails', async () => {
    render(<Wrapper defaultValues={{ name: 'Alice', email: 'bad' }} />)
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('email@example.com')).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
