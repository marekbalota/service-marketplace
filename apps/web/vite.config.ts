import { defineConfig, type Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import http from 'node:http'

const apiTarget = process.env.VITE_DEV_API_PROXY ?? 'http://localhost:3001'

const apiPaths = [
  '/api/auth',
  '/posts',
  '/categories',
  '/profiles',
  '/users',
  '/reviews',
  '/favourites',
  '/threads',
  '/images',
  '/admin',
  '/report-categories',
  '/swagger',
]

function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!apiPaths.some((p) => req.url?.startsWith(p))) {
          next()
          return
        }

        const parsedUrl = new URL(apiTarget + req.url!)
        const proxyOpts: http.RequestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: req.method,
          headers: { ...req.headers, host: parsedUrl.host },
        }

        const proxyReq = http.request(proxyOpts, (proxyRes) => {
          // Forward all headers from upstream, preserving content-length
          const headersToForward: Record<string, string | string[] | undefined> = {}
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value == null) continue
            headersToForward[key] = value
          }
          res.writeHead(proxyRes.statusCode ?? 502, headersToForward)
          proxyRes.pipe(res)
        })

        proxyReq.on('error', (err) => {
          if (!res.headersSent) {
            res.statusCode = 502
            res.end(`Proxy error: ${err.message}`)
          }
        })

        req.pipe(proxyReq)
      })
    },
  }
}

const config = defineConfig({
  envDir: '../../',
  server: {
    allowedHosts: true,
  },
  plugins: [
    apiProxyPlugin(),
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
        routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
      },
    }),
    viteReact(),
  ],
})

export default config
