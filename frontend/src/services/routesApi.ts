import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isSavedRoute } from '@/services/typeGuards'
import type { NewRoute, SavedRoute } from '@/types/route'

const ROUTES_PATH = '/api/routes/'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

/** Saves a route. The server expects each point as a [longitude, latitude] pair. */
export const createRoute = async ({ name, description, points }: NewRoute): Promise<SavedRoute> => {
  const body = {
    name,
    description,
    points: points.map(({ longitude, latitude }) => [longitude, latitude]),
  }
  const saved = await requestJsonAuthorized(ROUTES_PATH, { method: 'POST', body })
  if (!isSavedRoute(saved)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return saved
}
