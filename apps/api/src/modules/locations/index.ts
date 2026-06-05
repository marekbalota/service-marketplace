import { Elysia } from 'elysia'
import { LocationsModel } from './model'
import { LocationsService } from './service'
import { badGatewayResponse } from '../../lib/errors'

export { LocationsModel } from './model'
export { LocationsService } from './service'

export const locationsRoutes = new Elysia({ prefix: '/locations' })
  .get(
    '/autocomplete',
    ({ query, headers }) => LocationsService.autocomplete(query, headers['accept-language'] ?? 'en'),
    {
      query: LocationsModel.autocompleteQuery,
      response: {
        200: LocationsModel.autocompleteResponse,
        ...badGatewayResponse,
      },
      detail: {
        summary: 'Autocomplete location search via Geoapify',
        operationId: 'autocompleteLocations',
        tags: ['Locations'],
      },
    },
  )
