export default function Footer() {
  return (
    <footer className="border-t bg-card py-6 text-sm text-muted-foreground">
      <div className="mx-auto max-w-7xl px-4 text-center">
        &copy; {new Date().getFullYear()} Service Marketplace. All rights reserved.
      </div>
    </footer>
  )
}
