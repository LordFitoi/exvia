const CATEGORIES = [
  { value: 'gas_station', label: 'Gas station', iconClass: 'icon-fuel' },
  { value: 'restaurant', label: 'Restaurant', iconClass: 'icon-utensils' },
  { value: 'cafe', label: 'Cafe', iconClass: 'icon-coffee' },
  { value: 'mechanic', label: 'Mechanic', iconClass: 'icon-wrench' },
  { value: 'hotel', label: 'Hotel', iconClass: 'icon-bed' },
  { value: 'camping', label: 'Camping', iconClass: 'icon-tent' },
  { value: 'viewpoint', label: 'Viewpoint', iconClass: 'icon-mountain' },
  { value: 'rest_stop', label: 'Rest stop', iconClass: 'icon-parking' },
  { value: 'other', label: 'Other', iconClass: 'icon-star' },
] as const

/** A kind of saved place; the values are the ones `apps/places` accepts. */
export type PlaceLocationCategory = (typeof CATEGORIES)[number]['value']

export interface PlaceLocationCategoryDetails {
  readonly value: PlaceLocationCategory
  readonly label: string
  /** The icon of the kind, on the map marker and in the picker. */
  readonly iconClass: string
}

export const DEFAULT_PLACE_LOCATION_CATEGORY: PlaceLocationCategory = 'other'

/** Every kind, in the order the picker lists them. */
export const PLACE_LOCATION_CATEGORIES: readonly PlaceLocationCategoryDetails[] = CATEGORIES

export const isPlaceLocationCategory = (value: unknown): value is PlaceLocationCategory =>
  CATEGORIES.some((category) => category.value === value)

export const describePlaceLocationCategory = (value: PlaceLocationCategory): PlaceLocationCategoryDetails =>
  CATEGORIES.find((category) => category.value === value) ?? CATEGORIES[CATEGORIES.length - 1]
