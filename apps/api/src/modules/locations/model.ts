import { t, type UnwrapSchema } from 'elysia'

export const LocationsModel = {
  profileLocationsParams: t.Object({ id: t.String() }),
  profileLocationsResponse: t.Array(t.Object({
    locationId:  t.String(),
    country:     t.Nullable(t.String()),
    region:      t.Nullable(t.String()),
    city:        t.Nullable(t.String()),
    street:      t.Nullable(t.String()),
    houseNumber: t.Nullable(t.String()),
  })),
} as const

export type LocationsModel = {
  [k in keyof typeof LocationsModel]: UnwrapSchema<typeof LocationsModel[k]>
}
