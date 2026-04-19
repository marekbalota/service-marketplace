import * as React from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '#/lib/utils'
import { Badge } from '#/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
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
  maxTags?: number
  showSelectAll?: boolean
  disabled?: boolean
  className?: string
  emptyText?: string
}

export function MultiSelect({
  options,
  value = [],
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  searchable = false,
  displayMode = 'text',
  maxTags,
  showSelectAll = false,
  disabled = false,
  className,
  emptyText = 'No results found.',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

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

  const enabledOptions = options.filter((o) => !o.disabled)
  const selectAll = () => onValueChange?.(enabledOptions.map((o) => o.value))
  const clearAll = () => onValueChange?.([])

  const visibleItems = (maxTags != null ? value.slice(0, maxTags) : value).map((v) => ({
    value: v,
    label: options.find((o) => o.value === v)?.label ?? v,
  }))
  const overflowCount = maxTags != null ? Math.max(0, value.length - maxTags) : 0

  const showControls = showSelectAll && (value.length < enabledOptions.length || value.length > 0)

  const filteredOptions = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          'flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm outline-none select-none transition-colors dark:bg-input/30',
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
          className,
        )}
      >
        {displayMode === 'tags' && value.length > 0 ? (
          <span className="flex flex-1 flex-nowrap items-center gap-1 overflow-x-auto [scrollbar-width:none]">
            {visibleItems.map((item) => (
              <Badge key={item.value} variant="secondary" className="shrink-0 gap-1 pr-1">
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
              <Badge variant="secondary" className="shrink-0">+{overflowCount} more</Badge>
            )}
          </span>
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
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false} className='p-0'>
          {searchable && <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />}
          {searchable && <div className="mt-1 h-px bg-border" />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {showControls && !search && (
              <>
                <CommandGroup className='p-0'>
                  {value.length == 0 && (
                    <CommandItem onSelect={selectAll}>Select all</CommandItem>
                  )}
                  {value.length > 0 && (
                    <CommandItem onSelect={clearAll}>Clear selection</CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
            <CommandGroup className='p-0'>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  disabled={option.disabled}
                  onSelect={() => toggle(option.value)}
                  data-checked={value.includes(option.value)}
                  className="flex justify-between"
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
