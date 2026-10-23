import type { LngLatBounds } from 'mapbox-gl'

import type { Viewport } from '@/types/viewport'

const HALF_TURN = 180
const FULL_TURN = 360
const MAX_LATITUDE = 90
const BBOX_DECIMALS = 6

const wrapLongitude = (longitude: number): number =>
  ((((longitude + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN) - HALF_TURN

const clampLatitude = (latitude: number): number => Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude))

/**
 * The bounds the camera shows, as the API takes them: Mapbox keeps counting longitudes past ±180 when
 * the map is panned over the antimeridian or zoomed out to several worlds, so they are wrapped back.
 */
export const readViewport = (bounds: LngLatBounds): Viewport => {
  const isWholeWorld = bounds.getEast() - bounds.getWest() >= FULL_TURN
  return {
    west: isWholeWorld ? -HALF_TURN : wrapLongitude(bounds.getWest()),
    south: clampLatitude(bounds.getSouth()),
    east: isWholeWorld ? HALF_TURN : wrapLongitude(bounds.getEast()),
    north: clampLatitude(bounds.getNorth()),
  }
}

/** Whether everything in `inner` is also in `outer`; a viewport over the antimeridian is never taken as contained. */
export const containsViewport = (outer: Viewport, inner: Viewport): boolean =>
  outer.west <= outer.east &&
  inner.west <= inner.east &&
  outer.west <= inner.west &&
  outer.east >= inner.east &&
  outer.south <= inner.south &&
  outer.north >= inner.north

/** `viewport` grown by `ratio` of its size on every side, so a camera that keeps moving stays inside it for a while. Left as is over the antimeridian. */
export const expandViewport = (viewport: Viewport, ratio: number): Viewport => {
  if (viewport.west > viewport.east) return viewport
  const width = (viewport.east - viewport.west) * ratio
  const height = (viewport.north - viewport.south) * ratio
  return {
    west: Math.max(-HALF_TURN, viewport.west - width),
    south: clampLatitude(viewport.south - height),
    east: Math.min(HALF_TURN, viewport.east + width),
    north: clampLatitude(viewport.north + height),
  }
}

/** `west,south,east,north`, the `bbox` query parameter of the places API. */
export const toBboxParam = ({ west, south, east, north }: Viewport): string =>
  [west, south, east, north].map((value) => value.toFixed(BBOX_DECIMALS)).join(',')
