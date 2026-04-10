import { test, expect } from '@playwright/test'

test.describe('My Postings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-postings')
  })

  test('shows the page heading and subtitle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'My Postings' })).toBeVisible()
    await expect(page.getByText('Manage your service offerings')).toBeVisible()
  })

  test('shows posts or an empty state after data loads', async ({ page }) => {
    await expect(
      page.getByText("You haven't created any postings yet.").or(page.locator('main .grid').first()),
    ).toBeVisible()
  })
})

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
    await page.waitForResponse(resp => resp.url().includes('/posts') && resp.status() === 200)

    const filteredText = await page.getByText(/\d+ service/).textContent()
    const totalAfter = parseInt(filteredText!.match(/\d+/)![0]!)

    expect(totalAfter).toBeLessThanOrEqual(totalBefore)
  })

  test('shows empty state when search yields no results', async ({ page }) => {
    await page.getByPlaceholder('Search services, providers, or keywords...').fill('zzznomatch999')
    await page.waitForResponse(resp => resp.url().includes('/posts') && resp.status() === 200)

    await expect(page.getByText('No services found matching your criteria.')).toBeVisible()
  })

  test('pagination controls appear when there are multiple pages', async ({ page }) => {
    const totalText = await page.getByText(/\d+ service/).textContent()
    const total = parseInt(totalText!.match(/\d+/)![0]!)

    if (total > 12) {
      await expect(page.getByRole('navigation')).toBeVisible()
      await expect(page.getByLabel('Go to next page')).toBeVisible()
    }
  })

  test('clicking a post card navigates to post detail page', async ({ page }) => {
    // Wait for real post cards to load (skeletons are divs, PostCards are <a> tags)
    await expect(page.locator('main .grid > a').first()).toBeVisible()
    // Click first post card
    await page.locator('main .grid > a').first().click()
    // Should navigate to /posts/:id
    await expect(page).toHaveURL(/\/posts\/[0-9a-f-]+$/)
    // Back button should be visible
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  })
})
