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
