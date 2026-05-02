import { ChevronDown, MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '#/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { Route } from '../index'
import { locationsDistinctQueryOptions } from '../-queries/locations'
import { LocationCombobox } from './LocationCombobox'

export function LocationSelect() {
  const { country, region, city } = Route.useSearch()
  const navigate = Route.useNavigate()

  const hasFilter = !!(country || region || city)
  const label = city ?? region ?? country ?? 'All Locations'

  const { data: countries = [], isFetching: fetchingCountries } = useQuery(
    locationsDistinctQueryOptions({ field: 'country' }),
  )
  const { data: regions = [], isFetching: fetchingRegions } = useQuery({
    ...locationsDistinctQueryOptions({ field: 'region', country }),
    enabled: !!country,
  })
  const { data: cities = [], isFetching: fetchingCities } = useQuery({
    ...locationsDistinctQueryOptions({ field: 'city', country, region }),
    enabled: !!country && !!region,
  })

  const clearAll = () =>
    navigate({
      search: (prev) => ({
        ...prev,
        country: undefined,
        region:  undefined,
        city:    undefined,
        page:    undefined,
      }),
    })

  return (
    <Popover modal>
      <PopoverTrigger
        title={hasFilter ? label : undefined}
        className={cn(
          'flex h-8 min-w-[120px] max-w-[180px] cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm outline-none select-none transition-colors dark:bg-input/30',
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-input/50',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          hasFilter && 'border-primary text-primary dark:border-primary',
        )}
      >
        <MapPin className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>

      <PopoverContent
        className="w-72 p-3"
        align="start"
        collisionAvoidance={{ side: 'flip' }}
        positionMethod="fixed"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Country</p>
            <LocationCombobox
              value={country}
              options={countries}
              placeholder="Any country"
              isFetching={fetchingCountries}
              onChange={(val) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    country: val,
                    region:  undefined,
                    city:    undefined,
                    page:    undefined,
                  }),
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Region</p>
            <LocationCombobox
              value={region}
              options={regions}
              placeholder="Any region"
              disabled={!country}
              isFetching={fetchingRegions}
              onChange={(val) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    region: val,
                    city:   undefined,
                    page:   undefined,
                  }),
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">City</p>
            <LocationCombobox
              value={city}
              options={cities}
              placeholder="Any city"
              disabled={!country || !region}
              isFetching={fetchingCities}
              onChange={(val) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    city: val,
                    page: undefined,
                  }),
                })
              }
            />
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={clearAll}
              className="w-full rounded-md border border-input py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Clear location
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
