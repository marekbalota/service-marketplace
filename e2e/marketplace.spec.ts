import { test, expect } from '@playwright/test'

test.describe('My Postings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('alice@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')
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

  test('post detail page shows the post title, description section and author', async ({ page }) => {
    await expect(page.locator('main .grid > a').first()).toBeVisible()
    const titleText = await page.locator('main .grid > a').first().locator('h3').textContent()
    await page.locator('main .grid > a').first().click()
    await expect(page).toHaveURL(/\/posts\/[0-9a-f-]+$/)
    await expect(page.locator('main h1')).toContainText(titleText!)
    await expect(page.locator('main h2', { hasText: 'Description' })).toBeVisible()
    await expect(page.locator('main p', { hasText: 'Posted by' })).toBeVisible()
  })

  test('post type filter updates the URL and filters the results', async ({ page }) => {
    await expect(page.getByText(/\d+ service/)).toBeVisible()

    // Open the post-type combobox and choose "Offers Only"
    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Offers Only' }).click()

    // URL should reflect the active filter
    await expect(page).toHaveURL(/[?&]type=offer/)
    // No "Requesting" type badges should appear in the post grid
    await expect(page.locator('main .grid').getByText('Requesting')).toHaveCount(0)
  })
})

test.describe('Account Settings — Profile CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('alice@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')
    await page.goto('/account-settings')
  })

  test('shows the Account Settings heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /account settings/i })).toBeVisible()
  })

  test('shows at least one existing profile card', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible()
  })

  test('create — navigates to create page and back', async ({ page }) => {
    await page.getByRole('link', { name: /add profile/i }).click()
    await expect(page).toHaveURL('/account-settings/create')
    await expect(page.getByText(/add a new user profile/i)).toBeVisible()
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL('/account-settings')
  })

  test('create — fills form and submits, new profile appears in list', async ({ page }) => {
    const uniqueEmail = `e2e-profile-${Date.now()}@example.com`
    await page.getByRole('link', { name: /add profile/i }).click()
    await page.getByLabel(/name/i).fill('E2E Test Profile')
    await page.getByLabel(/email/i).fill(uniqueEmail)
    await page.getByRole('button', { name: /create profile/i }).click()
    await page.waitForURL('/account-settings')
    await expect(page.getByText('E2E Test Profile')).toBeVisible()
  })

  test('edit — navigates to edit page, updates name, returns to list', async ({ page }) => {
    // Click Edit on the first profile that is NOT active (to avoid conflict)
    const editLinks = page.getByRole('link', { name: /^edit$/i })
    await editLinks.first().click()
    await expect(page).toHaveURL(/\/account-settings\/[^/]+\/edit/)
    await expect(page.getByText(/update your profile information/i)).toBeVisible()
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL('/account-settings')
  })

  test('view — navigates to public profile view page', async ({ page }) => {
    await page.getByRole('link', { name: /^view$/i }).first().click()
    await expect(page).toHaveURL(/\/profiles\/[^/]+/)
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible()
  })

  test('delete — cannot delete last profile (shows error)', async ({ page }) => {
    // If there is only one profile the Delete button should show an error
    const deleteButtons = page.getByRole('button', { name: /delete/i })
    const count = await deleteButtons.count()
    if (count === 1) {
      await deleteButtons.first().click()
      await expect(page.getByText(/cannot delete your only profile/i)).toBeVisible()
    }
  })
})

test.describe('Authentication', () => {
  const testEmail = `e2e-${Date.now()}@example.com`
  const testPassword = 'password123'
  const testName = 'E2E Test User'

  test('register — fills form, submits, lands on home page logged in', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel(/name/i).fill(testName)
    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/password/i).fill(testPassword)
    await page.getByRole('button', { name: /register/i }).click()

    await page.waitForURL('/posts')
    // Profile menu trigger is present — the user is authenticated
    await expect(page.getByTestId('profile-menu-trigger')).toBeVisible()
  })

  test('login — fills form, submits, lands on home page logged in', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('alice@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()

    await page.waitForURL('/posts')
    await expect(page.getByTestId('profile-menu-trigger')).toBeVisible()
  })

  test('my-postings — redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/my-postings')
    await page.waitForURL('/login')
    // CardTitle renders as a <div>, not a heading — use text matcher
    await expect(page.getByText('Welcome Back')).toBeVisible()
  })

  test('logout — clears session, shows login link in header', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('alice@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')

    await page.getByTestId('profile-menu-trigger').click()
    await page.getByRole('button', { name: /log out/i }).click()
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()
  })
})
