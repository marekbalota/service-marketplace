import { Link } from '@tanstack/react-router'
import { User, ChevronDown } from 'lucide-react'
import { Button } from '#/components/ui/button'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="no-underline">
            <h1 className="text-2xl font-medium text-foreground transition-colors hover:text-primary">
              Service Marketplace
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" className="gap-2">
              <User className="size-4" />
              <span className="hidden sm:inline">John Personal</span>
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
