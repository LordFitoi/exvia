import type { GeoJSONSource, Map as MapboxMap, Marker } from 'mapbox-gl'

import { toLngLat } from '@/services/baseMap'
import { flattenRoutePath } from '@/services/routePath'
import type { MapboxModule } from '@/services/baseMap'
import type { DraftPoint } from '@/types/route'

const ROUTE_SOURCE_ID = 'route-draft'
const CASING_LAYER_ID = 'route-draft-casing'
const LINE_LAYER_ID = 'route-draft-line'
// Same widths as the guide's .map-route-casing and .map-route strokes.
const CASING_WIDTH = 11
const LINE_WIDTH = 7
const START_MARKER_CLASS = 'marker marker-start'
const POINT_MARKER_CLASS = 'marker marker-primary'

// The GeoJSON shape Mapbox accepts; declared here because @types/geojson is not a direct dependency.
interface RouteLine {
  readonly type: 'Feature'
  readonly properties: Record<string, unknown>
  readonly geometry: {
    readonly type: 'LineString'
    readonly coordinates: [number, number][]
  }
}

// Mapbox paint values need a resolved color, while a token like --color-surface is a
// light-dark() pair; the computed `color` of a probe element is the resolved value.
const resolveTokenColor = (token: string): string => {
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}

const toRouteLine = (points: readonly DraftPoint[]): RouteLine => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: flattenRoutePath(points).map(toLngLat) },
})

/** Adds the route line; call it on every `style.load`, since a style swap drops custom layers. */
export const addRouteLine = (map: MapboxMap, points: readonly DraftPoint[]): void => {
  map.addSource(ROUTE_SOURCE_ID, { type: 'geojson', data: toRouteLine(points) })
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

export const updateRouteLine = (map: MapboxMap, points: readonly DraftPoint[]): void => {
  map.getSource<GeoJSONSource>(ROUTE_SOURCE_ID)?.setData(toRouteLine(points))
}

const createPointElement = (index: number, onRemove: () => void): HTMLButtonElement => {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = index === 0 ? START_MARKER_CLASS : POINT_MARKER_CLASS
  element.textContent = String(index + 1)
  element.ariaLabel = `Remove point ${index + 1}`
  element.addEventListener('click', (event) => {
    // The marker sits inside the map container, so the click would otherwise add a point too.
    event.stopPropagation()
    onRemove()
  })
  return element
}

/** One numbered marker per point; tapping a marker removes its point. */
export const addPointMarkers = (
  mapboxgl: MapboxModule,
  map: MapboxMap,
  points: readonly DraftPoint[],
  onRemove: (id: number) => void,
): Marker[] =>
  points.map(({ id, coordinates }, index) =>
    // Markers are centered by their own CSS (translate -50%), so anchor at the corner.
    new mapboxgl.Marker({ element: createPointElement(index, () => onRemove(id)), anchor: 'top-left' })
      .setLngLat(toLngLat(coordinates))
      .addTo(map),
  )
