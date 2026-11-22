import { METERS_PER_DEGREE_LATITUDE } from '@/services/routeProgress'
import type { Coordinates } from '@/types/geolocation'

interface FlatPath {
  readonly xs: Float64Array
  readonly ys: Float64Array
}

// One flat projection for the whole path: it bends distances a little far from `origin`, but alike for the
// path and the points measured against it, so the distance between them stays right.
const flatten = (points: readonly Coordinates[], origin: Coordinates): FlatPath => {
  const cosine = Math.cos((origin.latitude * Math.PI) / 180)
  const xs = new Float64Array(points.length)
  const ys = new Float64Array(points.length)
  points.forEach(({ longitude, latitude }, index) => {
    xs[index] = (longitude - origin.longitude) * cosine * METERS_PER_DEGREE_LATITUDE
    ys[index] = (latitude - origin.latitude) * METERS_PER_DEGREE_LATITUDE
  })
  return { xs, ys }
}

const distanceToSegment = (x: number, y: number, path: FlatPath, segment: number): number => {
  const { xs, ys } = path
  const startX = xs[segment]
  const startY = ys[segment]
  const directionX = xs[segment + 1] - startX
  const directionY = ys[segment + 1] - startY
  const lengthSquared = directionX * directionX + directionY * directionY
  const projection = lengthSquared === 0 ? 0 : ((x - startX) * directionX + (y - startY) * directionY) / lengthSquared
  const share = Math.min(1, Math.max(0, projection))
  return Math.hypot(x - (startX + share * directionX), y - (startY + share * directionY))
}

// The gap from a coordinate to the span [low, high]: a lower bound of the distance to anything inside it.
const gapToSpan = (value: number, low: number, high: number): number => Math.max(low - value, value - high, 0)

const distanceToPath = (x: number, y: number, path: FlatPath): number => {
  const { xs, ys } = path
  let closest = Infinity
  for (let segment = 0; segment < xs.length - 1; segment += 1) {
    const gapX = gapToSpan(x, Math.min(xs[segment], xs[segment + 1]), Math.max(xs[segment], xs[segment + 1]))
    const gapY = gapToSpan(y, Math.min(ys[segment], ys[segment + 1]), Math.max(ys[segment], ys[segment + 1]))
    if (gapX >= closest || gapY >= closest) continue
    closest = Math.min(closest, distanceToSegment(x, y, path, segment))
  }
  return closest
}

/**
 * How far each of `points` is from `path`, in meters, measured to the nearest spot of the path. A segment
 * whose box is already farther than the best found is skipped, so a long path costs little.
 */
export const measureDeviations = (points: readonly Coordinates[], path: readonly Coordinates[]): number[] => {
  const flatPath = flatten(path, path[0])
  const flatPoints = flatten(points, path[0])
  return points.map((_, index) => distanceToPath(flatPoints.xs[index], flatPoints.ys[index], flatPath))
}
