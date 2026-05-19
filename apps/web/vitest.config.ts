import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  envDir: '../../',
  plugins: [react()],
  resolve: {
    alias: {
      '#': fileURLToPath(new URL('./src', import.meta.url)),
      'react-i18next': fileURLToPath(new URL('./src/__mocks__/react-i18next.tsx', import.meta.url)),
    },
  },
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
