import { findCategories } from '@/services/placeCategories'
import { measureDistanceMeters, parseAddressResult, parseBusinessResult } from '@/services/placeParsing'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceResult, PlaceSuggestion } from '@/types/place'

// Mapbox finds addresses and streets well, but has few businesses in many countries (none of the
// gas stations of the Dominican Republic). Photon searches OpenStreetMap, which maps them, so the
// two answer together.
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/search/geocode/v6/forward'
const ADDRESS_TYPES = 'address,street,neighborhood,locality,place'
const PHOTON_URL = 'https://photon.komoot.io'
// Only places this close to the rider are offered, so a namesake in another country never shows.
const SEARCH_RADIUS_KM = 100
const KM_PER_DEGREE = 111.32
// Both services only lean towards the rider, so more matches are asked for and the nearest kept.
const MAX_CANDIDATES = 10
const MAX_PLACES = 6
const DUPLICATE_METERS = 100

interface SearchOptions {
  readonly signal: AbortSignal
  /** Places are ordered by distance from this spot. */
  readonly proximity: Coordinates
}

interface TextSearchOptions extends SearchOptions {
  readonly accessToken: string
}

/** The box around `center` as both services take it: west, south, east, north. */
const toBoundingBox = ({ longitude, latitude }: Coordinates): string => {
  const latitudeSpan = SEARCH_RADIUS_KM / KM_PER_DEGREE
  const longitudeSpan = latitudeSpan / Math.cos((latitude * Math.PI) / 180)
  return [longitude - longitudeSpan, latitude - latitudeSpan, longitude + longitudeSpan, latitude + latitudeSpan].join(',')
}

const requestJson = async (url: string, signal: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Place search failed with HTTP ${response.status}`)
  return response.json()
}

const readFeatures = (payload: unknown): unknown[] =>
  isRecord(payload) && Array.isArray(payload.features) ? payload.features : []

// OpenStreetMap often maps one place twice (the point and its building).
const isRepeated = (result: PlaceResult, index: number, all: readonly PlaceResult[]): boolean =>
  all
    .slice(0, index)
    .some(
      ({ title, place }) =>
        title === result.title &&
        measureDistanceMeters(place.coordinates, result.place.coordinates) < DUPLICATE_METERS,
    )

const keepNearest = (results: readonly PlaceResult[]): PlaceResult[] =>
  [...results]
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .filter((result, index, all) => !isRepeated(result, index, all))
    .slice(0, MAX_PLACES)

const fetchAddresses = async (
  query: string,
  { accessToken, signal, proximity }: TextSearchOptions,
): Promise<PlaceResult[]> => {
  const params = new URLSearchParams({
    q: query,
    types: ADDRESS_TYPES,
    proximity: `${proximity.longitude},${proximity.latitude}`,
    bbox: toBoundingBox(proximity),
    limit: String(MAX_CANDIDATES),
    access_token: accessToken,
  })
  const payload = await requestJson(`${MAPBOX_GEOCODING_URL}?${params}`, signal)
  return readFeatures(payload)
    .map((feature) => parseAddressResult(feature, proximity))
    .filter((result) => result !== null)
}

const fetchBusinesses = async (
  query: string,
  { signal, proximity }: SearchOptions,
): Promise<PlaceResult[]> => {
  const params = new URLSearchParams({
    q: query,
    lat: String(proximity.latitude),
    lon: String(proximity.longitude),
    bbox: toBoundingBox(proximity),
    limit: String(MAX_CANDIDATES),
  })
  const payload = await requestJson(`${PHOTON_URL}/api/?${params}`, signal)
  return readFeatures(payload)
    .map((feature) => parseBusinessResult(feature, proximity))
    .filter((result) => result !== null)
}

/**
 * The kinds of place that the text names, then the addresses and the businesses that match it,
 * nearest first. If one service fails the other still answers.
 */
export const searchPlaces = async (
  query: string,
  options: TextSearchOptions,
): Promise<PlaceSuggestion[]> => {
  const answers = await Promise.allSettled([fetchAddresses(query, options), fetchBusinesses(query, options)])
  // A search replaced by newer typing is not a failure of either service.
  options.signal.throwIfAborted()
  const failure = answers.find((answer) => answer.status === 'rejected')
  if (failure && answers.every((answer) => answer.status === 'rejected')) throw failure.reason
  if (failure) console.error('One place search failed', failure.reason)
  const found = answers.flatMap((answer) => (answer.status === 'fulfilled' ? answer.value : []))
  return [...findCategories(query), ...keepNearest(found)]
}

/** The nearest places of one kind, such as gas stations. */
export const searchCategory = async (
  osmTag: string,
  { signal, proximity }: SearchOptions,
): Promise<PlaceResult[]> => {
  const params = new URLSearchParams({
    lat: String(proximity.latitude),
    lon: String(proximity.longitude),
    radius: String(SEARCH_RADIUS_KM),
    osm_tag: osmTag,
    limit: String(MAX_CANDIDATES),
  })
  const payload = await requestJson(`${PHOTON_URL}/reverse?${params}`, signal)
  return keepNearest(
    readFeatures(payload)
      .map((feature) => parseBusinessResult(feature, proximity))
      .filter((result) => result !== null),
  )
}
