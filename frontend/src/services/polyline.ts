import type { Coordinates } from '@/types/geolocation'

const POLYLINE_PRECISION = 1e5
const CHUNK_BITS = 5
const CHUNK_MASK = 0x1f
const CONTINUATION_FLAG = 0x20
const CHAR_CODE_OFFSET = 63

const encodeSignedInteger = (value: number): string => {
  const scaled = Math.round(value * POLYLINE_PRECISION)
  let remaining = scaled < 0 ? ~(scaled << 1) : scaled << 1
  let encoded = ''
  while (remaining >= CONTINUATION_FLAG) {
    encoded += String.fromCharCode((CONTINUATION_FLAG | (remaining & CHUNK_MASK)) + CHAR_CODE_OFFSET)
    remaining >>= CHUNK_BITS
  }
  return encoded + String.fromCharCode(remaining + CHAR_CODE_OFFSET)
}

/**
 * Google's encoded polyline format at 5 decimals, which Mapbox reads in its static image paths.
 * Each point is stored as the step from the one before, latitude first.
 */
export const encodePolyline = (path: readonly Coordinates[]): string => {
  let previous: Coordinates = { longitude: 0, latitude: 0 }
  let encoded = ''
  for (const point of path) {
    encoded += encodeSignedInteger(point.latitude - previous.latitude)
    encoded += encodeSignedInteger(point.longitude - previous.longitude)
    previous = point
  }
  return encoded
}
