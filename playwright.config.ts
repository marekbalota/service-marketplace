import { defineConfig, devices } from '@playwright/test'

const WEB_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
const API_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { outputFolder: 'playwright-report' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  ...(process.env.CI
    ? {}
    : {
        webServer: [
          {
            command: 'bun run dev',
            cwd: './apps/api',
            url: API_URL,
            reuseExistingServer: true,
          },
          {
            command: 'bun run dev',
            cwd: './apps/web',
            url: WEB_URL,
            reuseExistingServer: true,
          },
        ],
      }),
})
