import { HeadContent, Link, Outlet, Scripts, createRootRouteWithContext, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Button, buttonVariants } from '../components/ui/button'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { queryClient } from '../router'
import { ActiveProfileProvider } from '../contexts/ActiveProfileContext'
import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

function PageEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

function RootErrorComponent({ error }: ErrorComponentProps ) {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-7xl px-4 py-32 text-center">
      <PageEyebrow>Error</PageEyebrow>
      <h1 className="mb-4 text-3xl font-semibold text-foreground">Something went wrong</h1>
      <p className="mb-8 text-muted-foreground">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button variant="outline" onClick={() => router.invalidate()}>
        Try again
      </Button>
    </main>
  )
}

function NotFound() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-32 text-center">
      <PageEyebrow>404</PageEyebrow>
      <h1 className="mb-4 text-3xl font-semibold text-foreground">Page not found</h1>
      <p className="mb-8 text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Link to="/" className={buttonVariants({ variant: 'outline' })}>Back to main page</Link>
    </main>
  )
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  notFoundComponent: NotFound,
  errorComponent: RootErrorComponent,
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
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <QueryClientProvider client={queryClient}>
          <ActiveProfileProvider>
            {children}
          </ActiveProfileProvider>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
