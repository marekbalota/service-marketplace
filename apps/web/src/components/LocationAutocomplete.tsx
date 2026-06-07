import * as React from 'react'
import { X, Loader2, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { Autocomplete } from '@base-ui/react/autocomplete'
import { cn } from '#/lib/utils'
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
  const committedText = value ? formatLocation(value) : ''
  const [inputText, setInputText] = React.useState(committedText)

  // Sync when value changes externally (e.g. browser back/forward on same route)
  React.useEffect(() => {
    setInputText(committedText)
  }, [committedText])

  const [debouncedText] = useDebouncedValue(inputText, { wait: 300 })

  const { data: suggestions = [], isFetching, isFetched } = useQuery({
    ...locationAutocompleteQueryOptions({ q: debouncedText }),
    enabled: debouncedText.length >= 3 && debouncedText !== committedText,
  })

  const showDropdown =
    debouncedText !== committedText && debouncedText.length >= 3 && debouncedText === inputText && !isFetching && isFetched

  function handleValueChange(v: string) {
    setInputText(v)
    if (!v) {
      onChange(null)
      return
    }
    const s = suggestions.find((s) => formatLocation(s) === v)
    if (s) onChange(s)
  }

  return (
    <Autocomplete.Root
      items={suggestions}
      mode="none"
      value={inputText}
      onValueChange={handleValueChange}
      open={showDropdown}
      onOpenChange={(isOpen, eventDetails) => {
        if (!isOpen && eventDetails?.reason !== 'item-press')
          setInputText(committedText)
      }}
      autoHighlight
    >
      <Autocomplete.InputGroup className="relative w-full">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Autocomplete.Input
          placeholder={placeholder ?? t('location.searchPlaceholder')}
          className={cn(
            'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pl-9 text-sm outline-none transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
            value && !isFetching ? 'pr-8' : 'pr-2.5',
          )}
        />
        {isFetching && (
          <Loader2 className="absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {value && !isFetching && (
          <Autocomplete.Clear
            aria-label={t('common.clear')}
            className="absolute right-1 top-1/2 size-6 -translate-y-1/2 opacity-70 hover:opacity-100 *:flex *:items-center *:justify-center"
          >
            <X className="size-3.5" />
          </Autocomplete.Clear>
        )}
      </Autocomplete.InputGroup>
      <Autocomplete.Portal>
        <Autocomplete.Positioner side="bottom" sideOffset={4} align="start">
          <Autocomplete.Popup
            className={cn(
              'z-50 w-(--anchor-width) max-h-(--available-height) overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10',
              'origin-(--transform-origin)',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            )}
          >
            <Autocomplete.Empty>
              <p className="py-3 text-center text-sm text-muted-foreground">
                {t('location.noResults')}
              </p>
            </Autocomplete.Empty>
            {suggestions.length > 0 && (
              <Autocomplete.List className="p-1">
                {suggestions.map((s) => (
                  <Autocomplete.Item
                    key={s.id}
                    value={formatLocation(s)}
                    className={(state) =>
                      cn(
                        'relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm select-none outline-none',
                        state.highlighted && 'bg-accent text-accent-foreground',
                      )
                    }
                  >
                    {formatLocation(s)}
                  </Autocomplete.Item>
                ))}
              </Autocomplete.List>
            )}
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}
