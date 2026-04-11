import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { User, ChevronDown } from "lucide-react";
import { Button, buttonVariants } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet";
import { ThemeToggle } from './ThemeToggle'
import { UserProfilePanel } from "./UserProfilePanel";
import { useActiveProfile } from "#/contexts/ActiveProfileContext";
import { authClient } from "#/auth";

export function Header() {
  const [open, setOpen] = useState(false);
  const { activeProfile } = useActiveProfile();
  const { data: session, isPending } = authClient.useSession();

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
            <ThemeToggle/>
          {!isPending && !session && (
              <>
                <Link to="/login" className={cn(buttonVariants({ variant: "outline" }))}>
                  Log in
                </Link>
                <Link to="/register" className={cn(buttonVariants())}>
                  Register
                </Link>
              </>
            )}
            {session && (
              <>
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger
                    render={<Button variant="outline" className="gap-2" data-testid="profile-menu-trigger" />}
                  >
                    <User className="size-4" />
                    <span className="hidden sm:inline">
                      {activeProfile?.name ?? "Profile"}
                    </span>
                    <ChevronDown className="size-4" />
                  </SheetTrigger>
                  <SheetContent side="right" showCloseButton className="sm:max-w-sm">
                    <SheetHeader className="flex-row items-center gap-4 border-b px-6 pb-6 pt-10 space-y-0">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--lagoon)] to-[var(--lagoon-deep)] shadow-lg">
                        <User className="size-8 text-white" />
                      </div>
                      <div className="min-w-0">
                        <SheetTitle className="truncate text-lg font-semibold text-foreground">
                          {session?.user.name ?? activeProfile?.name ?? '—'}
                        </SheetTitle>
                        <p className="truncate text-sm text-muted-foreground capitalize">
                          {activeProfile?.roleName ?? ''}
                        </p>
                      </div>
                    </SheetHeader>
                    <UserProfilePanel onClose={() => setOpen(false)} />
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
