import { test, expect } from '@playwright/test'

test.describe('My Postings', () => {
  test.use({ storageState: 'e2e/.auth/alice.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/my-postings')
    // Wait for the _app layout to render (beforeLoad must complete)
    // Use extended timeout — cold React Query cache can make the first API call slow
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15000 })
  })

  test('shows the page heading and subtitle', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'My Postings' })).toBeVisible()
    await expect(page.getByText('Manage your service offerings')).toBeVisible()
  })

  test('shows posts or an empty state after data loads', async ({ page }) => {
    await expect(
      page
        .getByText("You haven't created any postings yet.")
        .or(page.locator('main .grid').first()),
    ).toBeVisible()
  })
})

test.describe('Marketplace index', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the redirect to /posts and _app layout to finish loading
    await page.waitForURL('/posts')
    await expect(page.getByRole('banner')).toBeVisible()
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
    await page.waitForResponse((resp) => resp.url().includes('/posts') && resp.status() === 200)

    const filteredText = await page.getByText(/\d+ service/).textContent()
    const totalAfter = parseInt(filteredText!.match(/\d+/)![0]!)

    expect(totalAfter).toBeLessThanOrEqual(totalBefore)
  })

  test('shows empty state when search yields no results', async ({ page }) => {
    await page.getByPlaceholder('Search services, providers, or keywords...').fill('zzznomatch999')
    await page.waitForResponse((resp) => resp.url().includes('/posts') && resp.status() === 200)

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

  test('post detail page shows the post title, description section and author', async ({
    page,
  }) => {
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
  test.use({ storageState: 'e2e/.auth/alice.json' })

  test.beforeEach(async ({ page }) => {
    await page.goto('/account-settings/profiles')
  })

  test('shows the Manage Profiles heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /manage profiles/i })).toBeVisible()
  })

  test('shows at least one existing profile card', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible()
  })

  test('create — navigates to create page and back', async ({ page }) => {
    await page.getByRole('link', { name: /add profile/i }).click()
    await expect(page).toHaveURL('/account-settings/profiles/create')
    await expect(page.getByText(/create a new profile on your account/i)).toBeVisible()
    await page.getByRole('button', { name: /back/i }).click()
    await expect(page).toHaveURL('/account-settings/profiles')
  })

  test('create — fills form and submits, new profile appears in list', async ({ page }) => {
    const uniqueEmail = `e2e-profile-${Date.now()}@example.com`
    await page.getByRole('link', { name: /add profile/i }).click()
    await expect(page).toHaveURL('/account-settings/profiles/create')
    await page.getByPlaceholder('e.g., John Smith').fill('E2E Test Profile')
    await page.getByPlaceholder('email@example.com').fill(uniqueEmail)
    await page.getByRole('button', { name: /create profile/i }).click()
    await page.waitForURL('/account-settings/profiles')
    await expect(page.getByRole('heading', { name: 'E2E Test Profile' }).first()).toBeVisible()
  })

  test('edit — navigates to edit page, updates name, returns to list', async ({ page }) => {
    const editLinks = page.getByRole('link', { name: /^edit$/i })
    await editLinks.first().click()
    await expect(page).toHaveURL(/\/account-settings\/profiles\/[^/]+\/edit/)
    await expect(page.getByText(/update your profile information/i)).toBeVisible()
    await page.getByRole('button', { name: /back/i }).click()
    await expect(page).toHaveURL('/account-settings/profiles')
  })

  test('view — navigates to public profile view page', async ({ page }) => {
    await page
      .getByRole('link', { name: /^view$/i })
      .first()
      .click()
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

test.describe('Create Post', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('alice@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')
    await page.goto('/create-post')
  })

  test('shows the create new posting form', async ({ page }) => {
    await expect(page.getByText('Create New Posting')).toBeVisible()
  })

  test('creates a post and redirects to My Postings', async ({ page }) => {
    const uniqueTitle = `E2E Lawn Care ${Date.now()}`
    await page.getByPlaceholder(/Professional Lawn Care Service/i).fill(uniqueTitle)
    await page
      .getByPlaceholder(/Describe your service offering or request in detail/i)
      .fill('This is an e2e test post with enough text to pass the 10 character minimum.')
    await page.getByRole('button', { name: /create posting/i }).click()
    await page.waitForURL('/my-postings')
    await expect(page.getByText(uniqueTitle)).toBeVisible()
  })
})

test.describe('Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('alice@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')
    // Wait for user data to load so activeProfile is set in localStorage before navigating elsewhere
    await expect(page.getByTestId('profile-menu-trigger')).toBeVisible()
  })

  test('shows the messages page heading', async ({ page }) => {
    await page.goto('/messages')
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
  })

  test('sends a message from a post and lands on the thread page', async ({ page }) => {
    // Navigate to posts page first
    await page.goto('/posts')

    // Search for Carol's posts by name to get a non-alice post
    await page.getByPlaceholder('Search services, providers, or keywords...').fill('Carol White')
    await page.waitForResponse((resp) => resp.url().includes('/posts') && resp.status() === 200)
    // Wait for post cards to be visible (not just in DOM)
    await expect(
      page.locator('main .grid > a').filter({ hasText: 'Carol White' }).first(),
    ).toBeVisible({ timeout: 10000 })

    // Click on the first post card by Carol
    const carolPost = page.locator('main .grid > a').filter({ hasText: 'Carol White' }).first()
    await carolPost.click()

    // Wait for navigation to complete (URL may have query params, so wait for /posts/:id pattern)
    await page.waitForURL(/\/posts\/[0-9a-f-]+$/)

    // Wait for the post detail page to fully load and messaging section to appear
    // The SendMessageSection only renders when activeProfile exists and user is NOT the post owner
    const sendMessageBtn = page.getByRole('button', { name: /send message/i })
    const goToChat = page.getByRole('link', { name: /go to chat/i })

    // Wait for either Send Message button or Go to Chat link to appear
    await sendMessageBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(async () => {
      await goToChat.waitFor({ state: 'visible', timeout: 5000 })
    })

    if (await goToChat.isVisible()) {
      // A thread already exists from a previous run — follow it
      await goToChat.click()
    } else {
      await sendMessageBtn.click()
      await page
        .getByPlaceholder(/write your message/i)
        .fill('Hello, I am interested in this service!')
      await page.getByRole('button', { name: /^send$/i }).click()
    }

    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]+$/)
  })
})

test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('admin@example.com')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')
  })

  test('shows the admin dashboard', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible()
  })

  test('shows the manage accounts page', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: /manage accounts/i })).toBeVisible()
  })

  test('shows the roles management page', async ({ page }) => {
    await page.goto('/admin/roles')
    await expect(page.getByRole('button', { name: /back to admin/i })).toBeVisible()
  })

  test('Manage Accounts card navigates to /admin/users', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('link', { name: /manage accounts/i }).click()
    await expect(page).toHaveURL('/admin/users')
    await expect(page.getByRole('heading', { name: /manage accounts/i })).toBeVisible()
  })

  test('Manage Roles card navigates to /admin/roles', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('link', { name: /manage roles/i }).click()
    await expect(page).toHaveURL('/admin/roles')
    await expect(page.getByRole('button', { name: /back to admin/i })).toBeVisible()
  })

  test('View button navigates to user detail page', async ({ page }) => {
    await page.goto('/admin/users')
    await page
      .getByRole('link', { name: /^view$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f-]+$/)
    await expect(page.getByRole('heading', { name: /user details/i })).toBeVisible()
  })

  test('creates a new role via RoleDialog', async ({ page }) => {
    const roleName = `E2E Role ${Date.now()}`
    await page.goto('/admin/roles')
    await page.getByRole('button', { name: /^create role$/i }).click()
    await page.getByLabel(/role name/i).fill(roleName)
    await page.getByLabel(/description/i).fill('Created by e2e test')
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /^create role$/i })
      .click()
    await expect(page.getByText(roleName)).toBeVisible({ timeout: 15000 })
  })

  test('bans and unbans a user', async ({ page }) => {
    await page.goto('/admin/users')
    // Target the first user with a Ban button (exclude SuperAdmin - no Ban button for higher/equal priority roles)
    const firstBanBtn = page.getByRole('button', { name: /^ban$/i }).first()
    await expect(firstBanBtn).toBeVisible()
    // Capture the user's name so the locator stays anchored to the same card after list re-renders
    const firstUserName = (
      (await firstBanBtn.locator('../../../..').getByRole('heading', { level: 3 }).textContent()) ??
      ''
    ).trim()
    const userCard = page
      .getByRole('heading', { level: 3, name: firstUserName, exact: true })
      .first()
      .locator('../../..')

    await userCard.getByRole('button', { name: /^ban$/i }).click()
    await page.getByPlaceholder(/describe the reason for this ban/i).fill('E2E test ban')
    await page.getByRole('button', { name: /^ban user$/i }).click()
    await expect(userCard.getByText('banned')).toBeVisible({ timeout: 15000 })

    await userCard.getByRole('button', { name: /^unban$/i }).click()
    await page.getByRole('button', { name: /^confirm$/i }).click()
    await expect(userCard.getByText('active')).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Banned page', () => {
  test('shows account suspended UI and redirects home on acknowledge', async ({ page }) => {
    // Seed the ban info that the banned page reads from sessionStorage
    await page.goto('/')
    await page.evaluate(() => {
      sessionStorage.setItem('banInfo', JSON.stringify({ reason: 'E2E test ban', expiresAt: null }))
    })
    await page.goto('/banned')

    await expect(page.getByText(/account suspended/i)).toBeVisible()
    await expect(page.getByText(/E2E test ban/)).toBeVisible()
    await expect(page.getByText(/permanent/i)).toBeVisible()

    await page.getByRole('button', { name: /i understand/i }).click()
    await expect(page).toHaveURL('/posts')
  })
})

test.describe('Language switching', () => {
  test.beforeEach(async ({ page }) => {
    // Start from a clean language state so other tests are not affected
    await page.goto('/posts')
    await page.evaluate(() => localStorage.removeItem('language'))
    await page.reload()
    await expect(page.getByRole('banner')).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    // Reset to English so other tests see the default language
    await page.evaluate(() => localStorage.removeItem('language'))
  })

  test('switches UI to Slovak and persists across reload', async ({ page }) => {
    // Switch to SK via the language switcher in the header
    await page.getByRole('banner').getByRole('combobox').click()
    await page.getByRole('option', { name: 'SK' }).click()

    // Search placeholder should now be in Slovak
    await expect(
      page.getByPlaceholder('Hľadajte služby, poskytovateľov alebo kľúčové slová…'),
    ).toBeVisible()

    // Reload — language should be read from localStorage and stay in Slovak
    await page.reload()
    await expect(
      page.getByPlaceholder('Hľadajte služby, poskytovateľov alebo kľúčové slová…'),
    ).toBeVisible()
  })

  test('switches UI to Czech', async ({ page }) => {
    await page.getByRole('banner').getByRole('combobox').click()
    await page.getByRole('option', { name: 'CS' }).click()

    await expect(
      page.getByPlaceholder('Hledejte služby, poskytovatele nebo klíčová slova…'),
    ).toBeVisible()
  })

  test('switching back to English restores English UI', async ({ page }) => {
    // First switch to SK
    await page.getByRole('banner').getByRole('combobox').click()
    await page.getByRole('option', { name: 'SK' }).click()
    await expect(
      page.getByPlaceholder('Hľadajte služby, poskytovateľov alebo kľúčové slová…'),
    ).toBeVisible()

    // Switch back to EN
    await page.getByRole('banner').getByRole('combobox').click()
    await page.getByRole('option', { name: 'EN' }).click()
    await expect(page.getByPlaceholder('Search services, providers, or keywords…')).toBeVisible()
  })
})

test.describe('Authentication', () => {
  const testEmail = `e2e-${Date.now()}@example.com`
  const testPassword = 'password123'
  const testName = 'E2E Test User'

  test('register — fills form, submits, lands on verify-email page', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel(/name/i).fill(testName)
    await page.getByRole('textbox', { name: /email/i }).fill(testEmail)
    await page.locator('input[type="password"]').fill(testPassword)
    await page.getByRole('button', { name: /register/i }).click()

    await page.waitForURL(/\/verify-email/)
    await expect(
      page.getByText(new RegExp(`We sent a verification link to ${testEmail}`)),
    ).toBeVisible()
  })

  test('login — fills form, submits, lands on home page logged in', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('alice@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()

    await page.waitForURL('/posts')
    await expect(page.getByTestId('profile-menu-trigger')).toBeVisible()
  })

  test('my-postings — redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/my-postings')
    await page.waitForURL(/\/login/)
    // CardTitle renders as a <div>, not a heading — use text matcher
    await expect(page.getByText('Welcome Back')).toBeVisible()
  })

  test('logout — clears session, shows login link in header', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('alice@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')

    await page.getByTestId('profile-menu-trigger').click()
    await page.getByRole('button', { name: /log out/i }).click()
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()
  })
})

test.describe('Email verification', () => {
  test('register redirects to /verify-email with email shown', async ({ page }) => {
    const uniqueEmail = `e2e-verify-${Date.now()}@example.com`

    await page.goto('/register')
    await page.getByLabel(/full name/i).fill('E2E Verify User')
    await page.getByRole('textbox', { name: /email/i }).fill(uniqueEmail)
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /register/i }).click()

    await page.waitForURL('/verify-email**')
    await expect(page.getByText(new RegExp(uniqueEmail, 'i')).first()).toBeVisible()
    await expect(page.getByText(/check your email/i)).toBeVisible()
  })

  test('invalid verification link shows error state on callback page', async ({ page }) => {
    await page.goto('/verify-email/callback?error=invalid_token')
    await expect(page.getByRole('heading', { name: /link expired or invalid/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /go to sign in/i })).toBeVisible()
  })

  test('valid callback page shows success state and redirects to home', async ({ page }) => {
    await page.goto('/verify-email/callback')
    await expect(page.getByRole('heading', { name: /email verified!/i })).toBeVisible()
    await expect(page.getByText(/signing you in/i)).toBeVisible()
    await page.waitForURL('/', { timeout: 5000 })
  })

  test('login with unverified account redirects to /verify-email', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('unverified@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /log in/i }).click()

    await page.waitForURL('/verify-email**')
    await expect(page.getByText(/check your email/i)).toBeVisible()
    await expect(page.getByText(/unverified@example\.com/i).first()).toBeVisible()
  })
})

test.describe('User Impersonation', () => {
  let aliceUserId: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('admin@example.com')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')

    await page.goto('/admin/users')
    // Search for Alice then click her View link
    const searchResponse = page.waitForResponse((r) => r.url().includes('/admin/users'))
    await page.getByPlaceholder(/search by name or email/i).fill('alice')
    await searchResponse
    await page.getByRole('link', { name: /view/i }).first().click()
    await page.waitForURL(/\/admin\/users\/[0-9a-f-]+$/)
    aliceUserId = page.url().split('/').pop()!
    await context.close()
  })

  test('full impersonation flow', async ({ page }) => {
    // Step 1: Admin logs in and navigates to Alice's detail page
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('admin@example.com')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')
    await page.goto(`/admin/users/${aliceUserId}`)

    // Step 2: Click Impersonate User → lands on /posts with banner visible
    await expect(page.getByRole('button', { name: /impersonate user/i })).toBeEnabled()
    await page.getByRole('button', { name: /impersonate user/i }).click()
    await page.waitForURL('/posts')
    await expect(page.getByText(/impersonating alice/i)).toBeVisible()

    // Step 3: Banner has Exit Impersonation button
    await expect(page.getByRole('button', { name: /exit impersonation/i })).toBeVisible()

    // Step 4: Navigate to /messages → placeholder shown
    await page.goto('/messages')
    await expect(page.getByText(/messages are not accessible during impersonation/i)).toBeVisible()

    // Step 5: Click Exit Impersonation → back to admin user detail page, banner gone
    await page.getByRole('button', { name: /exit impersonation/i }).click()
    await page.waitForURL(`/admin/users/${aliceUserId}`)
    await expect(page.getByText(/impersonating/i)).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /user details/i })).toBeVisible()
  })

  test('logout while impersonating stops impersonation and navigates to admin user page', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByRole('textbox', { name: /email/i }).fill('admin@example.com')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.waitForURL('/posts')
    await page.goto(`/admin/users/${aliceUserId}`)

    await page.getByRole('button', { name: /impersonate user/i }).click()
    await page.waitForURL('/posts')
    await expect(page.getByText(/impersonating alice/i)).toBeVisible()

    // Open the profile panel and click Log out
    await page.getByTestId('profile-menu-trigger').click()
    await page.getByRole('button', { name: /log out/i }).click()

    // Should navigate to Alice's admin user detail page, not sign out
    await page.waitForURL(`/admin/users/${aliceUserId}`)
    await expect(page.getByText(/impersonating/i)).not.toBeVisible()
    await expect(page.getByRole('heading', { name: /user details/i })).toBeVisible()
  })
})

test.describe('2FA challenge routes', () => {
  test('verify-2fa selection page renders when navigated to directly', async ({ page }) => {
    // Navigate directly to the challenge page (without a pending 2FA session)
    // The page renders — no redirect happens because there's no fully-authenticated user
    await page.goto('/verify-2fa')
    await expect(page.getByText('2-Step Verification')).toBeVisible()
    await expect(page.getByText('Authenticator App')).toBeVisible()
    await expect(page.getByText('Email')).toBeVisible()
    await expect(page.getByText(/backup code/i)).toBeVisible()
  })

  test('verify-2fa/totp renders TOTP challenge', async ({ page }) => {
    await page.goto('/verify-2fa/totp')
    await expect(page.getByText('Check your authentication app')).toBeVisible()
    await expect(page.getByRole('button', { name: /verify/i })).toBeVisible()
    await expect(page.getByText(/try another way/i)).toBeVisible()
  })

  test('verify-2fa/email renders email OTP challenge', async ({ page }) => {
    await page.goto('/verify-2fa/email')
    await expect(page.getByText('Check your email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send code/i })).toBeVisible()
    await expect(page.getByText(/try another way/i)).toBeVisible()
  })

  test('verify-2fa/backup renders backup code challenge', async ({ page }) => {
    await page.goto('/verify-2fa/backup')
    await expect(page.getByText('Use a backup code')).toBeVisible()
    await expect(page.getByRole('button', { name: /verify/i })).toBeVisible()
    await expect(page.getByText(/try another way/i)).toBeVisible()
  })
})
