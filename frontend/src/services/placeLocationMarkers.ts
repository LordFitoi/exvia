import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import type { PlaceLocation } from '@/types/placeLocation'

const createIcon = (iconClass: string): HTMLSpanElement => {
  const icon = document.createElement('span')
  icon.className = `icon icon-sm ${iconClass}`
  icon.ariaHidden = 'true'
  return icon
}

const createPlaceLocationButton = (place: PlaceLocation, onSelect: (place: PlaceLocation) => void): HTMLButtonElement => {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'marker marker-place'
  element.addEventListener('click', (event) => {
    // The marker sits inside the map container, so the click would otherwise also close the place card.
    event.stopPropagation()
    onSelect(place)
  })
  return element
}

const describePlaceLocationElement = (element: HTMLElement, place: PlaceLocation): void => {
  const { label, iconClass } = describePlaceLocationCategory(place.category)
  element.ariaLabel = `${place.name}, ${label.toLowerCase()}`
  element.append(createIcon(iconClass))
}

// Mapbox sets `pointer-events` on the element it positions, so the landmark is a child of an empty,
// zero-size box: only the child can be hit, and its CSS turns that off.
const createPassivePlaceLocation = (place: PlaceLocation): HTMLDivElement => {
  const landmark = document.createElement('span')
  landmark.className = 'marker marker-place marker-passive'
  landmark.role = 'img'
  describePlaceLocationElement(landmark, place)
  const box = document.createElement('div')
  box.append(landmark)
  return box
}

/**
 * The marker of a saved place: its kind's icon. With `onSelect`, a button that selects the place and
 * nothing else; with null, only a landmark that takes no taps, for the maps where a tap does something else.
 */
export const createPlaceLocationElement = (
  place: PlaceLocation,
  onSelect: ((place: PlaceLocation) => void) | null,
): HTMLElement => {
  if (!onSelect) return createPassivePlaceLocation(place)
  const button = createPlaceLocationButton(place, onSelect)
  describePlaceLocationElement(button, place)
  return button
}

/** The marker of a pressed spot; the card shows what it is, so it takes no taps. */
export const createPinElement = (): HTMLSpanElement => {
  const element = document.createElement('span')
  element.className = 'marker'
  element.role = 'img'
  element.ariaLabel = 'Dropped pin'
  element.append(createIcon('icon-pin'))
  return element
}
