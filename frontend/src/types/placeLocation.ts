import type { PlaceLocationCategory } from '@/services/placeLocationCategories'
import type { Coordinates } from '@/types/geolocation'
import type { Place } from '@/types/place'

/** A place the rider saved as a favorite. */
export interface PlaceLocation {
  readonly id: number
  readonly name: string
  readonly notes: string
  readonly category: PlaceLocationCategory
  readonly coordinates: Coordinates
}

/** What the rider writes about a saved place: it can be edited after the place is saved. */
export interface PlaceDetails {
  readonly name: string
  readonly notes: string
  readonly category: PlaceLocationCategory
}

export interface NewPlaceLocation extends PlaceDetails {
  readonly coordinates: Coordinates
}

/** What the save sheet needs to open: where the place is and the name to start from. */
export interface SavePlaceRequest {
  readonly coordinates: Coordinates
  /** The name of the business at the spot, or empty when there is none. */
  readonly suggestedName: string
}

/** What the place card describes: a spot the rider pressed on, a place picked in the search, or one of their saved places. */
export type PlaceSelection =
  | { readonly kind: 'pin'; readonly coordinates: Coordinates }
  | { readonly kind: 'found'; readonly place: Place }
| { readonly kind: 'pin'; readonly coordinates: Coordinates }
  | { readonly kind: 'saved'; readonly place: PlaceLocation }
