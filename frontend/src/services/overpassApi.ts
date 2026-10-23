import { isRecord } from '@/services/typeGuards'

// Overpass reads OpenStreetMap data by tag. It is a free public service that is often slow or busy,
// so whatever uses it must work without an answer. Swap `OVERPASS_URL` for a self-hosted instance
// (the same API) if it is ever a problem.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const SERVER_TIMEOUT_SECONDS = 10
const REQUEST_TIMEOUT_MS = 12_000

/** The elements that the Overpass `statement` finds, such as `nwr["amenity"="fuel"](around:1000,18.4,-69.9);out center;`. */
export const requestOverpassElements = async (statement: string, signal?: AbortSignal): Promise<unknown[]> => {
  const query = `[out:json][timeout:${SERVER_TIMEOUT_SECONDS}];${statement}`
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const response = await fetch(`${OVERPASS_URL}?data=${encodeURIComponent(query)}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) throw new Error(`Overpass request failed with HTTP ${response.status}`)
  const payload: unknown = await response.json()
  return isRecord(payload) && Array.isArray(payload.elements) ? payload.elements : []
}
