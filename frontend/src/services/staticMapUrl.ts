import { encodePolyline } from '@/services/polyline'
import { simplifyPath } from '@/services/simplifyPath'
import type { MapSize, MapView } from '@/services/staticMapView'
import type { Coordinates } from '@/types/geolocation'

const STATIC_IMAGES_URL = 'https://api.mapbox.com/styles/v1/mapbox'
const STATIC_MAP_STYLE = 'dark-v11'
const ROUTE_STROKE_WIDTH = 6
const ROUTE_COLOR = '00a76f'
// Mapbox refuses URLs over 8,192 characters; this leaves room for the rest of the URL.
const MAX_ENCODED_PATH_LENGTH = 6000
const FIRST_TOLERANCE_DEGREES = 0.00001
const TOLERANCE_GROWTH = 1.6

export interface StaticMapOptions {
  readonly path: readonly Coordinates[]
  readonly view: MapView
  readonly size: MapSize
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

/**
 * A Mapbox Static Images URL of the route drawn on the map at `view`, with no pins: the preview image
 * lays its own markers over it, so it needs to know where the map looks.
 */
export const buildStaticMapUrl = ({ path, view, size, accessToken }: StaticMapOptions): string => {
  const line = `path-${ROUTE_STROKE_WIDTH}+${ROUTE_COLOR}(${encodePathToFit(path)})`
  const { longitude, latitude } = view.center
  const camera = `${longitude},${latitude},${view.zoom}`
  return `${STATIC_IMAGES_URL}/${STATIC_MAP_STYLE}/static/${line}/${camera}/${size.width}x${size.height}?access_token=${accessToken}`
}
