/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  envDir: '../../',
  plugins: [react()],
  resolve: {
    alias: {
      '#/lib/useLocale': fileURLToPath(new URL('./src/__mocks__/useLocale.ts', import.meta.url)),
      '#': fileURLToPath(new URL('./src', import.meta.url)),
      'react-i18next': fileURLToPath(new URL('./src/__mocks__/react-i18next.tsx', import.meta.url)),
    },
  },
  ssr: {
    noExternal: ['zod', '@hookform/resolvers'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
