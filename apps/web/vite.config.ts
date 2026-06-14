import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  envDir: '../../',
  server: {
    allowedHosts: true,
  },
  // Bind the prerender preview server to a concrete IPv4 loopback. In Docker
  // builds `localhost` resolves to ::1 (IPv6) first, but the server binds IPv4,
  // so the prerender crawler gets ECONNREFUSED and produces 0 pages (no SPA
  // shell). See TanStack/router#6275 / PR #6305.
  preview: {
    host: '127.0.0.1',
  },
  plugins: [
    devtools(),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
    }),
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
      },
      router: {
        routeFileIgnorePattern: '\\.test\\.(ts|tsx)$',
      },
    }),
    viteReact(),
  ],
})

export default config
