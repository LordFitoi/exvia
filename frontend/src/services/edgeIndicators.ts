import type { Map as MapboxMap, MercatorCoordinate } from 'mapbox-gl'

import { toLngLat } from '@/services/baseMap'
import type { RiderMarkerData } from '@/services/riderMarkers'
import type { Coordinates } from '@/types/geolocation'

const DEGREES_IN_CIRCLE = 360
// How far from the map edge a bubble sits, in px: its radius plus a gap. The bottom leaves room for
// the center button.
const EDGE_INSET_PX = { top: 36, right: 36, bottom: 80, left: 36 }
const HALF_WORLD_DEGREES = 180

/** Someone out of view: a rider of the group, or the user (`rider` is null). */
export interface EdgeTarget {
  readonly key: string
  readonly rider: RiderMarkerData | null
  readonly position: Coordinates
}

/** An out-of-view target and where its bubble goes: the center in px from the map's corner, and the way it points. */
export interface EdgeIndicator extends EdgeTarget {
  readonly x: number
  readonly y: number
  /** Degrees clockwise from the top of the screen. */
  readonly angle: number
}

const USER_KEY = 'me'

export const buildEdgeTargets = (user: Coordinates | null, riders: readonly RiderMarkerData[]): EdgeTarget[] => {
  const others = riders.map((rider) => ({ key: `rider-${rider.id}`, rider, position: rider.position }))
  return user ? [{ key: USER_KEY, rider: null, position: user }, ...others] : others
}

/** Whether a position is inside the map, and the direction it lies in on the screen, seen from the center. */
interface ScreenSpot {
  readonly isInView: boolean
  /** Degrees clockwise from the top of the screen, 0 to 359. */
  readonly angle: number
}

/** Web mercator, with the world as a 1 by 1 square from its north-west corner: the camera's own units. */
const toMercator = ({ longitude, latitude }: Coordinates): { x: number; y: number } => {
  const latitudeRadians = (latitude * Math.PI) / HALF_WORLD_DEGREES
  const mercatorY = Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2))
  return {
    x: (longitude + HALF_WORLD_DEGREES) / DEGREES_IN_CIRCLE,
    y: (HALF_WORLD_DEGREES - (HALF_WORLD_DEGREES / Math.PI) * mercatorY) / DEGREES_IN_CIRCLE,
  }
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / HALF_WORLD_DEGREES

/**
 * Whether a ground position is behind the camera. The camera looks at the map's center, so a position is
 * in front when it is on the same side of the camera as that point, along the way the camera faces.
 */
const isBehindCamera = (map: MapboxMap, camera: MercatorCoordinate, position: Coordinates): boolean => {
  const { lng, lat } = map.getCenter()
  const center = toMercator({ longitude: lng, latitude: lat })
  const target = toMercator(position)
  const alongFacing =
    (target.x - camera.x) * (center.x - camera.x) +
    (target.y - camera.y) * (center.y - camera.y) +
    camera.z * camera.z
  return alongFacing <= 0
}

/**
 * The direction a ground position lies in on the screen, from the center: degrees clockwise from the top, 0
 * to 359. It is worked out from the camera's own axes rather than from `map.project`, which has no answer for
 * positions behind the camera: across the ground the screen's right is the position's offset to the right of
 * the camera, and its up is the offset ahead stretched by the pitch, less the camera's height.
 */
const findScreenAngle = (map: MapboxMap, camera: MercatorCoordinate, position: Coordinates): number => {
  const target = toMercator(position)
  const bearing = toRadians(map.getBearing())
  const pitch = toRadians(map.getPitch())
  const east = target.x - camera.x
  const north = camera.y - target.y
  const right = east * Math.cos(bearing) - north * Math.sin(bearing)
  const ahead = east * Math.sin(bearing) + north * Math.cos(bearing)
  const up = ahead * Math.cos(pitch) - camera.z * Math.sin(pitch)
  const degrees = (Math.atan2(right, up) * HALF_WORLD_DEGREES) / Math.PI
  return Math.round(degrees + DEGREES_IN_CIRCLE) % DEGREES_IN_CIRCLE
}

const locateOnScreen = (map: MapboxMap, position: Coordinates): ScreenSpot => {
  const camera = map.getFreeCameraOptions().position
  if (!camera) return { isInView: true, angle: 0 }
  const { clientWidth: width, clientHeight: height } = map.getContainer()
  const point = map.project(toLngLat(position))
  const isInsideMap = point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height
  const isInView = isInsideMap && !isBehindCamera(map, camera, position)
  return { isInView, angle: findScreenAngle(map, camera, position) }
}

/** Where the line from the map's center along `angle` leaves the area inside the insets. */
const findEdgePoint = (width: number, height: number, angle: number): { x: number; y: number } => {
  const radians = (angle * Math.PI) / 180
  const dx = Math.sin(radians)
  const dy = -Math.cos(radians)
  const reachX = width / 2 - (dx > 0 ? EDGE_INSET_PX.right : EDGE_INSET_PX.left)
  const reachY = height / 2 - (dy > 0 ? EDGE_INSET_PX.bottom : EDGE_INSET_PX.top)
  const distance = Math.min(reachX / Math.abs(dx), reachY / Math.abs(dy))
  return { x: Math.round(width / 2 + dx * distance), y: Math.round(height / 2 + dy * distance) }
}

/** The bubbles to draw: one for each target that is out of the map's view, on the edge facing it. */
export const placeEdgeIndicators = (map: MapboxMap, targets: readonly EdgeTarget[]): EdgeIndicator[] => {
  const { clientWidth, clientHeight } = map.getContainer()
  return targets.flatMap((target) => {
    const { isInView, angle } = locateOnScreen(map, target.position)
    if (isInView) return []
    return [{ ...target, ...findEdgePoint(clientWidth, clientHeight, angle), angle }]
  })
}

export const isSameIndicators = (a: readonly EdgeIndicator[], b: readonly EdgeIndicator[]): boolean =>
  a.length === b.length &&
  a.every(
    (indicator, index) =>
      indicator.key === b[index].key &&
      indicator.position === b[index].position &&
      indicator.x === b[index].x &&
      indicator.y === b[index].y &&
      indicator.angle === b[index].angle,
  )
