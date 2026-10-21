import type { Map as MapboxMap } from 'mapbox-gl'

import { calculateBearing } from '@/services/bearing'
import { toLngLat } from '@/services/baseMap'
import { parseLngLat } from '@/services/coordinates'
import { getPathLength, locateOnPath, measureDistance, measurePath } from '@/services/routeProgress'
import type { MeasuredPath, PathLocation } from '@/services/routeProgress'
import { getTurnAngle, isHeadingForward, walkPath } from '@/services/pathWalk'
import { isRecord } from '@/services/typeGuards'
import type { Coordinates } from '@/types/geolocation'

const ROAD_SOURCE_LAYER = 'road'
const RAIL_LAYER_MARK = 'rail'
// Meters on the ground that one pixel of a Mapbox map covers at the equator at zoom 0 (512 px tiles).
const EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0 = 78_271.517
// Extra meters around the stretch ahead that are searched for streets.
const SEARCH_MARGIN_METERS = 40
// A pitched map shows far more ground per pixel at its top, so the box is kept to a bounded size.
const MAX_SEARCH_PIXELS = 400
// A reported position is on the street (it is snapped to one); this far from a street's line is not it.
const ON_STREET_METERS = 25
// Streets whose ends are this close meet at a junction.
const JOIN_METERS = 3
// A street that turns more than this from the way the rider goes is not the way on (no U-turns).
const MAX_TURN_DEGREES = 110
// How many streets one forecast follows, which also stops it from going round a block forever.
const MAX_STREET_HOPS = 12

const getRoadLayerIds = (map: MapboxMap): string[] =>
  (map.getStyle()?.layers ?? []).flatMap((layer) =>
    layer.type === 'line' && layer['source-layer'] === ROAD_SOURCE_LAYER && !layer.id.includes(RAIL_LAYER_MARK)
      ? [layer.id]
      : [],
  )

const getSearchRadiusPixels = (map: MapboxMap, { latitude }: Coordinates, reach: number): number => {
  const metersPerPixel =
    (EQUATOR_METERS_PER_PIXEL_AT_ZOOM_0 * Math.cos((latitude * Math.PI) / 180)) / 2 ** map.getZoom()
  return Math.min(MAX_SEARCH_PIXELS, (reach + SEARCH_MARGIN_METERS) / metersPerPixel)
}

const readLine = (positions: unknown[]): Coordinates[] =>
  positions.flatMap((position) => parseLngLat(position) ?? [])

/** The lines of a GeoJSON LineString or MultiLineString geometry; nothing for any other. */
const readLines = (geometry: unknown): Coordinates[][] => {
  if (!isRecord(geometry) || !Array.isArray(geometry.coordinates)) return []
  if (geometry.type === 'LineString') return [readLine(geometry.coordinates)]
  if (geometry.type === 'MultiLineString') return geometry.coordinates.map(readLine)
  return []
}

/**
 * The street lines that are drawn on the map around a position, as the map has them in its tiles: no request
 * is made. A street drawn several times (casing, fill, bridge) is one. Empty when the position is off screen,
 * where the map has nothing loaded.
 */
export const readStreetLines = (map: MapboxMap, position: Coordinates, reach: number): MeasuredPath[] => {
  const layers = getRoadLayerIds(map)
  if (layers.length === 0) return []
  const center = map.project(toLngLat(position))
  const radius = getSearchRadiusPixels(map, position, reach)
  const features = map.queryRenderedFeatures(
    [
      [center.x - radius, center.y - radius],
      [center.x + radius, center.y + radius],
    ],
    { layers },
  )
  const lines = features
    .flatMap((feature) => ('geometry' in feature ? readLines(feature.geometry) : []))
    .filter((line) => line.length >= 2)
  const unique = new Map(lines.map((line) => [JSON.stringify([line[0], line[line.length - 1], line.length]), line]))
  return Array.from(unique.values(), measurePath)
}

interface StreetSpot {
  readonly street: MeasuredPath
  readonly location: PathLocation
}

const findStreetAt = (streets: readonly MeasuredPath[], position: Coordinates): StreetSpot | null => {
  const spots = streets.flatMap((street) => {
    const location = locateOnPath(street, position, { from: 0, to: getPathLength(street) })
    return location && location.offset <= ON_STREET_METERS ? [{ street, location }] : []
  })
  return spots.reduce<StreetSpot | null>((best, spot) => (!best || spot.location.offset < best.location.offset ? spot : best), null)
}

interface Continuation {
  readonly street: MeasuredPath
  readonly isForward: boolean
  readonly turn: number
}

/** The unused street that starts where `exit` is and bends least from the way `travel` goes, if any bends little enough. */
const findContinuation = (
  streets: readonly MeasuredPath[],
  used: ReadonlySet<MeasuredPath>,
  { exit, travel }: { exit: Coordinates; travel: number },
): Continuation | null => {
  const options = streets
    .filter((street) => !used.has(street))
    .flatMap((street) => {
      const { points } = street
      const last = points.length - 1
      const forward = { street, isForward: true, turn: getTurnAngle(travel, calculateBearing(points[0], points[1])) }
      const backward = { street, isForward: false, turn: getTurnAngle(travel, calculateBearing(points[last], points[last - 1])) }
      return [
        ...(measureDistance(points[0], exit) <= JOIN_METERS ? [forward] : []),
        ...(measureDistance(points[last], exit) <= JOIN_METERS ? [backward] : []),
      ]
    })
  const straightest = options.reduce<Continuation | null>((best, option) => (!best || option.turn < best.turn ? option : best), null)
  return straightest && straightest.turn <= MAX_TURN_DEGREES ? straightest : null
}

const getLength = (points: readonly Coordinates[]): number => getPathLength(measurePath(points))

/**
 * The path a rider heading `heading` takes from `position` along the streets of `streets`, `reach` meters
 * long: along the street they are on, then on through each junction by the street that bends least. Null when
 * the position is not on any of them.
 */
export const followStreets = (
  streets: readonly MeasuredPath[],
  position: Coordinates,
  { heading, reach }: { heading: number; reach: number },
): Coordinates[] | null => {
  const start = findStreetAt(streets, position)
  if (!start) return null
  const { street, location } = start
  const isForward = isHeadingForward(street, location.distance, heading)
  let points = [position, location.point, ...walkPath(street, location.distance, isForward, reach)]
  const used = new Set([street])
  for (let hop = 0; hop < MAX_STREET_HOPS && getLength(points) < reach; hop += 1) {
    const exit = points[points.length - 1]
    const next = findContinuation(streets, used, { exit, travel: calculateBearing(points[points.length - 2], exit) })
    if (!next) break
    used.add(next.street)
    const from = next.isForward ? 0 : getPathLength(next.street)
    points = [...points, ...walkPath(next.street, from, next.isForward, reach - getLength(points))]
  }
  return points
}
