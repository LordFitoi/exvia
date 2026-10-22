import type { Map as MapboxMap } from 'mapbox-gl'

type StyleLayer = ReturnType<MapboxMap['getStyle']>['layers'][number]
type PaintProperty = Parameters<MapboxMap['setPaintProperty']>[1]
type PaintValue = Parameters<MapboxMap['setPaintProperty']>[2]

// The style guide's map tokens (tokens.css), by the role a layer plays on the map.
const TOKENS = {
  land: '--map-land',
  building: '--map-building',
  park: '--map-park',
  water: '--map-water',
  road: '--map-road',
  casing: '--map-road-casing',
  majorRoad: '--map-road-major',
  label: '--map-label',
} as const

type Role = keyof typeof TOKENS
type Colors = Readonly<Record<Role, string>>

const SWATCH_SIZE = 1
const CHANNEL_COUNT = 3
const ROAD_LAYER_PATTERN = /^(road|bridge|tunnel)-/
const MAJOR_ROAD_PATTERN = /motorway|trunk|primary/
const PARK_LAYER_PATTERN = /park|landuse|landcover|pitch/
const WATER_LAYER_PATTERN = /water/
const PAINTED_PROPERTIES = new Set([
  'background-color',
  'fill-color',
  'fill-outline-color',
  'fill-extrusion-color',
  'line-color',
  'text-color',
  'text-halo-color',
  'icon-color',
  'icon-halo-color',
])

// The browser resolves a token (light-dark, color-mix) once it is painted on a probe element, but
// may report it as `color(srgb ...)`, which Mapbox cannot read. A one pixel canvas turns any CSS
// color into plain channels.
const createColorReader = (probe: HTMLElement) => {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  return (token: string): string => {
    probe.style.backgroundColor = `var(${token})`
    if (context === null) return getComputedStyle(probe).backgroundColor
    context.clearRect(0, 0, SWATCH_SIZE, SWATCH_SIZE)
    context.fillStyle = getComputedStyle(probe).backgroundColor
    context.fillRect(0, 0, SWATCH_SIZE, SWATCH_SIZE)
    const [red, green, blue] = context.getImageData(0, 0, SWATCH_SIZE, SWATCH_SIZE).data.slice(0, CHANNEL_COUNT)
    return `rgb(${red}, ${green}, ${blue})`
  }
}

const readColors = (): Colors => {
  const probe = document.createElement('span')
  document.body.append(probe)
  const read = createColorReader(probe)
  const colors = Object.fromEntries(Object.entries(TOKENS).map(([role, token]) => [role, read(token)]))
  probe.remove()
  return colors as Colors
}

const getLineRole = ({ id }: StyleLayer): Role => {
  if (WATER_LAYER_PATTERN.test(id)) return 'water'
  if (!ROAD_LAYER_PATTERN.test(id)) return 'casing'
  if (id.endsWith('-case')) return 'casing'
  return MAJOR_ROAD_PATTERN.test(id) ? 'majorRoad' : 'road'
}

const getFillRole = ({ id }: StyleLayer): Role => {
  if (WATER_LAYER_PATTERN.test(id)) return 'water'
  return PARK_LAYER_PATTERN.test(id) ? 'park' : 'building'
}

const getSymbolRole = (property: string): Role =>
  property === 'text-halo-color' || property === 'icon-halo-color' ? 'land' : 'label'

const getRole = (layer: StyleLayer, property: string): Role | null => {
  switch (layer.type) {
    case 'background':
      return 'land'
    case 'line':
      return getLineRole(layer)
    case 'fill':
    case 'fill-extrusion':
      return getFillRole(layer)
    case 'symbol':
      return getSymbolRole(property)
    default:
      return null
  }
}

/**
 * Repaints the loaded style with the style guide's map tokens, so the map follows the app's colors
 * and the current theme, in monochrome: the ground is a light neutral, the streets sit darker than
 * it, and parks, water and buildings are slight shifts of the ground. Only the style's own paint colors change, so the route lines, the
 * marker and the controls keep theirs. Call it on every `style.load`, before adding the app's
 * layers.
 */
export const applyMapTheme = (map: MapboxMap): void => {
  const colors = readColors()
  for (const layer of map.getStyle().layers) {
    if (!('paint' in layer) || !layer.paint) continue
    for (const property of Object.keys(layer.paint)) {
      if (!PAINTED_PROPERTIES.has(property)) continue
      const role = getRole(layer, property)
      if (role !== null) map.setPaintProperty(layer.id, property as PaintProperty, colors[role] as PaintValue)
    }
  }
}
