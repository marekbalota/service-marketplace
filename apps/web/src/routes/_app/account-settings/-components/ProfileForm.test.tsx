import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ProfileForm, ImageInputSection } from './ProfileForm'

// ── ProfileForm ───────────────────────────────────────────────────────────────

describe('ProfileForm', () => {
  const defaultValues = { name: '', email: '', bio: '', phoneNumber: '', fax: '' }

  it('renders all field labels', () => {
    render(
      <ProfileForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        submitLabel="Save"
        isPending={false}
      />,
    )
    expect(screen.getByText(/name/i)).toBeInTheDocument()
    expect(screen.getByText(/email/i)).toBeInTheDocument()
    expect(screen.getByText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByText(/fax/i)).toBeInTheDocument()
    expect(screen.getByText(/bio/i)).toBeInTheDocument()
  })

  it('renders the submit button with the given label', () => {
    render(
      <ProfileForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        submitLabel="Create Profile"
        isPending={false}
      />,
    )
    expect(screen.getByRole('button', { name: 'Create Profile' })).toBeInTheDocument()
  })

  it('disables submit button and shows saving label when isPending', () => {
    render(
      <ProfileForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        submitLabel="Save"
        isPending={true}
      />,
    )
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('pre-fills fields from defaultValues', () => {
    render(
      <ProfileForm
        defaultValues={{ name: 'Alice', email: 'alice@example.com', bio: 'Hi', phoneNumber: '123', fax: '456' }}
        onSubmit={vi.fn()}
        submitLabel="Save"
        isPending={false}
      />,
    )
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument()
  })

  it('shows validation error for invalid email on submit', async () => {
    render(
      <ProfileForm
        defaultValues={{ name: 'Alice', email: 'bad', bio: '', phoneNumber: '', fax: '' }}
        onSubmit={vi.fn()}
        submitLabel="Save"
        isPending={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('shows validation error when name is empty on submit', async () => {
    render(
      <ProfileForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        submitLabel="Save"
        isPending={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('calls onSubmit with form values when valid', async () => {
    const onSubmit = vi.fn()
    render(
      <ProfileForm
        defaultValues={{ name: 'Alice', email: 'alice@example.com', bio: '', phoneNumber: '', fax: '' }}
        onSubmit={onSubmit}
        submitLabel="Save"
        isPending={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce()
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Alice', email: 'alice@example.com' }),
        expect.anything(),
      )
    })
  })

  it('renders children inside the form', () => {
    render(
      <ProfileForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        submitLabel="Save"
        isPending={false}
      >
        <p data-testid="child">Extra content</p>
      </ProfileForm>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})

// ── ImageInputSection ─────────────────────────────────────────────────────────

describe('ImageInputSection', () => {
  it('renders the Images label', () => {
    render(
      <ImageInputSection previews={[]} onFilePicked={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(screen.getByText('Images')).toBeInTheDocument()
  })

  it('renders the add button', () => {
    render(
      <ImageInputSection previews={[]} onFilePicked={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('disables the add button when isUploading', () => {
    render(
      <ImageInputSection previews={[]} onFilePicked={vi.fn()} onRemove={vi.fn()} isUploading />,
    )
    expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
  })

  it('renders an img element for each preview', () => {
    render(
      <ImageInputSection
        previews={['blob:a', 'blob:b']}
        onFilePicked={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('calls onRemove with the correct index when remove button is clicked', () => {
    const onRemove = vi.fn()
    render(
      <ImageInputSection
        previews={['blob:a', 'blob:b']}
        onFilePicked={vi.fn()}
        onRemove={onRemove}
      />,
    )
    // Each preview has one remove button (the destructive icon buttons)
    const removeButtons = screen.getAllByRole('button').slice(0, 2)
    fireEvent.click(removeButtons[1]!)
    expect(onRemove).toHaveBeenCalledWith(1)
  })
})
