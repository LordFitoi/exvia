import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import { measureDistanceMeters } from '@/services/placeParsing'
import { keepMatching, rankPlaces } from '@/services/placeRanking'
import { normalizeText } from '@/services/placeText'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceSuggestion, SavedPlaceResult } from '@/types/place'
import type { PlaceLocation } from '@/types/placeLocation'

// Saved places go first, so a few are enough: the rest of the list is for places the rider has not saved.
const MAX_SAVED_SUGGESTIONS = 4
// A place the services list at a saved place's spot, under its name, is that same place.
const SAME_SPOT_METERS = 100

const toSavedResult = (place: PlaceLocation, from: Coordinates): SavedPlaceResult => {
  const { label, iconClass } = describePlaceLocationCategory(place.category)
  return {
    kind: 'saved',
    id: `saved-${place.id}`,
    title: place.name,
    address: label,
    distanceMeters: measureDistanceMeters(from, place.coordinates),
    iconClass,
    place: { id: `place-location-${place.id}`, name: place.name, coordinates: place.coordinates },
  }
}

/** The saved places that answer `text` by their name or their kind ("gas station"), best first and nearest first among equals. */
export const findSavedPlaces = (text: string, places: readonly PlaceLocation[], from: Coordinates): SavedPlaceResult[] => {
  const results = places.map((place) => toSavedResult(place, from))
  return rankPlaces(text, keepMatching(text, results)).slice(0, MAX_SAVED_SUGGESTIONS)
}

const isSavedPlaceAgain = (suggestion: PlaceSuggestion, saved: readonly SavedPlaceResult[]): boolean =>
  suggestion.kind === 'place' &&
  saved.some(
    ({ title, place }) =>
      normalizeText(title) === normalizeText(suggestion.title) &&
      measureDistanceMeters(place.coordinates, suggestion.place.coordinates) < SAME_SPOT_METERS,
  )

/** The saved places first, as the primary suggestions, then what the services found (without the saved places they list again). */
export const putSavedPlacesFirst = (
  saved: readonly SavedPlaceResult[],
  others: readonly PlaceSuggestion[],
): readonly PlaceSuggestion[] =>
  saved.length === 0 ? others : [...saved, ...others.filter((other) => !isSavedPlaceAgain(other, saved))]
