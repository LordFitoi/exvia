import type { Coordinates } from '@/types/geolocation'

const METERS_PER_DEGREE_LATITUDE = 111_320
// A rider this close to the track is on it; GPS and street snapping are never exact.
const ON_TRACK_METERS = 40
// Progress only moves forward, and only this far ahead of the last fix, so a loop that comes back
// near the start is not mistaken for the start.
const SEARCH_AHEAD_METERS = 400
// GPS jitter can place the rider a little behind the last fix; that is not a move backwards.
const JITTER_BACK_METERS = 30

/** A path with the distance from its start to every vertex, in meters. */
export interface MeasuredPath {
  readonly points: readonly Coordinates[]
  readonly distances: readonly number[]
}

/** The closest spot of a path to a position. */
export interface PathLocation {
  /** Meters from the start of the path to the spot. */
  readonly distance: number
  /** Meters between the position and the spot. */
  readonly offset: number
  readonly point: Coordinates
}

interface Flat {
  readonly x: number
  readonly y: number
}

// A flat projection around `origin`: exact enough for the few hundred meters of a segment.
const flatten = (point: Coordinates, origin: Coordinates): Flat => {
  const cosine = Math.cos((origin.latitude * Math.PI) / 180)
  return {
    x: (point.longitude - origin.longitude) * cosine * METERS_PER_DEGREE_LATITUDE,
    y: (point.latitude - origin.latitude) * METERS_PER_DEGREE_LATITUDE,
  }
}

export const measureDistance = (from: Coordinates, to: Coordinates): number => {
  const { x, y } = flatten(to, from)
  return Math.hypot(x, y)
}

export const measurePath = (points: readonly Coordinates[]): MeasuredPath => {
  const distances = [0]
  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances[index - 1] + measureDistance(points[index - 1], points[index]))
  }
  return { points, distances }
}

export const getPathLength = ({ distances }: MeasuredPath): number => distances[distances.length - 1]

const pointAt = (from: Coordinates, to: Coordinates, fraction: number): Coordinates => ({
  longitude: from.longitude + (to.longitude - from.longitude) * fraction,
  latitude: from.latitude + (to.latitude - from.latitude) * fraction,
})

const locateOnSegment = (
  path: MeasuredPath,
  segment: number,
  position: Coordinates,
): PathLocation => {
  const start = path.points[segment]
  const end = path.points[segment + 1]
  const target = flatten(position, start)
  const direction = flatten(end, start)
  const lengthSquared = direction.x ** 2 + direction.y ** 2
  const projection = lengthSquared === 0 ? 0 : (target.x * direction.x + target.y * direction.y) / lengthSquared
  const fraction = Math.min(1, Math.max(0, projection))
  const point = pointAt(start, end, fraction)
  return {
    distance: path.distances[segment] + fraction * Math.sqrt(lengthSquared),
    offset: measureDistance(point, position),
    point,
  }
}

interface SearchRange {
  /** Only spots at or after this distance count. */
  readonly from: number
  /** Only spots up to this distance count. */
  readonly to: number
}

/** The spot of the path closest to `position` within `range`, or null when the range is empty. */
export const locateOnPath = (
  path: MeasuredPath,
  position: Coordinates,
  { from, to }: SearchRange,
): PathLocation | null => {
  let closest: PathLocation | null = null
  for (let segment = 0; segment < path.points.length - 1; segment += 1) {
    if (path.distances[segment + 1] < from) continue
    if (path.distances[segment] > to) break
    const candidate = locateOnSegment(path, segment, position)
    if (candidate.distance >= from && (!closest || candidate.offset < closest.offset)) {
      closest = candidate
    }
  }
  return closest
}

/**
 * Where the rider is on the track, moving only forward from `progress` (the distance reached so
 * far). Returns null when the rider is not on the track.
 */
export const trackProgress = (
  path: MeasuredPath,
  position: Coordinates,
  progress: number,
): PathLocation | null => {
  const from = Math.max(0, progress - JITTER_BACK_METERS)
  const ahead = locateOnPath(path, position, { from, to: progress + SEARCH_AHEAD_METERS })
  if (ahead && ahead.offset <= ON_TRACK_METERS) return ahead
  const anywhere = locateOnPath(path, position, { from: 0, to: getPathLength(path) })
  return anywhere && anywhere.offset <= ON_TRACK_METERS ? anywhere : null
}

/** The part of the path between two distances, as a line from `fromPoint` to `toPoint`. */
export const slicePath = (
  path: MeasuredPath,
  range: SearchRange,
  ends: { readonly fromPoint: Coordinates; readonly toPoint: Coordinates },
): Coordinates[] => {
  const inside = path.points.filter(
    (_, index) => path.distances[index] > range.from && path.distances[index] < range.to,
  )
  return [ends.fromPoint, ...inside, ends.toPoint]
}
