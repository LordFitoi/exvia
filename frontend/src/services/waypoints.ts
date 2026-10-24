import { parseLngLat } from '@/services/coordinates'
import { isPlaceLocationCategory } from '@/services/placeLocationCategories'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { Waypoint } from '@/types/route'

/** The longest name or address the server accepts for a waypoint. */
const WAYPOINT_TEXT_MAX_LENGTH = 255

/** A waypoint as the routes API sends and expects it. */
interface ApiWaypoint {
  readonly lng: number
  readonly lat: number
  readonly name: string
  readonly address: string
  readonly category: string | null
}

/** A plain point: nothing is known of what is there. */
export const toPlainWaypoint = (coordinates: Coordinates): Waypoint => ({ coordinates, name: '', address: '', category: null })

export const toApiWaypoint = ({ coordinates, name, address, category }: Waypoint): ApiWaypoint => ({
  lng: coordinates.longitude,
  lat: coordinates.latitude,
  name: name.slice(0, WAYPOINT_TEXT_MAX_LENGTH),
  address: address.slice(0, WAYPOINT_TEXT_MAX_LENGTH),
  category,
})

const parseWaypoint = (value: unknown): Waypoint | null => {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.address !== 'string') return null
  const coordinates = parseLngLat([value.lng, value.lat])
  if (!coordinates) return null
  const { category } = value
  if (category !== null && !isPlaceLocationCategory(category)) return null
  return { coordinates, name: value.name, address: value.address, category }
}

/** Reads the waypoints of a route from the API; null when any is not shaped as expected. */
export const parseWaypoints = (value: unknown): Waypoint[] | null => {
  if (!Array.isArray(value)) return null
  const waypoints = value.map(parseWaypoint)
  return waypoints.every((waypoint) => waypoint !== null) ? waypoints : null
}
