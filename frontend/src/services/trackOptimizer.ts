import { simplifyPath } from '@/services/simplifyPath'
import { METERS_PER_DEGREE_LATITUDE } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

// Six decimals are about 0.1 m: finer digits are GPS noise that only make the JSON longer.
const COORDINATE_DECIMALS = 6
const DECIMAL_BASE = 10
// A point is dropped when the line without it passes within this distance of it.
const SIMPLIFY_TOLERANCE_METERS = 5
const DEGREES_PER_RADIAN = 180 / Math.PI

const round = (value: number): number => {
  const factor = DECIMAL_BASE ** COORDINATE_DECIMALS
  return Math.round(value * factor) / factor
}

const roundPoint = ({ longitude, latitude }: Coordinates): Coordinates => ({
  longitude: round(longitude),
  latitude: round(latitude),
})

const isSamePlace = (first: Coordinates, second: Coordinates): boolean =>
  first.longitude === second.longitude && first.latitude === second.latitude

const dropRepeats = (path: readonly Coordinates[]): Coordinates[] =>
  path.filter((point, index) => index === 0 || !isSamePlace(point, path[index - 1]))

// A degree of longitude is shorter than one of latitude by the cosine of the latitude, so the
// path is stretched to equal-sized degrees before simplifying, then shrunk back.
const getLongitudeScale = (path: readonly Coordinates[]): number => {
  const meanLatitude = path.reduce((total, { latitude }) => total + latitude, 0) / path.length
  return Math.cos(meanLatitude / DEGREES_PER_RADIAN)
}

const simplifyInMeters = (path: readonly Coordinates[]): Coordinates[] => {
  const scale = getLongitudeScale(path)
  const stretched = path.map(({ longitude, latitude }) => ({ longitude: longitude * scale, latitude }))
  const tolerance = SIMPLIFY_TOLERANCE_METERS / METERS_PER_DEGREE_LATITUDE
  return simplifyPath(stretched, tolerance).map(({ longitude, latitude }) =>
    roundPoint({ longitude: longitude / scale, latitude }),
  )
}

/**
 * Shrinks a recorded track before it is saved: coordinates rounded to about 0.1 m, repeated points
 * removed, and every point that a straight line can replace within `SIMPLIFY_TOLERANCE_METERS`
 * dropped (Douglas-Peucker). The first and last points are always kept.
 */
export const optimizeTrack = (track: readonly Coordinates[]): Coordinates[] => {
  const distinct = dropRepeats(track.map(roundPoint))
  return distinct.length < 3 ? distinct : dropRepeats(simplifyInMeters(distinct))
}
