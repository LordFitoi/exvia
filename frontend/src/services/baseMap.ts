import type mapboxgl from 'mapbox-gl'
import type { Map as MapboxMap } from 'mapbox-gl'

import { applyMapTheme } from '@/services/mapTheme'
import type { Coordinates } from '@/types/geolocation'

const LIGHT_MAP_STYLE = 'mapbox://styles/mapbox/light-v11'
const DARK_MAP_STYLE = 'mapbox://styles/mapbox/dark-v11'
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'
const HTTP_UNAUTHORIZED = 401
const USER_MARKER_LABEL = 'You'

export type MapboxModule = typeof mapboxgl

export interface BaseMapOptions {
  readonly container: HTMLDivElement
  readonly accessToken: string
  readonly center: Coordinates
  readonly zoom: number
  readonly pitch?: number
  readonly bearing?: number
  readonly signal: AbortSignal
  readonly onUnauthorized: () => void
}

export interface BaseMap {
  readonly mapboxgl: MapboxModule
  readonly map: MapboxMap
}

export const toLngLat = ({ longitude, latitude }: Coordinates): [number, number] => [
  longitude,
  latitude,
]

const getMapStyle = (isDark: boolean): string => (isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE)

const isUnauthorizedMapError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error && error.status === HTTP_UNAUTHORIZED

export const createUserMarkerElement = (): HTMLDivElement => {
  const dot = document.createElement('div')
  dot.className = 'marker-me'
  const label = document.createElement('span')
  label.className = 'marker-label'
  label.textContent = USER_MARKER_LABEL
  dot.append(label)
  return dot
}

// mapbox-gl touches `window` on import, so it is loaded only in the browser, after mount. The
// style follows the color scheme live and is always repainted with the style guide's map colors.
// Resolves to null when `signal` aborts during the import.
export const createBaseMap = async ({
  container,
  accessToken,
  center,
  zoom,
  pitch = 0,
  bearing = 0,
  signal,
  onUnauthorized,
}: BaseMapOptions): Promise<BaseMap | null> => {
  const { default: mapboxModule } = await import('mapbox-gl')
  if (signal.aborted) return null

  const darkScheme = window.matchMedia(DARK_SCHEME_QUERY)
  const map = new mapboxModule.Map({
    container,
    accessToken,
    style: getMapStyle(darkScheme.matches),
    center: toLngLat(center),
    zoom,
    pitch,
    bearing,
  })
  map.on('style.load', () => applyMapTheme(map))
  map.on('error', ({ error }) => {
    if (isUnauthorizedMapError(error)) onUnauthorized()
  })
  darkScheme.addEventListener('change', (event) => map.setStyle(getMapStyle(event.matches)), {
    signal,
  })
  return { mapboxgl: mapboxModule, map }
}
