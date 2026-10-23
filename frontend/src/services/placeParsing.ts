import { parseLngLat } from '@/services/coordinates'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'
import type { PlaceResult } from '@/types/place'

const METERS_PER_DEGREE = 111_320

/** Meters between two spots, flat-earth approximation: exact enough at the scale of a ride. */
export const measureDistanceMeters = (from: Coordinates, to: Coordinates): number => {
  const east = (to.longitude - from.longitude) * Math.cos((from.latitude * Math.PI) / 180)
  const north = to.latitude - from.latitude
  return Math.hypot(east, north) * METERS_PER_DEGREE
}

const readText = (properties: Record<string, unknown>, key: string): string => {
  const value = properties[key]
  return typeof value === 'string' ? value : ''
}

const joinText = (parts: readonly string[], separator: string): string => parts.filter(Boolean).join(separator)

// A house or a street has no name: its address is its title.
const readTitle = (properties: Record<string, unknown>): string =>
  readText(properties, 'name') ||
  joinText([readText(properties, 'street'), readText(properties, 'housenumber')], ' ')

const readAddress = (properties: Record<string, unknown>, title: string): string => {
  const street = joinText([readText(properties, 'street'), readText(properties, 'housenumber')], ' ')
  const area = readText(properties, 'district') || readText(properties, 'locality')
  const town = readText(properties, 'city') || readText(properties, 'county')
  const parts = [street, area, town].filter((part, index, all) => part !== title && !all.slice(0, index).includes(part))
  return joinText(parts, ', ')
}

// What Photon returns that is not a business: roads, towns and regions, and buildings (the address search has them).
const NON_BUSINESS_KEYS: readonly string[] = ['highway', 'place', 'boundary', 'building']

const buildResult = (
  id: string,
  { title, address, coordinates }: { title: string; address: string; coordinates: Coordinates },
  from: Coordinates,
): PlaceResult => ({
  kind: 'place',
  id,
  title,
  address,
  distanceMeters: measureDistanceMeters(from, coordinates),
  place: { id, name: joinText([title, address], ', '), coordinates },
})

/** A feature of the Photon search and reverse answers (OpenStreetMap data) that is a business or a landmark. */
export const parseBusinessResult = (feature: unknown, from: Coordinates): PlaceResult | null => {
  if (!isRecord(feature) || !isRecord(feature.properties) || !isRecord(feature.geometry)) return null
  const { properties } = feature
  const coordinates = parseLngLat(feature.geometry.coordinates)
  const title = readTitle(properties)
  const osmId = properties.osm_id
  if (!coordinates || !title || typeof osmId !== 'number') return null
  if (NON_BUSINESS_KEYS.includes(readText(properties, 'osm_key'))) return null
  const id = `${readText(properties, 'osm_type')}${osmId}`
  return buildResult(id, { title, address: readAddress(properties, title), coordinates }, from)
}

const COORDINATE_DECIMALS = 5
const PIN_TITLE = 'Dropped pin'

/** A spot given as coordinates, which no search has to find: any point of the map can be picked this way. */
export const buildCoordinateResult = (coordinates: Coordinates, from: Coordinates): PlaceResult => {
  const address = `${coordinates.latitude.toFixed(COORDINATE_DECIMALS)}, ${coordinates.longitude.toFixed(COORDINATE_DECIMALS)}`
  return buildResult(`pin-${address}`, { title: PIN_TITLE, address, coordinates }, from)
}

// The tags that say what an unnamed place is, such as the company that runs the gas station.
const OPERATOR_KEYS: readonly string[] = ['operator', 'brand', 'short_name', 'name:es', 'alt_name']

const readUnnamedAddress = (tags: Record<string, unknown>): string => {
  const street = joinText([readText(tags, 'addr:street'), readText(tags, 'addr:housenumber')], ' ')
  const area = readText(tags, 'addr:suburb') || readText(tags, 'addr:neighbourhood')
  return joinText([street, area, readText(tags, 'addr:city')], ', ')
}

// A way or a relation has no coordinates of its own: Overpass gives its center.
const readElementCoordinates = (element: Record<string, unknown>): Coordinates | null => {
  const point = isRecord(element.center) ? element.center : element
  const { lon, lat } = point
  return typeof lon === 'number' && typeof lat === 'number' ? { longitude: lon, latitude: lat } : null
}

/**
 * An element of the Overpass answer (OpenStreetMap data) for a place that has no name, which the
 * Photon search never has: it is titled with the company that runs it, or with what it is.
 */
export const parseUnnamedResult = (element: unknown, unnamedTitle: string, from: Coordinates): PlaceResult | null => {
  if (!isRecord(element) || !isRecord(element.tags)) return null
  const { tags } = element
  const coordinates = readElementCoordinates(element)
  if (!coordinates || typeof element.id !== 'number' || typeof element.type !== 'string') return null
  const title = OPERATOR_KEYS.map((key) => readText(tags, key)).find(Boolean) ?? unnamedTitle
  // The same id as the Photon answer gives, so a place in both is listed once.
  const id = `${element.type.charAt(0).toUpperCase()}${element.id}`
  return buildResult(id, { title, address: readUnnamedAddress(tags), coordinates }, from)
}

// "28014 Madrid, Madrid, Spain" is more than the row needs: the area and its parent are enough.
const ADDRESS_PARTS = 2

// An address or a street can be far from its road; its routable point is on it.
const parseRoutablePoint = (properties: Record<string, unknown>): Coordinates | null => {
  const { coordinates } = properties
  if (!isRecord(coordinates) || !Array.isArray(coordinates.routable_points)) return null
  const [point] = coordinates.routable_points
  if (!isRecord(point)) return null
  const { longitude, latitude } = point
  return typeof longitude === 'number' && typeof latitude === 'number' ? { longitude, latitude } : null
}

/** A feature of the Mapbox geocoding answer: an address, a street or an area. */
export const parseAddressResult = (feature: unknown, from: Coordinates): PlaceResult | null => {
  if (!isRecord(feature) || !isRecord(feature.properties) || !isRecord(feature.geometry)) return null
  const { properties } = feature
  const coordinates = parseRoutablePoint(properties) ?? parseLngLat(feature.geometry.coordinates)
  const title = readText(properties, 'name')
  const id = readText(properties, 'mapbox_id')
  if (!coordinates || !title || !id) return null
  const address = readText(properties, 'place_formatted').split(', ').slice(0, ADDRESS_PARTS).join(', ')
  return buildResult(id, { title, address, coordinates }, from)
}
