import type { Coordinates } from '@/types/geolocation'

const DEGREES_IN_CIRCLE = 360

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/** Compass bearing in degrees, 0 to 360, of the great-circle direction from one point to another. */
export const calculateBearing = (from: Coordinates, to: Coordinates): number => {
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const deltaLongitude = toRadians(to.longitude - from.longitude)
  const east = Math.sin(deltaLongitude) * Math.cos(toLatitude)
  const north =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(deltaLongitude)
  const degrees = (Math.atan2(east, north) * 180) / Math.PI
  return (degrees + DEGREES_IN_CIRCLE) % DEGREES_IN_CIRCLE
}
