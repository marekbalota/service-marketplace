import { chromium, request } from '@playwright/test'
import fs from 'fs'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const API_URL = process.env.CI === 'true' ? 'http://api:3001' : 'http://localhost:3001'

export default async function globalSetup() {
  fs.mkdirSync('e2e/.auth', { recursive: true })

  console.log(`[global-setup] BASE_URL=${BASE_URL} API_URL=${API_URL}`)

  const context = await request.newContext({ baseURL: API_URL })

  console.log(`[global-setup] POSTing to ${API_URL}/api/auth/sign-in/email`)

  const response = await context.post('/api/auth/sign-in/email', {
    data: {
      email: 'alice@example.com',
      password: 'password123',
    },
  })

  console.log(`[global-setup] Response status: ${response.status()}`)

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`)
  }

  const apiCookies = await context.storageState()
  console.log(`[global-setup] Cookies received: ${apiCookies.cookies.map(c => c.name).join(', ')}`)

  const webHostname = new URL(BASE_URL).hostname

  const browser = await chromium.launch()
  const browserContext = await browser.newContext()

  await browserContext.addCookies(
    apiCookies.cookies.map(({ name, value, path, expires, httpOnly, secure, sameSite }) => ({
      name,
      value,
      domain: webHostname,
      path: path ?? '/',
      expires,
      httpOnly,
      secure,
      sameSite,
    }))
  )

  await browserContext.storageState({ path: 'e2e/.auth/alice.json' })
  console.log('[global-setup] Auth state saved to e2e/.auth/alice.json')

  await browser.close()
  await context.dispose()
}
