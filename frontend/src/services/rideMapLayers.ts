import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'

import { CASING_WIDTH, LINE_WIDTH, toRouteLine } from '@/services/routeMapLayers'
import { resolveTokenColor } from '@/services/tokenColor'
import type { RideLines } from '@/services/rideLines'

const PASSED_ID = 'ride-passed'
const REMAINING_ID = 'ride-remaining'
const APPROACH_ID = 'ride-approach'
const SOLID_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' } as const
// Same look as the guide's .map-route-walk: round dots, 4 px wide, a gap of about two widths.
const APPROACH_WIDTH = 4
const APPROACH_DASH = [0.1, 2.4]

interface LineSource {
  readonly line: keyof RideLines
  readonly id: string
}

const LINE_SOURCES: readonly LineSource[] = [
  { line: 'passed', id: PASSED_ID },
  { line: 'remaining', id: REMAINING_ID },
  { line: 'approach', id: APPROACH_ID },
]

const addSolidLine = (map: MapboxMap, id: string, colorToken: string): void => {
  map.addLayer({
    id: `${id}-casing`,
    type: 'line',
    source: id,
    layout: SOLID_LAYOUT,
    paint: { 'line-color': resolveTokenColor('--color-surface'), 'line-width': CASING_WIDTH },
  })
  map.addLayer({
    id,
    type: 'line',
    source: id,
    layout: SOLID_LAYOUT,
    paint: { 'line-color': resolveTokenColor(colorToken), 'line-width': LINE_WIDTH },
  })
}

/**
 * Adds the ride lines, bottom to top: the track ridden (gray), the track left (light green), and the
 * dotted way to the start. Call it on every `style.load`, since a style swap drops custom layers.
 */
export const addRideLines = (map: MapboxMap, lines: RideLines): void => {
  LINE_SOURCES.forEach(({ line, id }) => {
    map.addSource(id, { type: 'geojson', data: toRouteLine(lines[line]) })
  })
  addSolidLine(map, PASSED_ID, '--color-grey-500')
  addSolidLine(map, REMAINING_ID, '--color-primary-light')
  map.addLayer({
    id: APPROACH_ID,
    type: 'line',
    source: APPROACH_ID,
    layout: SOLID_LAYOUT,
    paint: {
      'line-color': resolveTokenColor('--color-ink'),
      'line-width': APPROACH_WIDTH,
      'line-dasharray': APPROACH_DASH,
    },
  })
}

export const updateRideLines = (map: MapboxMap, lines: RideLines): void => {
  LINE_SOURCES.forEach(({ line, id }) => {
    map.getSource<GeoJSONSource>(id)?.setData(toRouteLine(lines[line]))
  })
}
