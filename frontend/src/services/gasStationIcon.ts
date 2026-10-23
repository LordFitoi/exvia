import { resolveTokenColor } from '@/services/tokenColor'

// Mapbox symbols are bitmaps, so the guide's `marker marker-poi` is drawn on a canvas with the same
// numbers as map.css (1.75rem disc, 2px ink border, surface fill) and the same `icon-fuel` glyph.
const DISC_SIZE = 28
const BORDER_WIDTH = 2
const GLYPH_SIZE = 16
export const GAS_STATION_PIXEL_RATIO = 2
const ICON_URL_PATTERN = /^url\("(.+)"\)$/
const MASK_STROKE = "stroke='black'"

/** The guide's glyph as an image whose strokes are `color`: the mask of `.icon-fuel` has no color of its own. */
const loadGlyph = async (color: string, size: number): Promise<HTMLImageElement> => {
  const probe = document.createElement('span')
  probe.className = 'icon icon-fuel'
  document.body.append(probe)
  const mask = getComputedStyle(probe).getPropertyValue('--icon').trim()
  probe.remove()
  const url = ICON_URL_PATTERN.exec(mask)?.[1]
  if (!url) throw new Error('The icon-fuel glyph is missing from the style guide CSS')
  const glyph = new Image(size, size)
  glyph.src = url.replace(MASK_STROKE, `stroke='${encodeURIComponent(color)}'`)
  await glyph.decode()
  return glyph
}

/** The gas station marker in the current theme, ready for `map.addImage`. */
export const createGasStationImage = async (): Promise<ImageData> => {
  const ink = resolveTokenColor('--color-ink')
  const scale = GAS_STATION_PIXEL_RATIO
  const size = DISC_SIZE * scale
  const glyphSize = GLYPH_SIZE * scale
  const glyph = await loadGlyph(ink, glyphSize)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A canvas could not be created to draw the gas station marker')
  context.beginPath()
  context.arc(size / 2, size / 2, size / 2 - (BORDER_WIDTH * scale) / 2, 0, 2 * Math.PI)
  context.fillStyle = resolveTokenColor('--color-surface')
  context.fill()
  context.lineWidth = BORDER_WIDTH * scale
  context.strokeStyle = ink
  context.stroke()
  context.drawImage(glyph, (size - glyphSize) / 2, (size - glyphSize) / 2, glyphSize, glyphSize)
  return context.getImageData(0, 0, size, size)
}
