import type { Map as MapboxMap, Marker } from 'mapbox-gl'

import { toLngLat } from '@/services/baseMap'
import type { MapboxModule } from '@/services/baseMap'
import { getInitials } from '@/services/riderInitials'
import type { RiderMarkerData } from '@/services/riderMarkers'

const createBubble = (username: string, avatar: string | null): HTMLSpanElement => {
  const bubble = document.createElement('span')
  bubble.className = 'avatar'
  if (!avatar) {
    bubble.textContent = getInitials(username)
    return bubble
  }
  const picture = document.createElement('img')
  picture.src = avatar
  picture.alt = ''
  bubble.append(picture)
  return bubble
}

/** The guide's `rider-marker`: the rider's picture (or initials) in a bubble above a dot on their position. */
const createRiderElement = ({ username, avatar }: RiderMarkerData): HTMLSpanElement => {
  const element = document.createElement('span')
  element.className = 'rider-marker'
  element.role = 'img'
  element.ariaLabel = username
  const dot = document.createElement('span')
  dot.className = 'rider-dot'
  element.append(createBubble(username, avatar), dot)
  return element
}

/** Puts a rider on the map. The marker box has no size and sits on the point, so it is anchored at its corner. */
export const addRiderMarker = (mapboxgl: MapboxModule, map: MapboxMap, rider: RiderMarkerData): Marker =>
  new mapboxgl.Marker({ element: createRiderElement(rider), anchor: 'top-left' })
    .setLngLat(toLngLat(rider.position))
    .addTo(map)
