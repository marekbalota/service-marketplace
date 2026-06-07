import * as React from 'react'
import { ChevronDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import { cn } from '#/lib/utils'
import { Badge } from '#/components/ui/badge'
import { ScrollBar } from '#/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value?: string[]
  onValueChange?: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  searchable?: boolean
  displayMode?: 'tags' | 'text'
  showSelectAll?: boolean
  disabled?: boolean
  className?: string
  /** Extra classes applied to each tag badge — use to override colour, border, etc. */
  tagClassName?: string
  emptyText?: string
}

const TAG_GAP = 4 // gap-1 = 4px

export function MultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  searchable = false,
  displayMode = 'text',
  showSelectAll = false,
  disabled = false,
  className,
  tagClassName,
  emptyText = 'No results found.',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [visibleCount, setVisibleCount] = React.useState(value.length)
  const containerRef = React.useRef<HTMLSpanElement>(null)
  const measureRef = React.useRef<HTMLSpanElement>(null)

  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onValueChange?.(next)
  }

  const removeTag = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.(value.filter((v) => v !== optionValue))
  }

  const removeOverflow = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.(value.slice(0, visibleCount))
  }

  const { t } = useTranslation()
  const enabledOptions = options.filter((o) => !o.disabled)
  const selectAll = () => onValueChange?.(enabledOptions.map((o) => o.value))
  const clearAll = () => onValueChange?.([])

  const allTagItems = value.map((v) => ({
    value: v,
    label: options.find((o) => o.value === v)?.label ?? v,
  }))

  // Compute how many tags fit in the single-line container.
  // The measurement span (measureRef) always renders all tags off-screen so their
  // natural widths can be read without re-render cycles.
  React.useLayoutEffect(() => {
    if (displayMode !== 'tags' || !containerRef.current || !measureRef.current) return

    const container = containerRef.current
    const measure = measureRef.current

    const computeVisible = () => {
      const containerWidth = container.offsetWidth
      if (!containerWidth) return

      const tagEls = Array.from(measure.querySelectorAll<HTMLElement>('[data-m-tag]'))
      const overflowEl = measure.querySelector<HTMLElement>('[data-m-overflow]')

      if (tagEls.length === 0) {
        setVisibleCount(0)
        return
      }

      // Check if all tags fit without reserving space for an overflow badge.
      let total = 0
      for (const [i, el] of tagEls.entries()) {
        total += el.offsetWidth + (i > 0 ? TAG_GAP : 0)
      }
      if (total <= containerWidth) {
        setVisibleCount(value.length)
        return
      }

      // At least one tag overflows — find the max count that fits alongside the badge.
      const overflowW = (overflowEl?.offsetWidth ?? 36) + TAG_GAP
      let used = 0
      let count = 0
      for (const [i, el] of tagEls.entries()) {
        const w = el.offsetWidth + (i > 0 ? TAG_GAP : 0)
        if (used + w + overflowW > containerWidth) break
        used += w
        count++
      }
      setVisibleCount(Math.max(1, count))
    }

    computeVisible()

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(computeVisible)
      ro.observe(container)
      return () => ro.disconnect()
    }
  }, [value, displayMode])

  const overflowCount = Math.max(0, value.length - visibleCount)
  const visibleTags = allTagItems.slice(0, visibleCount)

  const filteredOptions = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const showControls = showSelectAll && (value.length < enabledOptions.length || value.length > 0)

  const tagBadgeClass = cn('shrink-0 gap-1 pr-1', tagClassName)

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger
        render={<div />}
        nativeButton={false}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) setOpen((prev) => !prev)
          }
        }}
        data-disabled={disabled || undefined}
        className={cn(
          'relative flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-sm outline-none select-none transition-colors dark:bg-input/30',
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
          className,
        )}
      >
        {displayMode === 'tags' && value.length > 0 ? (
          <>
            {/* Invisible off-screen span — renders all tags to measure their natural widths */}
            <span
              ref={measureRef}
              aria-hidden
              className="pointer-events-none invisible absolute inset-0 flex items-center gap-1 overflow-hidden"
            >
              {allTagItems.map((item, i) => (
                <Badge
                  key={item.value}
                  data-m-tag={i}
                  variant="secondary"
                  className={tagBadgeClass}
                >
                  {item.label}
                  {!disabled && <X className="size-3 shrink-0" />}
                </Badge>
              ))}
              {/* Uses max possible text (+N more where N = value.length) as conservative width estimate */}
              <Badge data-m-overflow variant="secondary" className="shrink-0 gap-1 pr-1">
                +{value.length} more
                {!disabled && <X className="size-3 shrink-0" />}
              </Badge>
            </span>
            {/* Visible tags — clipped to a single row */}
            <span
              ref={containerRef}
              className="flex flex-1 min-w-0 items-center gap-1 overflow-hidden"
            >
              {visibleTags.map((item) => (
                <Badge key={item.value} variant="secondary" className={tagBadgeClass}>
                  {item.label}
                  {!disabled && (
                    <button
                      type="button"
                      aria-label={`Remove ${item.label}`}
                      onClick={(e) => removeTag(item.value, e)}
                      className="rounded-sm opacity-70 hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {overflowCount > 0 && (
                <Badge variant="secondary" className="shrink-0 gap-1 pr-1">
                  +{overflowCount} more
                  {!disabled && (
                    <button
                      type="button"
                      aria-label={`Remove ${overflowCount} more selected items`}
                      onClick={removeOverflow}
                      className="rounded-sm opacity-70 hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 truncate text-left">
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
        )}
        <ChevronDown
          className={cn(
            'ml-auto size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-(--anchor-width) p-0"
        align="start"
        collisionAvoidance={{ side: 'flip' }}
        positionMethod="fixed"
      >
        <Command shouldFilter={false} className="p-0">
          {searchable && (
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
          )}
          {searchable && <div className="mt-1 h-px bg-border" />}
          <ScrollAreaPrimitive.Root>
            <ScrollAreaPrimitive.Viewport className="max-h-72">
              <CommandList className="!max-h-none !h-auto !overflow-visible">
                <CommandEmpty>{emptyText}</CommandEmpty>
                {showControls && !search && (
                  <CommandGroup className="p-0">
                    {value.length === 0 && (
                      <CommandItem className="cursor-pointer" onSelect={selectAll}>{t('common.selectAll')}</CommandItem>
                    )}
                    {value.length > 0 && (
                      <CommandItem className="cursor-pointer" onSelect={clearAll}>{t('common.clearSelection')}</CommandItem>
                    )}
                  </CommandGroup>
                )}
                <CommandGroup className="p-0">
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      disabled={option.disabled}
                      onSelect={() => toggle(option.value)}
                      data-checked={value.includes(option.value)}
                      className="flex cursor-pointer justify-between"
                    >
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </ScrollAreaPrimitive.Viewport>
            <ScrollBar orientation="vertical" className="opacity-0 transition-opacity data-[scrolling]:opacity-100 data-[hovering]:opacity-100" />
          </ScrollAreaPrimitive.Root>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
