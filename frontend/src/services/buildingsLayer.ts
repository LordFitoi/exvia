import type { Map as MapboxMap } from 'mapbox-gl'

import { resolveTokenColor } from '@/services/tokenColor'

const BUILDINGS_LAYER_ID = 'ride-3d-buildings'
const BUILDINGS_MIN_ZOOM = 15
const BUILDINGS_OPACITY = 0.7
const BUILDINGS_COLOR_TOKEN = '--color-text-faint'

/**
 * Extrudes the buildings of the Mapbox streets data, which the light and dark styles include,
 * so a pitched map has a skyline. Call it on every `style.load`, since a style swap drops it.
 */
export const addBuildingsLayer = (map: MapboxMap): void => {
  map.addLayer({
    id: BUILDINGS_LAYER_ID,
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: BUILDINGS_MIN_ZOOM,
    paint: {
      'fill-extrusion-color': resolveTokenColor(BUILDINGS_COLOR_TOKEN),
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': BUILDINGS_OPACITY,
    },
  })
}
