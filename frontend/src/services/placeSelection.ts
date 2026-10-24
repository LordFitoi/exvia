import type { Coordinates } from '@/types/geolocation'
import type { PlaceSelection } from '@/types/placeLocation'

/** Where the spot that the place card describes is. */
export const getSelectedCoordinates = (selection: PlaceSelection): Coordinates =>
  selection.kind === 'pin' ? selection.coordinates : selection.place.coordinates
