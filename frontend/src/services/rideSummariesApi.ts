import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isRecord, isRideSummaryDetail, isRideSummaryListItem } from '@/services/typeGuards'
import type {
  NewDestinationSummary,
  NewRideSummary,
  RideSummaryDetail,
  RideSummaryListItem,
} from '@/types/rideSummary'

const ROUTES_PATH = '/api/routes/'
const SUMMARIES_PATH = `${ROUTES_PATH}summaries/`
// The server needs the end to be after the start, and a fix can be older than the ride it ends.
const MIN_RIDE_MS = 1000
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'

const unexpectedResponse = (): ApiError => new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)

/** Saves a finished ride of one of the caller's routes; the server makes the caller its rider. */
export const createRideSummary = async (
  routeId: string,
  { groupId, startedAt, endedAt, isFinished, maxSpeed, reachedAt }: NewRideSummary,
): Promise<void> => {
  const saved = await requestJsonAuthorized(`${ROUTES_PATH}${routeId}/summaries/`, {
    method: 'POST',
    body: {
      group: groupId,
      start_at: new Date(startedAt).toISOString(),
      end_at: new Date(Math.max(endedAt, startedAt + MIN_RIDE_MS)).toISOString(),
      is_finished: isFinished,
      max_speed: maxSpeed,
      reached_at: reachedAt.map((moment) => new Date(moment).toISOString()),
    },
  })
  if (!isRecord(saved) || typeof saved.id !== 'number') throw unexpectedResponse()
}

/** Saves a ride to a searched place, which has no route; the server makes the caller its rider. */
export const createDestinationSummary = async ({
  destinationName,
  startedAt,
  endedAt,
  isFinished,
  maxSpeed,
  kilometres,
}: NewDestinationSummary): Promise<void> => {
  const saved = await requestJsonAuthorized(`${SUMMARIES_PATH}destination/`, {
    method: 'POST',
    body: {
      destination_name: destinationName,
      start_at: new Date(startedAt).toISOString(),
      end_at: new Date(Math.max(endedAt, startedAt + MIN_RIDE_MS)).toISOString(),
      is_finished: isFinished,
      max_speed: maxSpeed,
      distance: kilometres,
    },
  })
  if (!isRecord(saved) || typeof saved.id !== 'number') throw unexpectedResponse()
}

/** The rides the caller took part in, most recently saved first. */
export const fetchRideSummaries = async (): Promise<RideSummaryListItem[]> => {
  const summaries = await requestJsonAuthorized(SUMMARIES_PATH)
  if (!Array.isArray(summaries) || !summaries.every(isRideSummaryListItem)) throw unexpectedResponse()
  return summaries
}

/** One ride with its participants and speeds. */
export const fetchRideSummary = async (id: number): Promise<RideSummaryDetail> => {
  const summary = await requestJsonAuthorized(`${SUMMARIES_PATH}${id}/`)
  if (!isRideSummaryDetail(summary)) throw unexpectedResponse()
  return summary
}

/** Deletes one of the caller's own rides, for all its participants. */
export const deleteRideSummary = async (id: number): Promise<void> => {
  await requestJsonAuthorized(`${SUMMARIES_PATH}${id}/`, { method: 'DELETE' })
}
