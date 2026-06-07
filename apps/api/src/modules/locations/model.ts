import { t, type UnwrapSchema } from 'elysia'

const locationItem = t.Object({
  locationId: t.String(),
  country: t.Nullable(t.String()),
  region: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  street: t.Nullable(t.String()),
})

const autocompleteItem = t.Object({
  id: t.String(),
  street: t.Nullable(t.String()),
  city: t.Nullable(t.String()),
  region: t.Nullable(t.String()),
  country: t.Nullable(t.String()),
})

export const LocationsModel = {
  profileLocationsParams: t.Object({ id: t.String() }),
  profileLocationsResponse: t.Array(locationItem),
  addBody: t.Object({
    externalId: t.String(),
  }),
  addResponse: locationItem,
  removeParams: t.Object({ id: t.String(), locationId: t.String() }),
  autocompleteQuery: t.Object({
    q: t.String({ minLength: 3 }),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10 })),
  }),
  autocompleteResponse: t.Object({
    suggestions: t.Array(autocompleteItem),
  }),
} as const

export type LocationsModel = {
  [k in keyof typeof LocationsModel]: UnwrapSchema<(typeof LocationsModel)[k]>
}
