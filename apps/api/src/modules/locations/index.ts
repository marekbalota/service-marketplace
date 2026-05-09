import { Elysia } from 'elysia'
import { LocationsModel } from './model'
import { LocationsService } from './service'

export { LocationsModel } from './model'
export { LocationsService } from './service'

export const locationsRoutes = new Elysia({ prefix: '/locations' })
  .get(
    '/distinct',
    ({ query }) => LocationsService.findDistinct(query),
    {
      query:    LocationsModel.distinctQuery,
      response: { 200: LocationsModel.distinctResponse },
      detail: {
        summary:     'Get distinct location values',
        operationId: 'getDistinctLocations',
        tags:        ['Locations'],
      },
    },
  )
