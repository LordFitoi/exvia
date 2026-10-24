import { ApiError } from '@/services/apiClient'
import { requestJsonAuthorized } from '@/services/authorizedRequest'
import { isPlaceLocationCategory } from '@/services/placeLocationCategories'
import type { PlaceLocationCategory } from '@/services/placeLocationCategories'
import { isRecord } from '@/services/typeGuards'
import { toBboxParam } from '@/services/viewport'
import type { NewPlaceLocation, PlaceDetails, PlaceLocation } from '@/types/placeLocation'
import type { Viewport } from '@/types/viewport'

const PLACE_LOCATIONS_PATH = '/api/places/'
const UNEXPECTED_RESPONSE_MESSAGE = 'The server sent an unexpected response. Please try again.'
// The server accepts at most 6 decimals (about 10 cm), and rejects a longer coordinate.
const COORDINATE_DECIMALS = 6

/** The most places the server answers for one viewport; a full answer may have left some out. */
export const PLACE_LOCATIONS_LIMIT = 200

interface PlaceLocationPayload {
  readonly id: number
  readonly name: string
  readonly notes: string
  readonly category: PlaceLocationCategory
  readonly lat: number
  readonly lng: number
}

const isPlaceLocationPayload = (value: unknown): value is PlaceLocationPayload =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.notes === 'string' &&
  isPlaceLocationCategory(value.category) &&
  typeof value.lat === 'number' &&
  typeof value.lng === 'number'

const toPlaceLocation = ({ id, name, notes, category, lat, lng }: PlaceLocationPayload): PlaceLocation => ({
  id,
  name,
  notes,
  category,
  coordinates: { longitude: lng, latitude: lat },
})

const roundCoordinate = (value: number): number => Number(value.toFixed(COORDINATE_DECIMALS))

const expectPlaceLocation = (payload: unknown): PlaceLocationPayload => {
  if (!isPlaceLocationPayload(payload)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return payload
}

/** Every saved place of the caller (the server sends 500 at most), for searching them by text. */
export const fetchAllPlaceLocations = async (signal: AbortSignal): Promise<PlaceLocation[]> => {
  const payload = await requestJsonAuthorized(`${PLACE_LOCATIONS_PATH}all/`, { signal })
  if (!Array.isArray(payload)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return payload.map(expectPlaceLocation).map(toPlaceLocation)
}

/** The caller's saved places inside `viewport`, so places out of view are never fetched. */
export const fetchPlaceLocations = async (viewport: Viewport, signal: AbortSignal): Promise<PlaceLocation[]> => {
  const payload = await requestJsonAuthorized(`${PLACE_LOCATIONS_PATH}?bbox=${toBboxParam(viewport)}`, { signal })
  if (!Array.isArray(payload)) throw new ApiError(502, UNEXPECTED_RESPONSE_MESSAGE)
  return payload.map(expectPlaceLocation).map(toPlaceLocation)
}

export const createPlaceLocation = async ({
  name,
  notes,
  category,
  coordinates,
}: NewPlaceLocation): Promise<PlaceLocation> => {
  const body = {
    name,
    notes,
    category,
    lat: roundCoordinate(coordinates.latitude),
    lng: roundCoordinate(coordinates.longitude),
  }
  return toPlaceLocation(expectPlaceLocation(await requestJsonAuthorized(PLACE_LOCATIONS_PATH, { method: 'POST', body })))
}

export const deletePlaceLocation = async (id: number): Promise<void> => {
  await requestJsonAuthorized(`${PLACE_LOCATIONS_PATH}${id}/`, { method: 'DELETE' })
}

export const updatePlaceLocation = async (id: number, details: PlaceDetails): Promise<PlaceLocation> =>
  toPlaceLocation(
    expectPlaceLocation(await requestJsonAuthorized(`${PLACE_LOCATIONS_PATH}${id}/`, { method: 'PATCH', body: details })),
  )
