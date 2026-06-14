import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AvatarSection } from './AvatarSection'

vi.mock('#/api', () => ({
  api: {
    profiles: () => ({
      avatar: {
        put: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockResolvedValue({ error: null }),
      },
    }),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn }: { mutationFn: unknown }) => ({
    mutate: mutationFn,
    isPending: false,
    isError: false,
    error: null,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('#/lib/queries/users', () => ({ currentUserQueryOptions: { queryKey: ['users', 'me'] } }))
vi.mock('#/lib/queries/profiles', () => ({ profileQueryOptions: () => ({ queryKey: [] }) }))

describe('AvatarSection', () => {
  it('renders the change avatar button', () => {
    render(<AvatarSection profileId="p1" name="Test User" imageUrl={null} />)
    expect(screen.getByRole('button', { name: 'profiles.changeAvatar' })).toBeInTheDocument()
  })

  it('does not render remove button when no imageUrl', () => {
    render(<AvatarSection profileId="p1" name="Test User" imageUrl={null} />)
    expect(screen.queryByText('profiles.removeAvatar')).not.toBeInTheDocument()
  })

  it('renders remove button when imageUrl is set', () => {
    render(
      <AvatarSection profileId="p1" name="Test User" imageUrl="https://example.com/avatar.jpg" />,
    )
    expect(screen.getByText('profiles.removeAvatar')).toBeInTheDocument()
  })

  it('triggers file input click when change button is clicked', () => {
    render(<AvatarSection profileId="p1" name="Test User" imageUrl={null} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'profiles.changeAvatar' }))
    expect(clickSpy).toHaveBeenCalled()
  })
})
