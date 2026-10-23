import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl'

import { toLngLat } from '@/services/baseMap'
import { createGasStationImage, GAS_STATION_PIXEL_RATIO } from '@/services/gasStationIcon'
import { fetchGasStations } from '@/services/gasStationsApi'
import type { GasStation, MapBounds } from '@/services/gasStationsApi'

const SOURCE_ID = 'gas-stations'
const LAYER_ID = 'gas-stations'
const IMAGE_ID = 'gas-station'
// Below this zoom the view is too wide to ask for every station in it, and the icons would pile up.
const MIN_ZOOM = 12
// The view is asked as a whole number of cells, so panning inside them asks for nothing again.
const CELLS_PER_DEGREE = 10
// A failed area is asked again after this, so a busy service is not asked at every pan.
const RETRY_AFTER_MS = 60_000

// The GeoJSON shape Mapbox accepts; declared here because @types/geojson is not a direct dependency.
interface StationCollection {
  readonly type: 'FeatureCollection'
  readonly features: readonly {
    readonly type: 'Feature'
    readonly properties: Record<string, never>
    readonly geometry: { readonly type: 'Point'; readonly coordinates: [number, number] }
  }[]
}

const toStationCollection = (stations: Iterable<GasStation>): StationCollection => ({
  type: 'FeatureCollection',
  features: [...stations].map(({ coordinates }) => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: toLngLat(coordinates) },
  })),
})

const readCellBounds = (map: MapboxMap): MapBounds => {
  const view = map.getBounds()
  if (!view) throw new Error('The map has no bounds yet')
  return {
    west: Math.floor(view.getWest() * CELLS_PER_DEGREE) / CELLS_PER_DEGREE,
    south: Math.floor(view.getSouth() * CELLS_PER_DEGREE) / CELLS_PER_DEGREE,
    east: Math.ceil(view.getEast() * CELLS_PER_DEGREE) / CELLS_PER_DEGREE,
    north: Math.ceil(view.getNorth() * CELLS_PER_DEGREE) / CELLS_PER_DEGREE,
  }
}

/** Adds the stations as map icons; call it on every `style.load`, since a style swap drops custom layers and images. */
const addStationLayer = async (map: MapboxMap, stations: Iterable<GasStation>): Promise<void> => {
  const image = await createGasStationImage()
  if (!map.hasImage(IMAGE_ID)) map.addImage(IMAGE_ID, image, { pixelRatio: GAS_STATION_PIXEL_RATIO })
  if (map.getSource(SOURCE_ID)) return
  map.addSource(SOURCE_ID, { type: 'geojson', data: toStationCollection(stations) })
  map.addLayer({
    id: LAYER_ID,
    type: 'symbol',
    source: SOURCE_ID,
    minzoom: MIN_ZOOM,
    layout: { 'icon-image': IMAGE_ID },
  })
}

/**
 * Shows every gas station in view on `map`, as the guide's gas marker. The stations are asked of
 * OpenStreetMap (Overpass) for the cells the view covers whenever the map stops moving, and kept
 * while the map lives. Without an answer there are simply no icons.
 */
export const showGasStations = (map: MapboxMap, signal: AbortSignal): void => {
  const stations = new Map<string, GasStation>()
  // When each area may be asked again: never after an answer, or while one is on its way.
  const askableAt = new Map<string, number>()

  // The service is often down, and a rider who stays put never pans: the view is asked again by itself.
  const retryLater = () => {
    const timer = setTimeout(loadView, RETRY_AFTER_MS)
    signal.addEventListener('abort', () => clearTimeout(timer), { once: true })
  }

  const loadView = async () => {
    if (map.getZoom() < MIN_ZOOM) return
    const bounds = readCellBounds(map)
    const area = JSON.stringify(bounds)
    if ((askableAt.get(area) ?? 0) > Date.now()) return
    askableAt.set(area, Infinity)
    try {
      for (const station of await fetchGasStations(bounds, signal)) stations.set(station.id, station)
      map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(toStationCollection(stations.values()))
    } catch (error) {
      if (signal.aborted) return
      askableAt.set(area, Date.now() + RETRY_AFTER_MS)
      console.error('Could not load the gas stations', error)
      retryLater()
    }
  }

  map.on('style.load', () => {
    addStationLayer(map, stations.values()).catch((error: unknown) => {
      if (!signal.aborted) console.error('Could not draw the gas stations', error)
    })
  })
  map.on('load', loadView)
  map.on('moveend', loadView)
}
