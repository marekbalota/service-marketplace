import '#/lib/i18n'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { queryClient } from '../router'
import '../styles.css'
import { DefaultCatchBoundary } from '#/components/DefaultCatchBoundary'
import { NotFound } from '#/components/NotFound'
import { ActiveProfileProvider } from '#/context/activeProfile'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Marketplace for Services',
      },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: DefaultCatchBoundary,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ActiveProfileProvider>{children}</ActiveProfileProvider>
          </TooltipProvider>
          <Toaster />
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
