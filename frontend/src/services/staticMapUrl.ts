import { encodePolyline } from '@/services/polyline'
import { simplifyPath } from '@/services/simplifyPath'
import type { Coordinates } from '@/types/geolocation'

const STATIC_IMAGES_URL = 'https://api.mapbox.com/styles/v1/mapbox'
const STATIC_MAP_STYLE = 'dark-v11'
const ROUTE_STROKE_WIDTH = 6
const ROUTE_COLOR = '00a76f'
const MARKER_COLOR = '5be49b'
const IMAGE_PADDING_PX = 80
// Mapbox refuses URLs over 8,192 characters; this leaves room for the rest of the URL.
const MAX_ENCODED_PATH_LENGTH = 6000
const FIRST_TOLERANCE_DEGREES = 0.00001
const TOLERANCE_GROWTH = 1.6

export interface StaticMapOptions {
  readonly path: readonly Coordinates[]
  readonly size: { readonly width: number; readonly height: number }
  readonly accessToken: string
}

/** The path as it goes into the URL, thinned until it fits: a street path has far too many points. */
const encodePathToFit = (path: readonly Coordinates[]): string => {
  let tolerance = FIRST_TOLERANCE_DEGREES
  let encoded = encodeURIComponent(encodePolyline(path))
  for (let thinned = path; encoded.length > MAX_ENCODED_PATH_LENGTH; tolerance *= TOLERANCE_GROWTH) {
    thinned = simplifyPath(thinned, tolerance)
    encoded = encodeURIComponent(encodePolyline(thinned))
  }
  return encoded
}

const toMarker = (label: string, { longitude, latitude }: Coordinates): string =>
  `pin-s-${label}+${MARKER_COLOR}(${longitude},${latitude})`

/**
 * A Mapbox Static Images URL of the route, framed to fit with its start (a) and finish (b) pins.
 * The image is the one a link preview shows.
 */
export const buildStaticMapUrl = ({ path, size, accessToken }: StaticMapOptions): string => {
  const line = `path-${ROUTE_STROKE_WIDTH}+${ROUTE_COLOR}(${encodePathToFit(path)})`
  const markers = [toMarker('a', path[0]), toMarker('b', path[path.length - 1])]
  const overlays = [line, ...markers].join(',')
  const query = `padding=${IMAGE_PADDING_PX}&access_token=${accessToken}`
  return `${STATIC_IMAGES_URL}/${STATIC_MAP_STYLE}/static/${overlays}/auto/${size.width}x${size.height}?${query}`
}
