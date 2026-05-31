import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CategoryRow } from './CategoryRow'

vi.mock('#/lib/useLocale', () => ({ useLocale: () => 'en' }))

const baseCategory = {
  categoryId: 'cat-1',
  translations: { en: 'Cleaning', sk: 'Čistenie', cs: 'Úklid' },
  activePosts: 3,
  archivedPosts: 1,
}

function renderRow(overrides?: Partial<typeof baseCategory>) {
  return render(
    <CategoryRow
      category={{ ...baseCategory, ...overrides }}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  )
}

describe('CategoryRow', () => {
  it('displays the locale name with EN fallback', () => {
    renderRow()
    expect(screen.getByText('Cleaning')).toBeInTheDocument()
  })

  it('shows locale chips for each supported locale', () => {
    renderRow()
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('SK')).toBeInTheDocument()
    expect(screen.getByText('CS')).toBeInTheDocument()
  })

  it('shows 3/3 fraction when all locales are present', () => {
    renderRow()
    expect(screen.getByText('3/3')).toBeInTheDocument()
  })

  it('shows 1/3 fraction when only EN is present', () => {
    renderRow({ translations: { en: 'Cleaning' } })
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('applies green colour class when complete', () => {
    renderRow()
    const fraction = screen.getByText('3/3').closest('span')
    expect(fraction?.className).toMatch(/green/)
  })

  it('applies amber colour class when incomplete', () => {
    renderRow({ translations: { en: 'Cleaning' } })
    const fraction = screen.getByText('1/3').closest('span')
    expect(fraction?.className).toMatch(/amber/)
  })

  it('calls onEdit when Edit button is clicked', () => {
    const onEdit = vi.fn()
    render(<CategoryRow category={baseCategory} onEdit={onEdit} onDelete={vi.fn()} />)
    screen.getByRole('button', { name: /edit/i }).click()
    expect(onEdit).toHaveBeenCalledWith(baseCategory)
  })

  it('calls onDelete when Delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<CategoryRow category={baseCategory} onEdit={vi.fn()} onDelete={onDelete} />)
    screen.getByRole('button', { name: /delete/i }).click()
    expect(onDelete).toHaveBeenCalledWith(baseCategory)
  })
})
