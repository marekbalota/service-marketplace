import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { broadcastQueryClient } from '@tanstack/query-broadcast-client-experimental'
import { toast } from 'sonner'
import { ErrorCodes, type SupportedLocale } from '@marketplace/shared'
import { ApiError } from '#/lib/api-error'
import i18n from './lib/i18n'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'

// Module-level ref — populated inside getRouter() so QueryCache error
// handlers can perform soft navigation without a full page reload.
export let routerRef: ReturnType<typeof getRouter> | null = null

// Guard against multiple parallel 401s each triggering a redirect.
let redirecting401 = false

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: unknown) => {
      const e = error as { status?: number } | null
      if (e?.status === 401 && !redirecting401) {
        redirecting401 = true
        queryClient.clear()
        if (routerRef) {
          const locale = i18n.language as SupportedLocale
          void routerRef
            .navigate({ to: '/$locale/login', params: { locale }, replace: true })
            .then(() => {
              redirecting401 = false
            })
        } else {
          redirecting401 = false
        }
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === ErrorCodes.ImpersonationReadOnly) {
        toast.error(error.message)
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute — cached results served instantly within this window
    },
  },
})

broadcastQueryClient({
  queryClient,
  broadcastChannel: 'marketplace-query-sync',
})

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: NotFound,
  })

  routerRef = router
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
