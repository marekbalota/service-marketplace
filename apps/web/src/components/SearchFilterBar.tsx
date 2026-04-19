import type React from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '#/lib/utils'
import { buttonVariants } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'

export interface FilterItem {
  label: string
  control: React.ReactNode
  /** Tailwind width class applied to the desktop wrapper, e.g. "w-[160px]". Omit for auto. */
  desktopWidth?: string
}

interface SearchFilterBarProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  filters: FilterItem[]
  sheetTitle?: string
  sheetDescription?: string
  action?: React.ReactNode
}

export function SearchFilterBar({
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  filters,
  sheetTitle = 'Filters',
  sheetDescription,
  action,
}: SearchFilterBarProps) {
  return (
    <div className="space-y-0">
      {/* Row 1: search + optional action + mobile sheet trigger */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {action}

        <Sheet>
          <SheetTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'shrink-0 md:hidden',
            )}
          >
            <SlidersHorizontal className="size-4" />
            <span className="sr-only">Open filters</span>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{sheetTitle}</SheetTitle>
              {sheetDescription && (
                <SheetDescription>{sheetDescription}</SheetDescription>
              )}
            </SheetHeader>
            <div className="mt-4 space-y-4 px-4">
              {filters.map(({ label, control }) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-sm font-medium">{label}</label>
                  {control}
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Row 2: desktop filter controls */}
      {filters.length > 0 && (
        <div className="hidden gap-3 mt-4 md:flex">
          {filters.map(({ label, control, desktopWidth }) => (
            <div key={label} className={desktopWidth}>
              <span className="sr-only">{label}</span>
              {control}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
