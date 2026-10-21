import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isRiderProfile } from '@/services/routeGroupGuards'
import type { RiderProfile } from '@/types/routeGroup'

const SEARCH_PATH = '/api/auth/users/search/'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

/** The few riders, other than the caller, whose username starts with `prefix`, ordered by username. */
export const searchRiders = async (prefix: string): Promise<RiderProfile[]> => {
  const riders = await requestJsonAuthorized(`${SEARCH_PATH}?q=${encodeURIComponent(prefix)}`)
  if (!Array.isArray(riders) || !riders.every(isRiderProfile)) {
    throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  }
  return riders
}
