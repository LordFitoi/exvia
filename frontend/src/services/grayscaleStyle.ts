import type { Map as MapboxMap } from 'mapbox-gl'

const COLOR_PROPERTY_SUFFIX = '-color'
const NUMBER_PATTERN = /[\d.]+/g
const FULLY_OPAQUE = 1
// The luminance weights CSS `grayscale(1)` uses.
const RED_WEIGHT = 0.2126
const GREEN_WEIGHT = 0.7152
const BLUE_WEIGHT = 0.0722

type ToGray = (color: string) => string
type PaintProperty = Parameters<MapboxMap['setPaintProperty']>[1]
type PaintValue = Parameters<MapboxMap['setPaintProperty']>[2]

// Turns any CSS color into the gray of the same luminance, keeping its alpha. The browser resolves
// the color (hex, hsl, named) when it is set on a probe element.
const createToGray = (probe: HTMLElement): ToGray => (color) => {
  probe.style.color = color
  const channels = (getComputedStyle(probe).color.match(NUMBER_PATTERN) ?? []).map(Number)
  const [red, green, blue, alpha = FULLY_OPAQUE] = channels
  const level = Math.round(red * RED_WEIGHT + green * GREEN_WEIGHT + blue * BLUE_WEIGHT)
  return `rgba(${level}, ${level}, ${level}, ${alpha})`
}

// A paint value is a color, an expression, or a legacy function holding colors; the colors found
// anywhere inside it are grayed and everything else is kept.
const grayValue = (value: unknown, toGray: ToGray): unknown => {
  if (typeof value === 'string') return CSS.supports('color', value) ? toGray(value) : value
  if (Array.isArray(value)) return value.map((item) => grayValue(item, toGray))
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, grayValue(item, toGray)]))
}

/**
 * Takes the color out of the loaded style by graying its own paint colors. A CSS filter on the
 * canvas would gray the route lines too, since they are drawn in the same canvas. Call it on every
 * `style.load`, before adding the app's layers.
 */
export const grayscaleStyle = (map: MapboxMap): void => {
  const probe = document.createElement('span')
  document.body.append(probe)
  const toGray = createToGray(probe)
  for (const layer of map.getStyle().layers) {
    if (!('paint' in layer) || !layer.paint) continue
    for (const [property, value] of Object.entries(layer.paint)) {
      if (!property.endsWith(COLOR_PROPERTY_SUFFIX)) continue
      map.setPaintProperty(layer.id, property as PaintProperty, grayValue(value, toGray) as PaintValue)
    }
  }
  probe.remove()
}
