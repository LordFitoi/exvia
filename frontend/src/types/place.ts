import type { Coordinates } from '@/types/geolocation'

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

export type PlaceSuggestion = PlaceResult | CategoryResult
