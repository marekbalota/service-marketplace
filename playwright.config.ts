import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [
    ['list'], 
    ['html', { outputFolder: 'playwright-report' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
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
            url: 'http://localhost:3001',
            reuseExistingServer: false,
          },
          {
            command: 'bun run dev',
            cwd: './apps/web',
            url: 'http://localhost:3000',
            reuseExistingServer: false,
          },
        ],
      }),
})
