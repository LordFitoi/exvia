import type { GeoJSONSource, Map as MapboxMap, Marker, PaddingOptions } from 'mapbox-gl'

import { toLngLat } from '@/services/baseMap'
import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import { resolveTokenColor } from '@/services/tokenColor'
import type { MapboxModule } from '@/services/baseMap'
import type { PlaceLocationCategory } from '@/services/placeLocationCategories'
import type { Coordinates } from '@/types/geolocation'
import type { DraftPoint, Waypoint } from '@/types/route'

const ROUTE_SOURCE_ID = 'route-draft'
const CASING_LAYER_ID = 'route-draft-casing'
const LINE_LAYER_ID = 'route-draft-line'
// Same widths as the guide's .map-route-casing and .map-route strokes.
export const CASING_WIDTH = 11
export const LINE_WIDTH = 7
const FIT_MAX_ZOOM = 17
const START_MARKER_CLASS = 'marker marker-start'
const POINT_MARKER_CLASS = 'marker marker-primary'
const PLACE_MARKER_CLASS = 'marker marker-place'
const PASSIVE_PLACE_MARKER_CLASS = `${PLACE_MARKER_CLASS} marker-passive`

// The GeoJSON shape Mapbox accepts; declared here because @types/geojson is not a direct dependency.
export interface RouteLine {
  readonly type: 'Feature'
  readonly properties: Record<string, unknown>
  readonly geometry: {
    readonly type: 'LineString'
    readonly coordinates: [number, number][]
  }
}

export const toRouteLine = (path: readonly Coordinates[]): RouteLine => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: path.map(toLngLat) },
})

/** Adds the route line; call it on every `style.load`, since a style swap drops custom layers. */
export const addRouteLine = (map: MapboxMap, path: readonly Coordinates[]): void => {
  map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: toRouteLine(path) })
  const layout = { 'line-cap': 'round', 'line-join': 'round' } as const
  map.addLayer({
    id: CASING_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout,
    paint: { 'line-color': resolveTokenColor('--color-surface'), 'line-width': CASING_WIDTH },
  })
  map.addLayer({
    id: LINE_LAYER_ID,
    type: 'line',
    source: ROUTE_SOURCE_ID,
    layout,
    paint: { 'line-color': resolveTokenColor('--color-primary'), 'line-width': LINE_WIDTH },
  })
}

export const updateRouteLine = (map: MapboxMap, path: readonly Coordinates[]): void => {
  map.getSource<GeoJSONSource>(ROUTE_SOURCE_ID)?.setData(toRouteLine(path))
}

const createIconElement = (iconClass: string): HTMLSpanElement => {
  const icon = document.createElement('span')
  icon.className = `icon icon-sm ${iconClass}`
  icon.ariaHidden = 'true'
  return icon
}

const createPointElement = (point: DraftPoint, index: number, onRemove: () => void): HTMLButtonElement => {
  const element = document.createElement('button')
  element.type = 'button'
  element.ariaLabel = `Remove point ${index + 1}`
  if (index > 0 && point.category) {
    element.className = PLACE_MARKER_CLASS
    element.append(createIconElement(describePlaceLocationCategory(point.category).iconClass))
  } else {
    element.className = index === 0 ? START_MARKER_CLASS : POINT_MARKER_CLASS
    element.textContent = String(index + 1)
  }
  element.addEventListener('click', (event) => {
    // The marker sits inside the map container, so the click would otherwise add a point too.
    event.stopPropagation()
    onRemove()
  })
  return element
}

/** One marker per point, numbered or, for a saved place, with its kind's icon; tapping a marker removes its point. */
export const addPointMarkers = (
  mapboxgl: MapboxModule,
  map: MapboxMap,
  points: readonly DraftPoint[],
  onRemove: (id: number) => void,
): Marker[] =>
  points.map((point, index) =>
    // Markers are centered by their own CSS (translate -50%), so anchor at the corner.
    new mapboxgl.Marker({ element: createPointElement(point, index, () => onRemove(point.id)), anchor: 'top-left' })
      .setLngLat(toLngLat(point.coordinates))
      .addTo(map),
  )

const createEndpointElement = (className: string, iconClass: string, label: string): HTMLSpanElement => {
  const element = document.createElement('span')
  element.className = className
  element.role = 'img'
  element.ariaLabel = label
  element.append(createIconElement(iconClass))
  return element
}

const createFinishElement = (): HTMLSpanElement =>
  createEndpointElement('marker marker-primary', 'icon-flag-checkered', 'Finish')

/** The checkered-flag marker alone, for a destination that has no start or checkpoints. */
export const addFinishMarker = (mapboxgl: MapboxModule, map: MapboxMap, coordinates: Coordinates): Marker =>
  new mapboxgl.Marker({ element: createFinishElement(), anchor: 'top-left' })
    .setLngLat(toLngLat(coordinates))
    .addTo(map)

const createCheckpointElement = (number: number, placeCategory: PlaceLocationCategory | null): HTMLSpanElement => {
  if (placeCategory) {
    const { label, iconClass } = describePlaceLocationCategory(placeCategory)
    return createEndpointElement(PASSIVE_PLACE_MARKER_CLASS, iconClass, `Checkpoint ${number}, ${label.toLowerCase()}`)
  }
  const element = document.createElement('span')
  element.className = POINT_MARKER_CLASS
  element.role = 'img'
  element.ariaLabel = `Checkpoint ${number}`
  element.textContent = String(number)
  return element
}

interface RouteMarkersOptions {
  readonly path: readonly Coordinates[]
  /** The points the rider chose; empty for a route saved before they were stored. */
  readonly waypoints: readonly Waypoint[]
}

/**
 * Start and finish markers, and a marker for every point chosen in between: numbered like the route
 * creator does (the start is 1), or the kind's icon when the point is a saved place.
 * A route without waypoints shows only the start and the finish.
 */
export const addRouteMarkers = (
  mapboxgl: MapboxModule,
  map: MapboxMap,
  { path, waypoints }: RouteMarkersOptions,
): Marker[] => {
  const checkpoints = waypoints.slice(1, -1).map(({ coordinates, category }, index) => ({
    element: createCheckpointElement(index + 2, category),
    coordinates,
  }))
  const places = [
    { element: createEndpointElement('marker marker-start', 'icon-flag', 'Start'), coordinates: path[0] },
    ...checkpoints,
    { element: createFinishElement(), coordinates: path[path.length - 1] },
  ]
  return places.map(({ element, coordinates }) =>
    new mapboxgl.Marker({ element, anchor: 'top-left' }).setLngLat(toLngLat(coordinates)).addTo(map),
  )
}

interface FitOptions {
  readonly padding: number | PaddingOptions
  readonly isAnimated: boolean
}

/** Moves the camera so the whole path is in view. */
export const fitPathBounds = (
  mapboxgl: MapboxModule,
  map: MapboxMap,
  path: readonly Coordinates[],
  { padding, isAnimated }: FitOptions,
): void => {
  const first = toLngLat(path[0])
  const bounds = path.reduce(
    (box, coordinates) => box.extend(toLngLat(coordinates)),
    new mapboxgl.LngLatBounds(first, first),
  )
  map.fitBounds(bounds, { padding, maxZoom: FIT_MAX_ZOOM, animate: isAnimated })
}
