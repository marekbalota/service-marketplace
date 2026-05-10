import * as React from 'react'
import { ChevronDown, Loader2, X } from 'lucide-react'
import { cn } from '#/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const MAX_INITIAL = 8

export interface LocationComboboxProps {
  value: string | undefined
  onChange: (val: string | undefined) => void
  options: string[]
  placeholder: string
  disabled?: boolean
  isFetching?: boolean
}

export function LocationCombobox({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  isFetching = false,
}: LocationComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filtered = search
    ? options.filter((o) => normalize(o).includes(normalize(search)))
    : options

  const displayed = search ? filtered.slice(0, MAX_INITIAL * 5) : filtered.slice(0, MAX_INITIAL)

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger
        render={<div />}
        nativeButton={false}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) setOpen((prev) => !prev)
          }
        }}
        className={cn(
          'relative flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-sm outline-none select-none transition-colors dark:bg-input/30',
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        )}
      >
        <span className={cn('flex-1 truncate text-left', !value && 'text-muted-foreground')}>
          {value ?? placeholder}
        </span>
        {isFetching && (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
        {value && !disabled && !isFetching && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Clear ${placeholder}`}
            onClick={handleClear}
            className="size-4 shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="size-3.5" />
          </Button>
        )}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}…`}
            value={search}
            onValueChange={setSearch}
          />
          <div className="mt-1 h-px bg-border" />
          <CommandList className="![scrollbar-width:thin] [&::-webkit-scrollbar]:!block [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <CommandEmpty>No locations found.</CommandEmpty>
            <CommandGroup className="p-0">
              {displayed.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt)
                    setSearch('')
                    setOpen(false)
                  }}
                  data-checked={value === opt}
                >
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
