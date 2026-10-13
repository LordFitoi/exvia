import type { Coordinates } from '@/types/geolocation'

/** Reads a `[longitude, latitude]` pair, the order GeoJSON, Mapbox and the routes API use. */
export const parseLngLat = (value: unknown): Coordinates | null => {
  if (!Array.isArray(value)) return null
  const [longitude, latitude] = value
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null
  return { longitude, latitude }
}
