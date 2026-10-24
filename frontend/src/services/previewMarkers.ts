import { describePlaceLocationCategory } from '@/services/placeLocationCategories'
import { getMarkerIconSrc } from '@/services/previewMarkerIcons'
import { projectToImage } from '@/services/staticMapView'
import type { MapSize, MapView } from '@/services/staticMapView'
import type { Coordinates } from '@/types/geolocation'
import type { Waypoint } from '@/types/route'

// The colours of the map markers in the dark theme (tokens.css), since the image has no CSS.
const START_COLOR = '#1c252e'
const FINISH_COLOR = '#00a76f'
const PLACE_COLOR = '#006c9c'
const NUMBER_COLOR = '#ffffff'
const NUMBER_TEXT_COLOR = '#1c252e'
const FIRST_CHECKPOINT_NUMBER = 2

/** One disc on the preview image: a glyph or a number on a colour, centered on a pixel. */
export interface PreviewMarker {
  readonly key: string
  readonly x: number
  readonly y: number
  readonly background: string
  /** The `src` of the glyph drawn in white; absent when the marker shows `label`. */
  readonly iconSrc?: string
  /** The number of a checkpoint, in the colour of its text. */
  readonly label?: { readonly text: string; readonly color: string }
}

interface PreviewMarkersOptions {
  readonly path: readonly Coordinates[]
  /** The points the rider chose; empty for a route saved before they were stored. */
  readonly waypoints: readonly Waypoint[]
  readonly view: MapView
  readonly size: MapSize
}

const toCheckpoint = ({ category }: Waypoint, number: number): Omit<PreviewMarker, 'x' | 'y'> => {
  const iconSrc = category ? getMarkerIconSrc(describePlaceLocationCategory(category).iconClass) : undefined
  const key = `checkpoint-${number}`
  if (iconSrc) return { key, background: PLACE_COLOR, iconSrc }
  return { key, background: NUMBER_COLOR, label: { text: String(number), color: NUMBER_TEXT_COLOR } }
}

/**
 * The markers of the route in travel order, as the map of the app draws them: a flag at the start,
 * every point chosen in between (numbered like the route creator does, or the icon of its saved place)
 * and a checkered flag at the finish.
 */
export const buildPreviewMarkers = ({ path, waypoints, view, size }: PreviewMarkersOptions): PreviewMarker[] => {
  const checkpoints = waypoints.slice(1, -1).map((waypoint, index) => ({
    ...toCheckpoint(waypoint, index + FIRST_CHECKPOINT_NUMBER),
    coordinates: waypoint.coordinates,
  }))
  const markers = [
    { key: 'start', background: START_COLOR, iconSrc: getMarkerIconSrc('icon-flag'), coordinates: path[0] },
    ...checkpoints,
    {
      key: 'finish',
      background: FINISH_COLOR,
      iconSrc: getMarkerIconSrc('icon-flag-checkered'),
      coordinates: path[path.length - 1],
    },
  ]
  return markers.map(({ coordinates, ...marker }) => ({ ...marker, ...projectToImage(coordinates, view, size) }))
}
