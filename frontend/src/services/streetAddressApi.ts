import { parseAddressResult } from '@/services/placeParsing'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'

const MAPBOX_REVERSE_URL = 'https://api.mapbox.com/search/geocode/v6/reverse'
const ADDRESS_TYPES = 'address,street'
const REQUEST_TIMEOUT_MS = 10_000

interface AddressOptions {
  readonly accessToken: string
  readonly signal: AbortSignal
}

/** The address at a spot, such as "Avenida Winston Churchill, Santo Domingo"; empty when Mapbox knows none there. */
export const fetchStreetAddress = async (
  { longitude, latitude }: Coordinates,
  { accessToken, signal }: AddressOptions,
): Promise<string> => {
  const params = new URLSearchParams({
    longitude: String(longitude),
    latitude: String(latitude),
    types: ADDRESS_TYPES,
    limit: '1',
    access_token: accessToken,
  })
  const response = await fetch(`${MAPBOX_REVERSE_URL}?${params}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
  })
  if (!response.ok) throw new Error(`Address lookup failed with HTTP ${response.status}`)
  const payload: unknown = await response.json()
  const [feature] = isRecord(payload) && Array.isArray(payload.features) ? payload.features : []
  return parseAddressResult(feature, { longitude, latitude })?.place.name ?? ''
}
