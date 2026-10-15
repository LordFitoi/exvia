import type { Coordinates } from '@/types/geolocation'

interface Span {
  readonly first: number
  readonly last: number
}

const distanceToSegment = (point: Coordinates, start: Coordinates, end: Coordinates): number => {
  const segmentX = end.longitude - start.longitude
  const segmentY = end.latitude - start.latitude
  const offsetX = point.longitude - start.longitude
  const offsetY = point.latitude - start.latitude
  const lengthSquared = segmentX ** 2 + segmentY ** 2
  const share = lengthSquared === 0 ? 0 : (offsetX * segmentX + offsetY * segmentY) / lengthSquared
  const clamped = Math.min(1, Math.max(0, share))
  return Math.hypot(offsetX - clamped * segmentX, offsetY - clamped * segmentY)
}

const findFarthestPoint = (path: readonly Coordinates[], { first, last }: Span) => {
  let farthest = { index: first, distance: 0 }
  for (let index = first + 1; index < last; index++) {
    const distance = distanceToSegment(path[index], path[first], path[last])
    if (distance > farthest.distance) farthest = { index, distance }
  }
  return farthest
}

/**
 * Douglas-Peucker: drops the points that lie within `tolerance` degrees of the line between the
 * points kept on either side of them. The ends are always kept. Distances are measured in plain
 * degrees, which is precise enough to thin a line that is only drawn. A work list stands in for
 * recursion because a street path can run to 20,000 points.
 */
export const simplifyPath = (path: readonly Coordinates[], tolerance: number): Coordinates[] => {
  const isKept = new Array<boolean>(path.length).fill(false)
  isKept[0] = true
  isKept[path.length - 1] = true
  const pending: Span[] = [{ first: 0, last: path.length - 1 }]

  for (let span = pending.pop(); span; span = pending.pop()) {
    const farthest = findFarthestPoint(path, span)
    if (farthest.distance <= tolerance) continue
    isKept[farthest.index] = true
    pending.push({ first: span.first, last: farthest.index }, { first: farthest.index, last: span.last })
  }
  return path.filter((_, index) => isKept[index])
}
