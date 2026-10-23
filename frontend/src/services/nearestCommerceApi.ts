import { parseBusinessResult } from '@/services/placeParsing'
import { PHOTON_URL } from '@/services/placeSearchConfig'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceResult } from '@/types/place'

const COMMERCE_RADIUS_KM = 0.5
// Photon answers the nearest first, but the nearest ones are often not shops (a bench, a bus stop).
const CANDIDATE_LIMIT = 15
const REQUEST_TIMEOUT_MS = 10_000
// The OpenStreetMap keys of a place where something is sold or served.
const COMMERCE_KEYS: readonly string[] = ['shop', 'amenity', 'tourism', 'craft', 'office']

const isCommerce = (feature: unknown): boolean =>
  isRecord(feature) &&
  isRecord(feature.properties) &&
  typeof feature.properties.osm_key === 'string' &&
  COMMERCE_KEYS.includes(feature.properties.osm_key)

/** The business closest to `at` within 500 m (Photon, OpenStreetMap data), or null when there is none. */
export const fetchNearestCommerce = async (at: Coordinates, signal: AbortSignal): Promise<PlaceResult | null> => {
  const params = new URLSearchParams({
    lat: String(at.latitude),
    lon: String(at.longitude),
    radius: String(COMMERCE_RADIUS_KM),
    limit: String(CANDIDATE_LIMIT),
  })
  const response = await fetch(`${PHOTON_URL}/reverse?${params}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
  })
  if (!response.ok) throw new Error(`Nearest commerce lookup failed with HTTP ${response.status}`)
  const payload: unknown = await response.json()
  const features = isRecord(payload) && Array.isArray(payload.features) ? payload.features : []
  const [nearest] = features
    .filter(isCommerce)
    .map((feature) => parseBusinessResult(feature, at))
    .filter((result) => result !== null)
    .sort((first, second) => first.distanceMeters - second.distanceMeters)
  return nearest ?? null
}
