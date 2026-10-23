import { parseUnnamedResult } from '@/services/placeParsing'
import { SEARCH_RADIUS_KM } from '@/services/placeSearchConfig'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceResult } from '@/types/place'

// Photon only has places that OpenStreetMap has named, and many gas stations are drawn without a
// name. Overpass reads the same data by tag, so it finds them. It is a free public service that is
// often slow or busy, which is why it only completes an answer that is already on screen.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const SERVER_TIMEOUT_SECONDS = 10
const REQUEST_TIMEOUT_MS = 12_000
const METERS_PER_KILOMETER = 1000
// The area is asked once and kept, since the unnamed places barely change: later searches reuse it.
const CACHE_MS = 5 * 60_000
// A failure is remembered for less, so a busy service is not asked again at every keystroke.
const FAILURE_CACHE_MS = 60_000
const CELLS_PER_DEGREE = 10

interface CachedElements {
  expiresAt: number
  elements: Promise<unknown[]>
}

const cache = new Map<string, CachedElements>()

/** The spot rounded to a cell of about 11 km, so a rider who moves a little reuses the answer. */
const toCellCenter = ({ longitude, latitude }: Coordinates): Coordinates => ({
  longitude: Math.round(longitude * CELLS_PER_DEGREE) / CELLS_PER_DEGREE,
  latitude: Math.round(latitude * CELLS_PER_DEGREE) / CELLS_PER_DEGREE,
})

const buildQuery = (osmTag: string, { longitude, latitude }: Coordinates): string => {
  const [key, value] = osmTag.split(':')
  const around = `${SEARCH_RADIUS_KM * METERS_PER_KILOMETER},${latitude},${longitude}`
  return `[out:json][timeout:${SERVER_TIMEOUT_SECONDS}];nwr["${key}"="${value}"][!"name"](around:${around});out center tags;`
}

const requestElements = async (osmTag: string, center: Coordinates): Promise<unknown[]> => {
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(buildQuery(osmTag, center))}`
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`Unnamed place search failed with HTTP ${response.status}`)
  const payload: unknown = await response.json()
  return isRecord(payload) && Array.isArray(payload.elements) ? payload.elements : []
}

/** The request is shared by every search of the area, and never fails: without an answer there are no places. */
const loadElements = (osmTag: string, center: Coordinates): Promise<unknown[]> => {
  const key = `${osmTag}@${center.latitude},${center.longitude}`
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.elements
  const entry: CachedElements = { expiresAt: Infinity, elements: Promise.resolve([]) }
  entry.elements = requestElements(osmTag, center).then(
    (elements) => {
      entry.expiresAt = Date.now() + CACHE_MS
      return elements
    },
    (error: unknown) => {
      console.error('Could not search unnamed places', error)
      entry.expiresAt = Date.now() + FAILURE_CACHE_MS
      return []
    },
  )
  cache.set(key, entry)
  return entry.elements
}

/** The places of a kind that OpenStreetMap has no name for, near `proximity`, such as the unnamed gas stations. */
export const fetchUnnamedPlaces = async (
  osmTag: string,
  unnamedTitle: string,
  proximity: Coordinates,
): Promise<PlaceResult[]> => {
  const elements = await loadElements(osmTag, toCellCenter(proximity))
  return elements
    .map((element) => parseUnnamedResult(element, unnamedTitle, proximity))
    .filter((place) => place !== null)
}
