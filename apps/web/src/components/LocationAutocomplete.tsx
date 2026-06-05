import * as React from 'react'
import { X, Loader2, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import { locationAutocompleteQueryOptions } from '#/lib/queries/locations'
import { formatLocation } from '#/lib/format'

export interface LocationSuggestion {
  id: string
  street: string | null
  city: string | null
  region: string | null
  country: string | null
}

interface LocationAutocompleteProps {
  value: LocationSuggestion | null
  onChange: (val: LocationSuggestion | null) => void
  placeholder?: string
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
}: LocationAutocompleteProps) {
  const { t } = useTranslation()
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const [open, setOpen] = React.useState(false)
  const [inputText, setInputText] = React.useState('')

  const { data: suggestions = [], isFetching, refetch } = useQuery({
    ...locationAutocompleteQueryOptions({ q: inputText }),
    enabled: false,
  })

  const displayValue = value ? formatLocation(value) : ''
  // Only show the dropdown after the fetch completes — prevents "No results" flash while loading
  const showDropdown = open && inputText.length >= 2 && !isFetching

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (value) {
      onChange(null)
    }
    setInputText(v)
    setOpen(v.length >= 2)
    clearTimeout(timerRef.current)
    if (v.length >= 2) {
      timerRef.current = setTimeout(() => void refetch(), 300)
    }
  }

  function handleSelect(s: LocationSuggestion) {
    onChange(s)
    setInputText('')
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setInputText('')
    setOpen(false)
  }

  function handleBlur() {
    // Defer so that mousedown-on-suggestion fires first (which calls handleSelect)
    setTimeout(() => {
      setOpen(false)
      if (!value) setInputText('')
    }, 100)
  }

  return (
    <div className="relative w-full">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        value={value ? displayValue : inputText}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder ?? t('location.searchPlaceholder')}
        className="pl-9 pr-8 focus-visible:ring-0 focus-visible:border-input"
      />
      {isFetching && (
        <Loader2 className="absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {value && !isFetching && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('common.clear')}
          onClick={handleClear}
          className="absolute right-1 top-1/2 size-6 -translate-y-1/2 active:!-translate-y-1/2 opacity-70 hover:opacity-100"
        >
          <X className="size-3.5" />
        </Button>
      )}
      {showDropdown && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg bg-popover p-0 shadow-md ring-1 ring-foreground/10"
        >
          {suggestions.length > 0 ? (
            <Command shouldFilter={false}>
              <CommandList>
                <CommandGroup>
                  {suggestions.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.id}
                      className="cursor-pointer"
                      onMouseDown={(e) => e.preventDefault()}
                      onSelect={() => handleSelect(s)}
                    >
                      {formatLocation(s)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">{t('location.noResults')}</p>
          )}
        </div>
      )}
    </div>
  )
}
