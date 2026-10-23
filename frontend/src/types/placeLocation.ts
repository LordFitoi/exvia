import type { PlaceLocationCategory } from '@/services/placeLocationCategories'
import type { Coordinates } from '@/types/geolocation'

/** A place the rider saved as a favorite. */
export interface PlaceLocation {
  readonly id: number
  readonly name: string
  readonly notes: string
  readonly category: PlaceLocationCategory
  readonly coordinates: Coordinates
}

export interface NewPlaceLocation {
  readonly name: string
  readonly notes: string
  readonly category: PlaceLocationCategory
  readonly coordinates: Coordinates
}

/** What the save sheet needs to open: where the place is and the name to start from. */
export interface SavePlaceRequest {
  readonly coordinates: Coordinates
  /** The name of the business at the spot, or empty when there is none. */
  readonly suggestedName: string
}

/** What the place card describes: a spot the rider pressed on, or one of their saved places. */
export type PlaceSelection =
  | { readonly kind: 'pin'; readonly coordinates: Coordinates }
  | { readonly kind: 'saved'; readonly place: PlaceLocation }
