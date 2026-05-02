import { t, type UnwrapSchema } from 'elysia'

const locationItem = t.Object({
  locationId:  t.String(),
  country:     t.Nullable(t.String()),
  region:      t.Nullable(t.String()),
  city:        t.Nullable(t.String()),
  street:      t.Nullable(t.String()),
  houseNumber: t.Nullable(t.String()),
})

export const LocationsModel = {
  distinctQuery: t.Object({
    field:   t.Union([t.Literal('country'), t.Literal('region'), t.Literal('city')]),
    country: t.Optional(t.String()),
    region:  t.Optional(t.String()),
  }),
  distinctResponse: t.Object({
    values: t.Array(t.String()),
  }),
  profileLocationsParams: t.Object({ id: t.String() }),
  profileLocationsResponse: t.Array(locationItem),
} as const

export type LocationsModel = {
  [k in keyof typeof LocationsModel]: UnwrapSchema<typeof LocationsModel[k]>
}
