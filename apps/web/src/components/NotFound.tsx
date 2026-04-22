import { Button } from '#/components/ui/button'

export function NotFound() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-50 text-center">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mb-4 text-3xl font-semibold text-foreground">Page not found</h1>
      <p className="mb-8 text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>
      </div>
    </main>
  )
}
