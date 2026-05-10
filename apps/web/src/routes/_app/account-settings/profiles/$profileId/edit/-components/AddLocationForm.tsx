import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent } from '#/components/ui/card'

export interface LocationDraft {
  country: string
  region: string
  city: string
  street: string
  houseNumber: string
}

export const EMPTY_LOCATION: LocationDraft = {
  country: '',
  region: '',
  city: '',
  street: '',
  houseNumber: '',
}

export function AddLocationForm({
  value,
  onChange,
  onSave,
  onCancel,
  isPending,
  error,
}: {
  value: LocationDraft
  onChange: (patch: Partial<LocationDraft>) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  error?: string
}) {
  return (
    <Card className="border-2 border-primary/20 bg-muted/40">
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="loc-country">Country *</Label>
            <Input
              id="loc-country"
              placeholder="e.g., USA, Slovakia"
              value={value.country}
              onChange={(e) => onChange({ country: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-region">Region</Label>
            <Input
              id="loc-region"
              placeholder="e.g., Texas, Bratislava Region"
              value={value.region}
              onChange={(e) => onChange({ region: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="loc-city">City</Label>
            <Input
              id="loc-city"
              placeholder="e.g., Austin, Bratislava"
              value={value.city}
              onChange={(e) => onChange({ city: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-street">Street</Label>
            <Input
              id="loc-street"
              placeholder="e.g., Main Street"
              value={value.street}
              onChange={(e) => onChange({ street: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-2 md:w-1/2">
          <Label htmlFor="loc-house">House Number</Label>
          <Input
            id="loc-house"
            placeholder="e.g., 123"
            value={value.houseNumber}
            onChange={(e) => onChange({ houseNumber: e.target.value })}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={!value.country || isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Add Location
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
