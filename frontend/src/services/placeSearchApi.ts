import { parseCoordinateQuery } from '@/services/coordinateQuery'
import { findCategories, findCategoryByTag, listUnnamedCategories, splitCategoryQuery } from '@/services/placeCategories'
import type { CategoryQuery, PlaceCategory } from '@/services/placeCategories'
import {
  buildCoordinateResult,
  measureDistanceMeters,
  parseAddressResult,
  parseBusinessResult,
} from '@/services/placeParsing'
import { hasFullMatch, keepMatching, rankPlaces } from '@/services/placeRanking'
import { SEARCH_RADIUS_KM } from '@/services/placeSearchConfig'
import { normalizeText } from '@/services/placeText'
import { isRecord } from '@/services/typeGuards'
import { fetchUnnamedPlaces } from '@/services/unnamedPlacesApi'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceResult, PlaceSuggestion } from '@/types/place'

// Mapbox finds addresses and streets well, but has few businesses in many countries (none of the
// gas stations of the Dominican Republic). Photon searches OpenStreetMap, which maps them, so the
// two answer together.
const MAPBOX_GEOCODING_URL = 'https://api.mapbox.com/search/geocode/v6/forward'
const ADDRESS_TYPES = 'address,street,neighborhood,locality,place'
const PHOTON_URL = 'https://photon.komoot.io'
const KM_PER_DEGREE = 111.32
// Both services only lean towards the rider, so as many matches as they give are asked for (Mapbox
// answers 10 at most, Photon 50) and the best are kept: with fewer, the nearest place is often missing.
const MAPBOX_LIMIT = 10
const PHOTON_LIMIT = 50
const MAX_PLACES = 8
const DUPLICATE_METERS = 100
// A service that does not answer is a failure, so the list never waits on it for good.
const REQUEST_TIMEOUT_MS = 10_000
// A word with a typing mistake finds nothing, so it is asked again without its ending: "sigam" as "sig".
const MIN_SHORTENED_WORD_LENGTH = 5
const SHORTENED_ENDING_LENGTH = 2

interface SearchOptions {
  readonly signal: AbortSignal
  /** Places are ordered by distance from this spot. */
  readonly proximity: Coordinates
}

interface TextSearchOptions extends SearchOptions {
  readonly accessToken: string
}

interface NamedAnswer {
  readonly places: PlaceResult[]
  /** Whether the places were asked of one kind only, so no kind needs offering. */
  readonly isInCategory: boolean
  /** The kinds whose unnamed places may complete the answer. */
  readonly unnamedCategories: readonly PlaceCategory[]
}

/** The box around `center` as both services take it: west, south, east, north. */
const toBoundingBox = ({ longitude, latitude }: Coordinates): string => {
  const latitudeSpan = SEARCH_RADIUS_KM / KM_PER_DEGREE
  const longitudeSpan = latitudeSpan / Math.cos((latitude * Math.PI) / 180)
  return [longitude - longitudeSpan, latitude - latitudeSpan, longitude + longitudeSpan, latitude + latitudeSpan].join(',')
}

const requestJson = async (url: string, signal: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]) })
  if (!response.ok) throw new Error(`Place search failed with HTTP ${response.status}`)
  return response.json()
}

const readFeatures = (payload: unknown): unknown[] =>
  isRecord(payload) && Array.isArray(payload.features) ? payload.features : []

// OpenStreetMap often maps one place twice (the point and its building).
const isRepeated = (place: PlaceResult, index: number, all: readonly PlaceResult[]): boolean =>
  all
    .slice(0, index)
    .some(
      (earlier) =>
        earlier.id === place.id ||
        (earlier.title === place.title &&
          measureDistanceMeters(earlier.place.coordinates, place.place.coordinates) < DUPLICATE_METERS),
    )

/** The places that answer `text` best (the nearest first among equals), each once. */
const pickBest = (text: string, places: readonly PlaceResult[]): PlaceResult[] =>
  rankPlaces(text, places)
    .filter((place, index, all) => !isRepeated(place, index, all))
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
    limit: String(MAPBOX_LIMIT),
    access_token: accessToken,
  })
  const payload = await requestJson(`${MAPBOX_GEOCODING_URL}?${params}`, signal)
  return readFeatures(payload)
    .map((feature) => parseAddressResult(feature, proximity))
    .filter((result) => result !== null)
}

/** The businesses and landmarks that match `text`, only of the kind `osmTag` when it is given. */
const fetchBusinesses = async (
  text: string,
  { signal, proximity }: SearchOptions,
  osmTag?: string,
): Promise<PlaceResult[]> => {
  const params = new URLSearchParams({
    q: text,
    lat: String(proximity.latitude),
    lon: String(proximity.longitude),
    bbox: toBoundingBox(proximity),
    limit: String(PHOTON_LIMIT),
  })
  if (osmTag) params.set('osm_tag', osmTag)
  const payload = await requestJson(`${PHOTON_URL}/api/?${params}`, signal)
  return readFeatures(payload)
    .map((feature) => parseBusinessResult(feature, proximity))
    .filter((result) => result !== null)
}

const shortenLastWord = (text: string): string | null => {
  const words = normalizeText(text).split(' ')
  const last = words[words.length - 1]
  if (last.length < MIN_SHORTENED_WORD_LENGTH) return null
  return [...words.slice(0, -1), last.slice(0, last.length - SHORTENED_ENDING_LENGTH)].join(' ')
}

/** Photon does not forgive a typing mistake, so when nothing it found has all the words, it is asked again with a shorter last word. */
const fetchBusinessesTolerantly = async (
  text: string,
  options: SearchOptions,
  osmTag?: string,
): Promise<PlaceResult[]> => {
  const found = await fetchBusinesses(text, options, osmTag)
  const shorter = shortenLastWord(text)
  if (shorter === null || hasFullMatch(text, found)) return found
  return [...found, ...(await fetchBusinesses(shorter, options, osmTag))]
}

const fetchCategoryPlaces = async (osmTag: string, { signal, proximity }: SearchOptions): Promise<PlaceResult[]> => {
  const params = new URLSearchParams({
    lat: String(proximity.latitude),
    lon: String(proximity.longitude),
    radius: String(SEARCH_RADIUS_KM),
    osm_tag: osmTag,
    limit: String(PHOTON_LIMIT),
  })
  const payload = await requestJson(`${PHOTON_URL}/reverse?${params}`, signal)
  return readFeatures(payload)
    .map((feature) => parseBusinessResult(feature, proximity))
    .filter((result) => result !== null)
}

/** The places of the answers that came, and the failure of the services when none came. */
const collectAnswers = (answers: readonly PromiseSettledResult<PlaceResult[]>[], signal: AbortSignal): PlaceResult[] => {
  // A search replaced by newer typing is not a failure of either service.
  signal.throwIfAborted()
  const failure = answers.find((answer) => answer.status === 'rejected')
  if (failure && answers.every((answer) => answer.status === 'rejected')) throw failure.reason
  if (failure) console.error('One place search failed', failure.reason)
  return answers.flatMap((answer) => (answer.status === 'fulfilled' ? answer.value : []))
}

const searchEverywhere = async (query: string, options: TextSearchOptions): Promise<PlaceResult[]> => {
  const answers = await Promise.allSettled([fetchAddresses(query, options), fetchBusinessesTolerantly(query, options)])
  return collectAnswers(answers, options.signal)
}

/**
 * The places of a kind that `rest` asks for: by name ("sigma"), else by address among the nearest of
 * the kind ("27 de febrero"), since Photon only matches names.
 */
const searchInCategory = async (
  { category, rest }: CategoryQuery,
  options: SearchOptions,
): Promise<PlaceResult[]> => {
  const byName = await fetchBusinessesTolerantly(rest, options, category.osmTag)
  if (byName.length > 0) return byName
  return keepMatching(rest, await fetchCategoryPlaces(category.osmTag, options))
}

/** Text that names a kind of place is asked of that kind alone, which is how "gasolinera sigma" finds the Sigma gas stations. */
const searchNamed = async (
  query: string,
  inCategory: CategoryQuery | null,
  options: TextSearchOptions,
): Promise<NamedAnswer> => {
  if (inCategory) {
    const places = await searchInCategory(inCategory, options).catch((error: unknown) => {
      options.signal.throwIfAborted()
      console.error('Place search of one kind failed', error)
      return []
    })
    if (places.length > 0) return { places, isInCategory: true, unnamedCategories: [inCategory.category] }
  }
  const places = await searchEverywhere(query, options)
  return { places, isInCategory: false, unnamedCategories: listUnnamedCategories() }
}

const fetchUnnamedOfKinds = async (kinds: readonly PlaceCategory[], proximity: Coordinates): Promise<PlaceResult[]> => {
  const lists = await Promise.all(
    kinds.map(({ osmTag, unnamedTitle }) => (unnamedTitle ? fetchUnnamedPlaces(osmTag, unnamedTitle, proximity) : [])),
  )
  return lists.flat()
}

/**
 * What the text typed finds, in answers that grow: first the pin if it is coordinates, or the places
 * that Mapbox and Photon give, then the same completed with the places that OpenStreetMap has no name
 * for. The places are ranked by how well they answer the text, then by distance, so the nearest of
 * the places that match comes first. If one service fails the other still answers.
 */
export async function* searchPlaces(query: string, options: TextSearchOptions): AsyncGenerator<PlaceSuggestion[]> {
  const pin = parseCoordinateQuery(query)
  if (pin) {
    yield [buildCoordinateResult(pin, options.proximity)]
    return
  }
  const inCategory = splitCategoryQuery(query)
  if (inCategory?.rest === '') {
    yield* searchCategory(inCategory.category.osmTag, options)
    return
  }
  const named = await searchNamed(query, inCategory, options)
  const kinds = named.isInCategory ? [] : findCategories(query)
  yield [...kinds, ...pickBest(query, named.places)]
  const unnamed = keepMatching(query, await fetchUnnamedOfKinds(named.unnamedCategories, options.proximity))
  if (unnamed.length > 0) yield [...kinds, ...pickBest(query, [...named.places, ...unnamed])]
}

/** The nearest places of one kind, such as gas stations, then the same with the unnamed ones of the kind. */
export async function* searchCategory(osmTag: string, options: SearchOptions): AsyncGenerator<PlaceSuggestion[]> {
  const named = await fetchCategoryPlaces(osmTag, options)
  yield pickBest('', named)
  const category = findCategoryByTag(osmTag)
  const unnamed = await fetchUnnamedOfKinds(category ? [category] : [], options.proximity)
  if (unnamed.length > 0) yield pickBest('', [...named, ...unnamed])
}
