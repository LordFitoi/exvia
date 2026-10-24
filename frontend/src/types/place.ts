import type { Coordinates } from '@/types/geolocation'
import type { PlaceLocation } from '@/types/placeLocation'

/** A place, business or address found by the search, ready to become a point. */
export interface Place {
  readonly id: string
  /** The name followed by its address, as the point is titled. */
  readonly name: string
  readonly coordinates: Coordinates
}

/** A row of the search list that adds a place. */
export interface PlaceResult {
  readonly kind: 'place'
  readonly id: string
  readonly title: string
  readonly address: string
  /** Meters from the rider. */
  readonly distanceMeters: number
  readonly place: Place
}

/** A row of the search list that opens the nearest places of a kind, such as gas stations. */
export interface CategoryResult {
  readonly kind: 'category'
  /** The OpenStreetMap tag of the kind, such as `amenity:fuel`. */
  readonly id: string
  readonly title: string
}

/** A row of the search list that adds one of the rider's saved places. */
export interface SavedPlaceResult {
  readonly kind: 'saved'
  readonly id: string
  readonly title: string
  /** The kind of place it was saved as, such as "Gas station". */
  readonly address: string
  /** Meters from the rider. */
  readonly distanceMeters: number
  /** The icon of the kind it was saved as. */
  readonly iconClass: string
  readonly place: Place
  /** The saved place itself, with its kind and notes. */
  readonly saved: PlaceLocation
}

export type PlaceSuggestion = PlaceResult | SavedPlaceResult | CategoryResult
