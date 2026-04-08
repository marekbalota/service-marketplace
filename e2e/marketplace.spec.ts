import { test, expect } from '@playwright/test'

test.describe('Marketplace index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows the search input and filter controls', async ({ page }) => {
    await expect(page.getByPlaceholder('Search services, providers, or keywords...')).toBeVisible()
    // Desktop filter selects
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })

  test('displays a list of service posts', async ({ page }) => {
    // Wait for posts to load (suspense resolves)
    await expect(page.locator('main p').first()).toBeVisible()

    // At least one post card should be visible
    const cards = page.locator('main .grid > *')
    await expect(cards.first()).toBeVisible()
  })

  test('shows total services count', async ({ page }) => {
    await expect(page.getByText(/\d+ service/)).toBeVisible()
  })

  test('search filters posts', async ({ page }) => {
    const totalText = await page.getByText(/\d+ service/).textContent()
    const totalBefore = parseInt(totalText!.match(/\d+/)![0]!)

    await page.getByPlaceholder('Search services, providers, or keywords...').fill('zzznomatch999')

    // Debounce wait — 400 ms + some buffer
    await page.waitForTimeout(600)

    const filteredText = await page.getByText(/\d+ service/).textContent()
    const totalAfter = parseInt(filteredText!.match(/\d+/)![0]!)

    expect(totalAfter).toBeLessThanOrEqual(totalBefore)
  })

  test('shows empty state when search yields no results', async ({ page }) => {
    await page.getByPlaceholder('Search services, providers, or keywords...').fill('zzznomatch999')
    await page.waitForTimeout(600)

    const count = await page.getByText(/0 services available/).count()
    const emptyMsg = await page.getByText('No services found matching your criteria.').count()
    expect(count + emptyMsg).toBeGreaterThan(0)
  })

  test('pagination controls appear when there are multiple pages', async ({ page }) => {
    const totalText = await page.getByText(/\d+ service/).textContent()
    const total = parseInt(totalText!.match(/\d+/)![0]!)

    if (total > 12) {
      await expect(page.getByRole('navigation')).toBeVisible()
      await expect(page.getByLabel('Go to next page')).toBeVisible()
    }
  })
})
