import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient, QueryCache } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'
import type { User } from '#/types/api'

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
          void routerRef.invalidate()
          void routerRef.navigate({ to: '/login' }).then(() => {
            redirecting401 = false
          })
        } else {
          redirecting401 = false
        }
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute — cached results served instantly within this window
    },
  },
})

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, user: null as User | null },
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
