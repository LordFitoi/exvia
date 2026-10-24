import type { Coordinates } from '@/types/geolocation'

/** Mapbox draws the world on a square of this many pixels at zoom 0 and doubles it at every zoom. */
const WORLD_SIZE_AT_ZOOM_ZERO = 512
const MAX_ZOOM = 16
const MIN_ZOOM = 0
const DEGREES_PER_HALF_TURN = 180
const FULL_TURN_DEGREES = 360

export interface MapSize {
  readonly width: number
  readonly height: number
}

/** Where a still map looks: the point at its middle and how close. */
export interface MapView {
  readonly center: Coordinates
  readonly zoom: number
}

interface Pixel {
  readonly x: number
  readonly y: number
}

/** The point on the unit square of the world: x grows east, y grows south, as in Web Mercator. */
const toWorld = ({ longitude, latitude }: Coordinates): Pixel => {
  const sine = Math.sin((latitude * Math.PI) / DEGREES_PER_HALF_TURN)
  return {
    x: longitude / FULL_TURN_DEGREES + 0.5,
    y: 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI),
  }
}

const fromWorld = ({ x, y }: Pixel): Coordinates => ({
  longitude: (x - 0.5) * FULL_TURN_DEGREES,
  latitude: (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * DEGREES_PER_HALF_TURN) / Math.PI,
})

/** The zoom at which `span` (a share of the world) takes `pixels`. */
const zoomToFit = (span: number, pixels: number): number =>
  span === 0 ? MAX_ZOOM : Math.log2(pixels / (span * WORLD_SIZE_AT_ZOOM_ZERO))

/** The closest view of `size` that shows every point with `padding` pixels to spare on each side. */
export const fitMapView = (points: readonly Coordinates[], size: MapSize, padding: number): MapView => {
  const corners = points.map(toWorld)
  const xs = corners.map(({ x }) => x)
  const ys = corners.map(({ y }) => y)
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)]
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]
  const zoom = Math.min(
    zoomToFit(maxX - minX, size.width - 2 * padding),
    zoomToFit(maxY - minY, size.height - 2 * padding),
    MAX_ZOOM,
  )
  return { center: fromWorld({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }), zoom: Math.max(zoom, MIN_ZOOM) }
}

/** Where `point` lands on an image of `size` that shows `view`, in pixels from its top-left corner. */
export const projectToImage = (point: Coordinates, view: MapView, size: MapSize): Pixel => {
  const worldPixels = WORLD_SIZE_AT_ZOOM_ZERO * 2 ** view.zoom
  const target = toWorld(point)
  const middle = toWorld(view.center)
  return {
    x: size.width / 2 + (target.x - middle.x) * worldPixels,
    y: size.height / 2 + (target.y - middle.y) * worldPixels,
  }
}
