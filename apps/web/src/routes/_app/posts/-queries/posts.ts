import { queryOptions, keepPreviousData } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '#/api'

export const PAGE_SIZE = 12

const ratingRangeSchema = z.enum(['5-4', '4-3', '3-2', '2-1', 'none'])
export type RatingRange = z.infer<typeof ratingRangeSchema>

export const RATING_MIN: Record<RatingRange, number> = { '5-4': 4, '4-3': 3, '3-2': 2, '2-1': 1, 'none': 0 }
export const RATING_MAX: Record<RatingRange, number> = { '5-4': 5, '4-3': 4, '3-2': 3, '2-1': 2, 'none': 0 }

export function normalizeRating(rating: RatingRange | RatingRange[] | undefined): RatingRange[] {
  if (!rating) return []
  return Array.isArray(rating) ? rating : [rating]
}

export function normalizeCategory(category: string | string[] | undefined): string[] {
  if (!category) return []
  return Array.isArray(category) ? category : [category]
}

export function postsQueryOptions(deps: {
  type?: 'all' | 'offer' | 'request'
  category?: string | string[]
  q?: string
  sort: 'newest' | 'price-low' | 'price-high' | 'name' | 'reviews-most' | 'reviews-least'
  page: number
  rating?: RatingRange | RatingRange[]
  profileId?: string
  country?: string
  region?: string
  city?: string
}) {
  const ratingRanges = normalizeRating(deps.rating)
  const ratingMin = ratingRanges.length > 0 ? Math.min(...ratingRanges.map(r => RATING_MIN[r])) : undefined
  const ratingMax = ratingRanges.length > 0 ? Math.max(...ratingRanges.map(r => RATING_MAX[r])) : undefined
  const categoryIds = normalizeCategory(deps.category)

  return queryOptions({
    queryKey: ['posts', deps],
    queryFn: async () => {
      const { data, error } = await api.posts.get({
        query: {
          type:        deps.type && deps.type !== 'all' ? deps.type.toUpperCase() as 'OFFER' | 'REQUEST' : undefined,
          categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
          search:      deps.q,
          sort:        deps.sort,
          ratingMin,
          ratingMax,
          offset:      (deps.page - 1) * PAGE_SIZE,
          size:        PAGE_SIZE,
          profileId:   deps.profileId,
          country:     deps.country,
          region:      deps.region,
          city:        deps.city,
        },
      })
      if (error) throw error
      return data
    },
    placeholderData: keepPreviousData,
  })
}

